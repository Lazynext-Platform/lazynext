'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar, FileCheck, Users, Gavel, Briefcase, Package,
  Search, BarChart3, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';
type MeetingType = 'regular' | 'special' | 'annual' | 'emergency';
type ResolutionStatus = 'proposed' | 'voting' | 'passed' | 'failed' | 'withdrawn';
type ResolutionType = 'ordinary' | 'special' | 'extraordinary';
type CommitteeStatus = 'active' | 'inactive' | 'dissolved';
type CommitteeType = 'audit' | 'compensation' | 'nominating' | 'governance' | 'risk' | 'ethics' | 'special';
type BoardMemberRole = 'chair' | 'director' | 'secretary' | 'observer' | 'alternate';
type BoardMemberStatus = 'active' | 'inactive' | 'resigned' | 'term_expired';
type BoardPackStatus = 'draft' | 'review' | 'distributed' | 'archived';

interface BoardMeeting {
  id: string;
  title: string;
  date: Date;
  location: string;
  type: MeetingType;
  attendees: string[];
  status: MeetingStatus;
  actionItems: string[];
  nextMeetingDate: Date | null;
  createdAt: Date;
}

interface BoardResolution {
  id: string;
  title: string;
  description: string;
  type: ResolutionType;
  proposedBy: string;
  voteDeadline: Date | null;
  status: ResolutionStatus;
  votes: Array<{ member: string; vote: string; date: Date }>;
  outcome: string;
  createdAt: Date;
}

interface BoardCommittee {
  id: string;
  name: string;
  type: CommitteeType;
  charter: string;
  members: Array<{ name: string; role: string; term: string }>;
  chair: string;
  meetingFrequency: string;
  status: CommitteeStatus;
  establishedDate: Date | null;
  createdAt: Date;
}

interface BoardMember {
  id: string;
  name: string;
  role: BoardMemberRole;
  email: string;
  expertise: string;
  committees: string[];
  termStart: Date | null;
  termEnd: Date | null;
  status: BoardMemberStatus;
  bio: string;
  createdAt: Date;
}

interface BoardPack {
  id: string;
  meetingId: string;
  title: string;
  sections: Array<{ title: string; content: string; type: string; attachments: string[] }>;
  status: BoardPackStatus;
  distributedDate: Date | null;
  distributedTo: string[];
  confidential: boolean;
  createdAt: Date;
}

interface BoardMetrics {
  meetingCount: number;
  completedMeetingCount: number;
  resolutionPassRate: number;
  totalResolutions: number;
  passedResolutions: number;
  committeeCoverage: number;
  totalCommittees: number;
  activeCommittees: number;
  boardPackCount: number;
  distributedBoardPackCount: number;
  boardPackTimeliness: number;
}

interface BoardStats {
  meetingCount: number;
  resolutionCount: number;
  committeeCount: number;
  memberCount: number;
  boardPackCount: number;
  activeMemberCount: number;
  activeCommitteeCount: number;
  byMeetingStatus: Record<string, number>;
  byResolutionStatus: Record<string, number>;
  byMemberRole: Record<string, number>;
}

interface BoardDashboardProps {
  organizationId: string;
  meetings: BoardMeeting[];
  resolutions: BoardResolution[];
  committees: BoardCommittee[];
  members: BoardMember[];
  boardPacks: BoardPack[];
  metrics: BoardMetrics;
  stats: BoardStats;
}

// ── Helpers ──

const meetingStatusVariant: Record<MeetingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'default',
  postponed: 'warning',
};

const resolutionStatusVariant: Record<ResolutionStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  proposed: 'info',
  voting: 'accent',
  passed: 'success',
  failed: 'danger',
  withdrawn: 'default',
};

const committeeStatusVariant: Record<CommitteeStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  dissolved: 'danger',
};

const memberRoleVariant: Record<BoardMemberRole, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  chair: 'accent',
  director: 'info',
  secretary: 'warning',
  observer: 'default',
  alternate: 'default',
};

const memberStatusVariant: Record<BoardMemberStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  resigned: 'danger',
  term_expired: 'warning',
};

const boardPackStatusVariant: Record<BoardPackStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  review: 'warning',
  distributed: 'success',
  archived: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'meetings' | 'resolutions' | 'committees' | 'members' | 'board_packs';

