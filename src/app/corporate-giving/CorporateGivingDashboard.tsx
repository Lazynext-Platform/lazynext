'use client';

import { useState, useMemo } from 'react';
import {
  Heart, Gift, Award, Users, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  GivingDonation, GivingSponsorship, GivingGrant, VolunteerProgram,
  CorporateGivingMetrics, CorporateGivingStats,
} from '@/lib/services/corporate-giving-service';

type TabId = 'overview' | 'donations' | 'sponsorships' | 'grants' | 'programs';

interface CorporateGivingDashboardProps {
  organizationId: string;
  donations: GivingDonation[];
  sponsorships: GivingSponsorship[];
  grants: GivingGrant[];
  programs: VolunteerProgram[];
  metrics: CorporateGivingMetrics;
  stats: CorporateGivingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'approved', 'active', 'disbursed'].includes(status)) return 'success';
  if (['proposed', 'planned', 'submitted', 'under_review', 'paused'].includes(status)) return 'warning';
  if (['rejected', 'cancelled', 'expired'].includes(status)) return 'danger';
  return 'info';
};

export function CorporateGivingDashboard({
  donations, sponsorships, grants, programs, metrics, stats,
}: CorporateGivingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredDonations = useMemo(() => {
    if (!search) return donations;
    const q = search.toLowerCase();
    return donations.filter(
      (d) => d.recipient.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [donations, search]);

  const filteredSponsorships = useMemo(() => {
    if (!search) return sponsorships;
    const q = search.toLowerCase();
    return sponsorships.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [sponsorships, search]);

  const filteredGrants = useMemo(() => {
    if (!search) return grants;
    const q = search.toLowerCase();
    return grants.filter(
      (g) => g.title.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [grants, search]);

  const filteredPrograms = useMemo(() => {
    if (!search) return programs;
    const q = search.toLowerCase();
    return programs.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.status.toLowerCase().includes(q),
    );
  }, [programs, search]);

  const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'donations', label: 'Donations', icon: Heart },
    { id: 'sponsorships', label: 'Sponsorships', icon: Gift },
    { id: 'grants', label: 'Grants', icon: Award },
    { id: 'programs', label: 'Programs', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Donations</div>
              <div className="mt-1 text-2xl font-bold">${metrics.totalDonations.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Sponsorships</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSponsorships}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Grants</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeGrants}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Programs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activePrograms}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Volunteer Hours</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalVolunteerHours}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Donation Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDonationType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Sponsorship Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySponsorshipStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Grant Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGrantStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Program Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byProgramType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'donations' && (
        <div className="space-y-3">
          {filteredDonations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Heart} title="No donations" description="Corporate donations will appear here." /></Card>
          ) : (
            filteredDonations.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.recipient}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.category || 'General'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.amount > 0 && <Badge variant="default">${d.amount.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'sponsorships' && (
        <div className="space-y-3">
          {filteredSponsorships.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Gift} title="No sponsorships" description="Sponsorships will appear here." /></Card>
          ) : (
            filteredSponsorships.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.recipient || 'No recipient'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.amount > 0 && <Badge variant="default">${s.amount.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'grants' && (
        <div className="space-y-3">
          {filteredGrants.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Award} title="No grants" description="Grants will appear here." /></Card>
          ) : (
            filteredGrants.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-fg-secondary">{g.type.replace('_', ' ')} · {g.recipient || 'No recipient'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.amount > 0 && <Badge variant="default">${g.amount.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'programs' && (
        <div className="space-y-3">
          {filteredPrograms.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No programs" description="Volunteer programs will appear here." /></Card>
          ) : (
            filteredPrograms.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-fg-secondary">{p.type.replace('_', ' ')} · {p.coordinator || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.participants > 0 && <Badge variant="default">{p.participants} participants</Badge>}
                    {p.hours > 0 && <Badge variant="default">{p.hours}h</Badge>}
                    <Badge variant={statusVariant(p.status)}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
