'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface ClientWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceCtx {
  workspaces: ClientWorkspace[];
  current: ClientWorkspace | null;
  loading: boolean;
  switchWorkspace: (id: string) => void;
  refresh: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [workspaces, setWorkspaces] = useState<ClientWorkspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (status !== 'authenticated') {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    try {
      let res = await fetch('/api/workspaces');
      // Retry on 500 with backoff (Cloudflare Worker cold-start resilience)
      const delays = [500, 1000, 2000];
      for (let i = 0; !res.ok && res.status === 500 && i < delays.length; i++) {
        await new Promise((r) => setTimeout(r, delays[i]));
        res = await fetch('/api/workspaces');
      }
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
        // Read current workspace from cookie or default to first
        const cookieMatch = document.cookie.match(/lazynext-ws=([^;]+)/);
        const cookieId = cookieMatch?.[1];
        const current = cookieId && data.workspaces.find((w: ClientWorkspace) => w.id === cookieId);
        setCurrentId(current?.id || data.workspaces[0]?.id || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback((id: string) => {
    // Set cookie
    document.cookie = `lazynext-ws=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setCurrentId(id);
    // Reload to re-fetch workspace-scoped data
    window.location.reload();
  }, []);

  const refresh = useCallback(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const current = workspaces.find((w) => w.id === currentId) || null;

  return (
    <Ctx.Provider value={{ workspaces, current, loading, switchWorkspace, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return c;
}