export function BoardDashboard({
  organizationId: _organizationId,
  meetings,
  resolutions,
  committees,
  members,
  boardPacks,
  metrics,
  stats,
}: BoardDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filterBySearch = useCallback(<T,>(items: T[], fields: Array<keyof T>): T[] => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      }),
    );
  }, [search]);

  const filteredMeetings = useMemo(
    () => filterBySearch(meetings, ['title', 'location', 'type', 'status']),
    [filterBySearch, meetings],
  );

  const filteredResolutions = useMemo(
    () => filterBySearch(resolutions, ['title', 'type', 'proposedBy', 'status']),
    [filterBySearch, resolutions],
  );

  const filteredCommittees = useMemo(
    () => filterBySearch(committees, ['name', 'type', 'chair', 'status']),
    [filterBySearch, committees],
  );

  const filteredMembers = useMemo(
    () => filterBySearch(members, ['name', 'role', 'email', 'expertise', 'status']),
    [filterBySearch, members],
  );

  const filteredBoardPacks = useMemo(
    () => filterBySearch(boardPacks, ['title', 'status']),
    [filterBySearch, boardPacks],
  );

  const tabs: { id: TabId; label: string; icon: typeof Calendar }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'resolutions', label: 'Resolutions', icon: FileCheck },
    { id: 'committees', label: 'Committees', icon: Users },
    { id: 'members', label: 'Members', icon: Briefcase },
    { id: 'board_packs', label: 'Board Packs', icon: Package },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Meetings</span>
          </div>
          <p className="text-2xl font-semibold">{stats.meetingCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.completedMeetingCount} completed</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Resolutions</span>
          </div>
          <p className="text-2xl font-semibold">{stats.resolutionCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.passedResolutions} passed · {metrics.resolutionPassRate}% rate</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Committees</span>
          </div>
          <p className="text-2xl font-semibold">{stats.committeeCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeCommitteeCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Members</span>
          </div>
          <p className="text-2xl font-semibold">{stats.memberCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeMemberCount} active</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Board Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Completed meetings</span>
                  <span className="font-medium">{metrics.completedMeetingCount} / {metrics.meetingCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Resolution pass rate</span>
                  <span className="font-medium">{metrics.resolutionPassRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Committee coverage</span>
                  <span className="font-medium">{metrics.committeeCoverage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Distributed board packs</span>
                  <span className="font-medium">{metrics.distributedBoardPackCount} / {metrics.boardPackCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Board pack timeliness</span>
                  <span>{metrics.boardPackTimeliness}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Gavel className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Meetings</span>
                  <span className="font-medium">{stats.meetingCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Resolutions</span>
                  <span className="font-medium">{stats.resolutionCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Committees</span>
                  <span className="font-medium">{stats.committeeCount} ({stats.activeCommitteeCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Members</span>
                  <span className="font-medium">{stats.memberCount} ({stats.activeMemberCount} active)</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Board packs</span>
                  <span>{stats.boardPackCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Upcoming Meetings</h3>
            {meetings.filter((m) => m.status === 'scheduled').length === 0 ? (
              <p className="text-sm text-fg-secondary">No upcoming meetings.</p>
            ) : (
              <div className="space-y-2">
                {meetings.filter((m) => m.status === 'scheduled').slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-fg-secondary">{m.location || 'No location'} · {m.attendees.length} attendees</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(m.date)}
                      </Badge>
                      <Badge variant={meetingStatusVariant[m.status]}>{m.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'meetings' && (
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Calendar}
                title="No board meetings"
                description="Schedule a meeting to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Attendees</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.map((meeting) => (
                    <tr key={meeting.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{meeting.title}</td>
                      <td className="p-3 capitalize">{meeting.type}</td>
                      <td className="p-3">{formatDate(meeting.date)}</td>
                      <td className="p-3">{meeting.location || '—'}</td>
                      <td className="p-3">{meeting.attendees.length}</td>
                      <td className="p-3">
                        <Badge variant={meetingStatusVariant[meeting.status]}>{meeting.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'resolutions' && (
        <div className="space-y-4">
          {filteredResolutions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileCheck}
                title="No resolutions"
                description="Board resolutions will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Proposed By</th>
                    <th className="p-3 font-medium">Votes</th>
                    <th className="p-3 font-medium">Deadline</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResolutions.map((res) => {
                    const yesVotes = res.votes.filter((v) => v.vote === 'yes').length;
                    const noVotes = res.votes.filter((v) => v.vote === 'no').length;
                    return (
                      <tr key={res.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{res.title}</td>
                        <td className="p-3 capitalize">{res.type}</td>
                        <td className="p-3">{res.proposedBy}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                            {yesVotes}
                            <XCircle className="h-3.5 w-3.5 text-danger ml-1" />
                            {noVotes}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(res.voteDeadline)}</td>
                        <td className="p-3">
                          <Badge variant={resolutionStatusVariant[res.status]}>{res.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'committees' && (
        <div className="space-y-4">
          {filteredCommittees.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Users}
                title="No committees"
                description="Create a committee to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCommittees.map((committee) => (
                <Card key={committee.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{committee.name}</h3>
                      <p className="text-xs text-fg-secondary capitalize">{committee.type} committee</p>
                    </div>
                    <Badge variant={committeeStatusVariant[committee.status]}>{committee.status}</Badge>
                  </div>
                  {committee.charter && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{committee.charter}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Chair</span>
                      <span className="font-medium">{committee.chair || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Members</span>
                      <span className="font-medium">{committee.members.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Meeting frequency</span>
                      <span className="font-medium">{committee.meetingFrequency || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Established</span>
                      <span className="font-medium">{formatDate(committee.establishedDate)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Briefcase}
                title="No board members"
                description="Add board members to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Expertise</th>
                    <th className="p-3 font-medium">Term End</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{member.name}</td>
                      <td className="p-3">
                        <Badge variant={memberRoleVariant[member.role]}>{member.role}</Badge>
                      </td>
                      <td className="p-3">{member.email || '—'}</td>
                      <td className="p-3">{member.expertise || '—'}</td>
                      <td className="p-3">{formatDate(member.termEnd)}</td>
                      <td className="p-3">
                        <Badge variant={memberStatusVariant[member.status]}>{member.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'board_packs' && (
        <div className="space-y-4">
          {filteredBoardPacks.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Package}
                title="No board packs"
                description="Create a board pack to get started."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Sections</th>
                    <th className="p-3 font-medium">Distributed</th>
                    <th className="p-3 font-medium">Recipients</th>
                    <th className="p-3 font-medium">Confidential</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBoardPacks.map((pack) => (
                    <tr key={pack.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{pack.title}</td>
                      <td className="p-3">{pack.sections.length}</td>
                      <td className="p-3">{formatDate(pack.distributedDate)}</td>
                      <td className="p-3">{pack.distributedTo.length}</td>
                      <td className="p-3">{pack.confidential ? 'Yes' : 'No'}</td>
                      <td className="p-3">
                        <Badge variant={boardPackStatusVariant[pack.status]}>{pack.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
