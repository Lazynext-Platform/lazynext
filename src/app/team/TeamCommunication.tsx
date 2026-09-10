'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Hash, MessageCircle, Send, Pin, Search, Users, Paperclip,
  Lock, Trash2, Flag, BellOff, Check, X, Plus, Reply, Smile,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

interface Channel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  pinnedMessages: string[];
  topic: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface Message {
  id: string;
  channelId: string;
  organizationId: string;
  workspaceId: string;
  body: string;
  userId: string;
  attachments: Attachment[];
  replyTo: string | null;
  mentions: string[];
  edited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface ModerationFlag {
  id: string;
  organizationId: string;
  messageId: string;
  flaggedBy: string;
  reason: string;
  status: 'pending' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  resolvedBy: string | null;
  resolvedAt: Date | null;
  action: 'approved' | 'removed' | 'warning' | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChannelStats {
  totalChannels: number;
  byType: Record<string, number>;
  totalMembers: number;
  activeChannels: number;
}

interface MessageStats {
  totalMessages: number;
  byChannel: Record<string, number>;
  attachmentsCount: number;
  avgPerChannel: number;
}

interface ModerationStats {
  totalFlags: number;
  resolvedFlags: number;
  pendingFlags: number;
  deletedMessages: number;
  mutedUsers: number;
}

interface TeamCommunicationProps {
  organizationId: string;
  currentUserId: string;
  initialChannels: Channel[];
  initialRecentMessages: Message[];
  channelStats: ChannelStats;
  messageStats: MessageStats;
  moderationStats: ModerationStats;
  initialFlags: ModerationFlag[];
}

const severityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
};

const typeIcon: Record<string, typeof Hash> = {
  public: Hash,
  private: Lock,
  direct: MessageCircle,
};

export function TeamCommunication({
  organizationId: _organizationId,
  currentUserId,
  initialChannels,
  initialRecentMessages,
  channelStats,
  messageStats,
  moderationStats,
  initialFlags,
}: TeamCommunicationProps) {
  const [channels] = useState<Channel[]>(initialChannels);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannels[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>(initialRecentMessages);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [flags, setFlags] = useState<ModerationFlag[]>(initialFlags);
  const [reactions, setReactions] = useState<Record<string, ReactionGroup[]>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'pinned' | 'members' | 'moderation' | 'stats'>('messages');

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;

  // Load channel-specific data when selection changes
  const loadChannelData = useCallback(async (channelId: string) => {
    setLoading(true);
    try {
      const [msgRes, pinnedRes] = await Promise.all([
        fetch(`/api/team/messages?channelId=${channelId}&limit=50`),
        fetch(`/api/team/channels/${channelId}/pinned`),
      ]);
      const msgData = await msgRes.json().catch(() => ({ messages: [] }));
      const pinnedData = await pinnedRes.json().catch(() => ({ pinnedMessages: [] }));
      setMessages(msgData.messages ?? []);
      setPinnedMessageIds(pinnedData.pinnedMessages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      loadChannelData(selectedChannelId);
      const ch = channels.find((c) => c.id === selectedChannelId);
      setMembers(ch?.members ?? []);
    }
  }, [selectedChannelId, channels, loadChannelData]);

  // Load reactions for visible messages
  useEffect(() => {
    if (messages.length === 0) return;
    Promise.all(
      messages.map((m) =>
        fetch(`/api/team/messages/${m.id}/reactions`).then((r) => r.json()).catch(() => ({})),
      ),
    ).then((results) => {
      const map: Record<string, ReactionGroup[]> = {};
      results.forEach((r, i) => {
        if (r && messages[i]) {
          map[messages[i].id] = [];
        }
      });
      setReactions(map);
    });
  }, [messages]);

  async function handleSendMessage() {
    if (!messageInput.trim() || !selectedChannelId) return;
    const body = messageInput.trim();
    setMessageInput('');
    const targetReply = replyTo;
    setReplyTo(null);

    try {
      const res = await fetch('/api/team/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          body,
          replyTo: targetReply?.id,
          mentions: body.match(/@[\w-]+/g)?.map((m) => m.slice(1)) ?? [],
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      setMessageInput(body);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(`/api/team/messages/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.messages ?? []);
    } catch {
      setSearchResults([]);
    }
  }

  async function handlePinMessage(messageId: string) {
    if (!selectedChannelId) return;
    try {
      await fetch(`/api/team/channels/${selectedChannelId}/pinned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      setPinnedMessageIds((prev) => [...prev, messageId]);
    } catch { /* ignore */ }
  }

  async function handleUnpinMessage(messageId: string) {
    if (!selectedChannelId) return;
    try {
      await fetch(`/api/team/channels/${selectedChannelId}/pinned?messageId=${messageId}`, {
        method: 'DELETE',
      });
      setPinnedMessageIds((prev) => prev.filter((id) => id !== messageId));
    } catch { /* ignore */ }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await fetch(`/api/team/messages/${messageId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch { /* ignore */ }
  }

  async function handleFlagMessage(messageId: string) {
    const reason = prompt('Reason for flagging this message?');
    if (!reason) return;
    try {
      await fetch('/api/team/moderation/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason, severity: 'medium' }),
      });
      alert('Message flagged for moderation.');
    } catch { /* ignore */ }
  }

  async function handleResolveFlag(flagId: string, action: 'approved' | 'removed' | 'warning') {
    try {
      await fetch(`/api/team/moderation/flags/${flagId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    } catch { /* ignore */ }
  }

  async function handleMuteUser(userId: string) {
    const reason = prompt('Reason for muting this user?');
    if (!reason) return;
    try {
      await fetch('/api/team/moderation/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, duration: 60 }),
      });
      alert('User muted.');
    } catch { /* ignore */ }
  }

  async function handleUnmuteUser(userId: string) {
    try {
      await fetch(`/api/team/moderation/mute?userId=${userId}`, { method: 'DELETE' });
      alert('User unmuted.');
    } catch { /* ignore */ }
  }

  async function handleAddReaction(messageId: string, emoji: string) {
    try {
      await fetch(`/api/team/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch { /* ignore */ }
  }

  const publicChannels = channels.filter((c) => c.type === 'public');
  const privateChannels = channels.filter((c) => c.type === 'private');
  const dmChannels = channels.filter((c) => c.type === 'direct');

  const displayMessages = searchResults ?? messages;
  const pinnedMessages = messages.filter((m) => pinnedMessageIds.includes(m.id));

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Channels</div>
          <div className="text-xl font-bold">{channelStats.totalChannels}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Active</div>
          <div className="text-xl font-bold">{channelStats.activeChannels}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Messages</div>
          <div className="text-xl font-bold">{messageStats.totalMessages}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Attachments</div>
          <div className="text-xl font-bold">{messageStats.attachmentsCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Pending Flags</div>
          <div className="text-xl font-bold">{moderationStats.pendingFlags}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Muted Users</div>
          <div className="text-xl font-bold">{moderationStats.mutedUsers}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-4">
        {/* Channel Sidebar */}
        <Card className="p-3 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Channels</h2>
          </div>

          {publicChannels.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-fg-muted uppercase mb-1">Public</div>
              <div className="space-y-1">
                {publicChannels.map((ch) => (
                  <ChannelListItem
                    key={ch.id}
                    channel={ch}
                    selected={ch.id === selectedChannelId}
                    onClick={() => setSelectedChannelId(ch.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {privateChannels.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-fg-muted uppercase mb-1">Private</div>
              <div className="space-y-1">
                {privateChannels.map((ch) => (
                  <ChannelListItem
                    key={ch.id}
                    channel={ch}
                    selected={ch.id === selectedChannelId}
                    onClick={() => setSelectedChannelId(ch.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {dmChannels.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-fg-muted uppercase mb-1">Direct Messages</div>
              <div className="space-y-1">
                {dmChannels.map((ch) => (
                  <ChannelListItem
                    key={ch.id}
                    channel={ch}
                    selected={ch.id === selectedChannelId}
                    onClick={() => setSelectedChannelId(ch.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {channels.length === 0 && (
            <div className="text-sm text-fg-secondary py-4 text-center">No channels yet.</div>
          )}
        </Card>

        {/* Main Content */}
        <Card className="flex flex-col max-h-[70vh]">
          {/* Header with search */}
          <div className="border-b p-3 space-y-2">
            {selectedChannel && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = typeIcon[selectedChannel.type] ?? Hash;
                    return <Icon className="h-4 w-4 text-accent-primary" />;
                  })()}
                  <span className="font-medium text-sm">{selectedChannel.name}</span>
                  {selectedChannel.topic && (
                    <span className="text-xs text-fg-secondary">— {selectedChannel.topic}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab('pinned')}>
                    <Pin className="h-3 w-3" /> {pinnedMessageIds.length}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab('members')}>
                    <Users className="h-3 w-3" /> {members.length}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search messages..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg bg-transparent"
                />
              </div>
              <Button variant="secondary" size="sm" className="text-xs" onClick={handleSearch}>
                <Search className="h-3 w-3" /> Search
              </Button>
              {searchResults && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearchResults(null); setSearchQuery(''); }}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {/* Tab bar */}
            <div className="flex gap-1">
              {([
                ['messages', 'Messages'],
                ['pinned', 'Pinned'],
                ['members', 'Members'],
                ['moderation', 'Moderation'],
                ['stats', 'Stats'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-2 py-1 text-xs rounded ${activeTab === key ? 'bg-accent-primary text-white' : 'text-fg-secondary hover:bg-fg-muted/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading && <div className="text-sm text-fg-secondary text-center py-4">Loading...</div>}

            {!loading && activeTab === 'messages' && (
              <div className="space-y-3">
                {searchResults && (
                  <div className="text-xs text-fg-secondary mb-2">
                    {searchResults.length} result(s) for &quot;{searchQuery}&quot;
                  </div>
                )}
                {displayMessages.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  displayMessages
                    .filter((m) => !selectedChannelId || searchResults || m.channelId === selectedChannelId)
                    .map((msg) => (
                      <MessageItem
                        key={msg.id}
                        message={msg}
                        currentUserId={currentUserId}
                        reactions={reactions[msg.id] ?? []}
                        isPinned={pinnedMessageIds.includes(msg.id)}
                        onPin={() => handlePinMessage(msg.id)}
                        onUnpin={() => handleUnpinMessage(msg.id)}
                        onDelete={() => handleDeleteMessage(msg.id)}
                        onFlag={() => handleFlagMessage(msg.id)}
                        onReply={() => setReplyTo(msg)}
                        onReact={(emoji) => handleAddReaction(msg.id, emoji)}
                      />
                    ))
                )}
              </div>
            )}

            {!loading && activeTab === 'pinned' && (
              <div className="space-y-3">
                {pinnedMessages.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-8">No pinned messages.</div>
                ) : (
                  pinnedMessages.map((msg) => (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      currentUserId={currentUserId}
                      reactions={reactions[msg.id] ?? []}
                      isPinned
                      onUnpin={() => handleUnpinMessage(msg.id)}
                      onReply={() => setReplyTo(msg)}
                    />
                  ))
                )}
              </div>
            )}

            {!loading && activeTab === 'members' && (
              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-8">No members in this channel.</div>
                ) : (
                  members.map((userId) => (
                    <div key={userId} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-xs font-bold">
                          {userId.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-mono">{userId}</span>
                        {userId === currentUserId && <Badge variant="info" className="text-xs">You</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMuteUser(userId)}>
                        <BellOff className="h-3 w-3" /> Mute
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {!loading && activeTab === 'moderation' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-accent-primary" />
                  <h3 className="text-sm font-medium">Flagged Messages</h3>
                  <Badge variant="warning" className="text-xs">{flags.length}</Badge>
                </div>
                {flags.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-8">No pending flags.</div>
                ) : (
                  flags.map((flag) => (
                    <div key={flag.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={severityVariant[flag.severity] || 'default'} className="text-xs">
                          {flag.severity}
                        </Badge>
                        <span className="text-xs text-fg-secondary">{flag.reason}</span>
                      </div>
                      <div className="text-xs text-fg-muted">Message: {flag.messageId}</div>
                      <div className="text-xs text-fg-secondary">Flagged by: {flag.flaggedBy}</div>
                      <div className="flex gap-1">
                        <Button variant="secondary" size="sm" className="text-xs" onClick={() => handleResolveFlag(flag.id, 'approved')}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button variant="danger" size="sm" className="text-xs" onClick={() => handleResolveFlag(flag.id, 'removed')}>
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleResolveFlag(flag.id, 'warning')}>
                          <Flag className="h-3 w-3" /> Warning
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {!loading && activeTab === 'stats' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Channel Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Total Channels" value={channelStats.totalChannels} />
                    <StatBox label="Active Channels" value={channelStats.activeChannels} />
                    <StatBox label="Total Members" value={channelStats.totalMembers} />
                    <StatBox label="Public" value={channelStats.byType.public ?? 0} />
                    <StatBox label="Private" value={channelStats.byType.private ?? 0} />
                    <StatBox label="Direct" value={channelStats.byType.direct ?? 0} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Message Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Total Messages" value={messageStats.totalMessages} />
                    <StatBox label="Attachments" value={messageStats.attachmentsCount} />
                    <StatBox label="Avg / Channel" value={messageStats.avgPerChannel} />
                    <StatBox label="Channels w/ Msgs" value={Object.keys(messageStats.byChannel).length} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Moderation Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox label="Total Flags" value={moderationStats.totalFlags} />
                    <StatBox label="Resolved" value={moderationStats.resolvedFlags} />
                    <StatBox label="Pending" value={moderationStats.pendingFlags} />
                    <StatBox label="Deleted" value={moderationStats.deletedMessages} />
                    <StatBox label="Muted Users" value={moderationStats.mutedUsers} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          {activeTab === 'messages' && selectedChannelId && !searchResults && (
            <div className="border-t p-3">
              {replyTo && (
                <div className="flex items-center justify-between mb-2 text-xs text-fg-secondary">
                  <span>Replying to: {replyTo.body.slice(0, 50)}...</span>
                  <button onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMessageInput((p) => p + ' 📎 ')}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message... (@ to mention)"
                  className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-transparent"
                />
                <Button variant="primary" size="sm" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Right Panel — Recent / Integrations */}
        <Card className="p-3 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Recent Activity</h2>
          </div>
          <div className="space-y-2">
            {initialRecentMessages.slice(0, 15).map((msg) => (
              <div key={msg.id} className="text-xs border rounded-lg p-2">
                <div className="font-mono text-fg-muted mb-1">{msg.userId.slice(0, 8)}</div>
                <div className="truncate">{msg.body}</div>
                {msg.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-fg-secondary">
                    <Paperclip className="h-3 w-3" /> {msg.attachments.length}
                  </div>
                )}
              </div>
            ))}
            {initialRecentMessages.length === 0 && (
              <div className="text-sm text-fg-secondary text-center py-4">No recent activity.</div>
            )}
          </div>

          {/* Integrations hint */}
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-accent-primary" />
              <h3 className="text-xs font-medium">Integrations</h3>
            </div>
            <div className="space-y-1 text-xs text-fg-secondary">
              <div>Webhooks — receive team events</div>
              <div>API — manage channels & messages</div>
              <div>Slack — mirror messages</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ──

function ChannelListItem({
  channel,
  selected,
  onClick,
}: {
  channel: Channel;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = typeIcon[channel.type] ?? Hash;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
        selected ? 'bg-accent-primary/10 text-accent-primary' : 'hover:bg-fg-muted/10'
      }`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{channel.name}</span>
      {channel.pinnedMessages.length > 0 && (
        <Pin className="h-3 w-3 text-fg-muted ml-auto" />
      )}
    </button>
  );
}

function MessageItem({
  message,
  currentUserId,
  reactions,
  isPinned,
  onPin,
  onUnpin,
  onDelete,
  onFlag,
  onReply,
  onReact,
}: {
  message: Message;
  currentUserId: string;
  reactions: ReactionGroup[];
  isPinned: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onDelete?: () => void;
  onFlag?: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}) {
  const quickEmojis = ['👍', '❤️', '🎉', '😂'];

  return (
    <div className={`p-3 border rounded-lg ${isPinned ? 'border-accent-primary/30 bg-accent-primary/5' : ''}`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-xs font-bold">
            {message.userId.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-mono text-fg-secondary">{message.userId.slice(0, 12)}</span>
          {message.userId === currentUserId && <Badge variant="info" className="text-xs">You</Badge>}
          {message.edited && <span className="text-xs text-fg-muted">(edited)</span>}
          {isPinned && <Pin className="h-3 w-3 text-accent-primary" />}
        </div>
        <div className="flex gap-1">
          {onPin && !isPinned && (
            <button onClick={onPin} className="text-fg-muted hover:text-accent-primary" title="Pin">
              <Pin className="h-3 w-3" />
            </button>
          )}
          {onUnpin && isPinned && (
            <button onClick={onUnpin} className="text-fg-muted hover:text-accent-primary" title="Unpin">
              <Pin className="h-3 w-3 fill-current" />
            </button>
          )}
          {onReply && (
            <button onClick={onReply} className="text-fg-muted hover:text-accent-primary" title="Reply">
              <Reply className="h-3 w-3" />
            </button>
          )}
          {onFlag && (
            <button onClick={onFlag} className="text-fg-muted hover:text-warning" title="Flag">
              <Flag className="h-3 w-3" />
            </button>
          )}
          {onDelete && message.userId === currentUserId && (
            <button onClick={onDelete} className="text-fg-muted hover:text-danger" title="Delete">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="text-sm mb-2 whitespace-pre-wrap break-words">{message.body}</div>

      {message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {message.attachments.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1 hover:bg-fg-muted/10"
            >
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{a.name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-1 flex-wrap">
        {reactions.map((r) => (
          <span key={r.emoji} className="flex items-center gap-1 text-xs border rounded-full px-2 py-0.5">
            <span>{r.emoji}</span>
            <span className="text-fg-muted">{r.count}</span>
          </span>
        ))}
        {onReact && (
          <div className="flex gap-0.5">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="text-xs hover:bg-fg-muted/10 rounded px-1"
                title={`React with ${emoji}`}
              >
                <Smile className="h-3 w-3 inline" /> {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-xs text-fg-secondary">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
