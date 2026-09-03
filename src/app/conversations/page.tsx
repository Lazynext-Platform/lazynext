'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, Button, Input, EmptyState } from '@/components/ui';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface Message {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const wsData = await res.json();
        const wsId = wsData.workspaces?.[0]?.id;
        if (wsId) {
          const convRes = await fetch(`/api/conversations?workspaceId=${wsId}`);
          if (convRes.ok) {
            const data = await convRes.json();
            setConversations(data.conversations || []);
          }
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setConversation(data.conversation);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // Poll for new messages every 5 seconds when a conversation is open
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => loadMessages(selectedId), 5000);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function createConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      const wsId = wsData.workspaces?.[0]?.id;
      if (!wsId) throw new Error('No workspace');

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const data = await res.json();
      setNewTitle('');
      loadConversations();
      setSelectedId(data.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !newMessage.trim()) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error('Failed to send');
      loadMessages(selectedId);
    } catch {
      setNewMessage(text); // Restore on failure
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="heading-display text-2xl">Conversations</h1>
        <p className="text-sm text-fg-secondary mt-1">Workspace discussions and messaging</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[600px]">
        {/* Sidebar: conversation list */}
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
            <form onSubmit={createConversation} className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New conversation..."
                className="text-sm"
              />
              <Button type="submit" size="sm" disabled={creating || !newTitle.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-fg-muted">No conversations yet</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left px-4 py-3 border-b-2 last:border-0 hover:bg-hover transition-colors"
                  style={{
                    borderColor: 'var(--c-ink)',
                    backgroundColor: selectedId === c.id ? 'var(--c-active)' : undefined,
                  }}
                >
                  <p className="text-sm font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {c._count?.messages || 0} messages · {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Main: messages */}
        <Card className="p-0 overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation from the sidebar or create a new one."
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--c-ink)' }}>
                {conversation && (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    <h2 className="heading-display text-sm truncate">{conversation.title}</h2>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.userId === 'me'; // Can't compare without session ID on client
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[80%] ${isOwn ? 'ml-auto items-end' : 'items-start'}`}
                      >
                        <div
                          className="px-3 py-2 border-2 text-sm"
                          style={{
                            borderColor: 'var(--c-ink)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--c-surface-alt)',
                          }}
                        >
                          {m.body}
                        </div>
                        <p className="text-xs text-fg-muted mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="px-4 py-3 border-t-2 flex gap-2" style={{ borderColor: 'var(--c-ink)' }}>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>

      {error && <p className="text-sm text-danger mt-4">{error}</p>}
    </div>
  );
}
