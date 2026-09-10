'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unlink } from 'lucide-react';
import { Button } from '@/components/ui';

export function DisconnectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_disconnect');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={loading}>
        <Unlink className="h-4 w-4" /> {loading ? 'Disconnecting…' : 'Disconnect'}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
