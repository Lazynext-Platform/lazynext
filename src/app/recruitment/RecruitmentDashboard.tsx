'use client';

import { useState, useTransition } from 'react';
import {
  Users, Briefcase, Calendar, FileText, Plus, Star, Check, X, MapPin,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface JobPosting {
  id: string; title: string; department: string; status: string; type: string;
  location: string; postedAt: Date | null;
}
interface Candidate {
  id: string; name: string; email: string; status: string; rating: number;
  source: string; appliedAt: Date; jobPostingId: string | null;
}
interface Interview {
  id: string; candidateId: string; type: string; status: string;
  scheduledAt: Date; duration: number; location: string;
}
interface JobOffer {
  id: string; candidateId: string; status: string; salary: number;
  currency: string; sentAt: Date | null;
}
interface Pipeline {
  [key: string]: PipelineCandidate[];
}
interface PipelineCandidate {
  id: string; name: string; rating: number; jobPostingId: string | null; appliedAt: Date;
}
interface HiringStats {
  totalJobs: number; jobsByStatus: Record<string, number>;
  totalCandidates: number; candidatesByStatus: Record<string, number>;
  totalInterviews: number; totalOffers: number; offersByStatus: Record<string, number>;
  acceptanceRate: number; avgTimeToHire: number;
}

const jobStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  published: 'success',
  paused: 'warning',
  closed: 'danger',
};
const offerStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
  withdrawn: 'danger',
};
const interviewStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'warning',
};

const PIPELINE_STAGES: Array<{ key: keyof Pipeline; label: string; variant: 'default' | 'info' | 'accent' | 'warning' | 'success' | 'danger' }> = [
  { key: 'new', label: 'New', variant: 'default' },
  { key: 'screening', label: 'Screening', variant: 'info' },
  { key: 'interview', label: 'Interview', variant: 'accent' },
  { key: 'offer', label: 'Offer', variant: 'warning' },
  { key: 'hired', label: 'Hired', variant: 'success' },
  { key: 'rejected', label: 'Rejected', variant: 'danger' },
];

export function RecruitmentDashboard({
  organizationId,
  jobs: initialJobs,
  candidates: initialCandidates,
  interviews,
  offers: initialOffers,
  pipeline,
  stats,
}: {
  organizationId: string;
  jobs: JobPosting[];
  candidates: Candidate[];
  interviews: Interview[];
  offers: JobOffer[];
  pipeline: Pipeline;
  stats: HiringStats;
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [actingId, setActingId] = useState<string | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [, startTransition] = useTransition();
  void organizationId;

  async function refreshOffers() {
    const res = await fetch('/api/recruitment/offers');
    const data = await res.json();
    startTransition(() => setOffers(data.offers || []));
  }

  async function handleOfferAction(id: string, action: 'send' | 'accept' | 'reject' | 'withdraw') {
    setActingId(id);
    try {
      await fetch(`/api/recruitment/offers/${id}/${action}`, { method: 'POST' });
      await refreshOffers();
    } finally {
      setActingId(null);
    }
  }

  async function handleCreateJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = form.get('title') as string;
    if (!title) return;
    await fetch('/api/recruitment/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        department: form.get('department') || '',
        description: form.get('description') || '',
        location: form.get('location') || '',
        type: form.get('type') || 'full_time',
      }),
    });
    setShowJobForm(false);
    (e.target as HTMLFormElement).reset();
    window.location.reload();
  }

  async function handleCreateCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const email = form.get('email') as string;
    if (!name || !email) return;
    await fetch('/api/recruitment/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        phone: form.get('phone') || '',
        source: form.get('source') || 'direct',
        jobPostingId: form.get('jobPostingId') || undefined,
      }),
    });
    setShowCandidateForm(false);
    (e.target as HTMLFormElement).reset();
    window.location.reload();
  }

  async function handlePublishJob(id: string) {
    await fetch(`/api/recruitment/jobs/${id}/publish`, { method: 'POST' });
    window.location.reload();
  }

  async function handleCloseJob(id: string) {
    await fetch(`/api/recruitment/jobs/${id}/close`, { method: 'POST' });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Hiring Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Briefcase className="h-3 w-3" /> Job Postings
          </div>
          <div className="text-2xl font-semibold">{stats.totalJobs}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Users className="h-3 w-3" /> Candidates
          </div>
          <div className="text-2xl font-semibold">{stats.totalCandidates}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Calendar className="h-3 w-3" /> Acceptance Rate
          </div>
          <div className="text-2xl font-semibold">{(stats.acceptanceRate * 100).toFixed(0)}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <FileText className="h-3 w-3" /> Avg Time to Hire
          </div>
          <div className="text-2xl font-semibold">{stats.avgTimeToHire}d</div>
        </Card>
      </div>

      {/* Job Postings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent-primary" /> Job Postings
          </h2>
          <Button size="sm" onClick={() => setShowJobForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New Job
          </Button>
        </div>
        {showJobForm && (
          <Card className="p-4 mb-3">
            <form onSubmit={handleCreateJob} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs text-fg-secondary">
                Title
                <input type="text" name="title" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Department
                <input type="text" name="department" className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Location
                <input type="text" name="location" className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Type
                <select name="type" className="input mt-1 w-full">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="remote">Remote</option>
                </select>
              </label>
              <label className="text-xs text-fg-secondary sm:col-span-2">
                Description
                <input type="text" name="description" className="input mt-1 w-full" />
              </label>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" size="sm">Create</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowJobForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
        {initialJobs.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Briefcase} title="No job postings yet" description="Create a job posting to start receiving applications." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {initialJobs.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{job.title}</span>
                  <Badge variant={jobStatusVariant[job.status] || 'default'} className="text-xs shrink-0">{job.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-fg-secondary">
                  {job.department && <span>{job.department}</span>}
                  {job.location && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {job.location}</span>
                  )}
                  <span>{job.type}</span>
                </div>
                <div className="flex gap-2">
                  {job.status === 'draft' && (
                    <Button size="sm" variant="ghost" onClick={() => handlePublishJob(job.id)}>Publish</Button>
                  )}
                  {job.status === 'published' && (
                    <Button size="sm" variant="ghost" onClick={() => handleCloseJob(job.id)}>Close</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-primary" /> Candidate Pipeline
          </h2>
          <Button size="sm" onClick={() => setShowCandidateForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New Candidate
          </Button>
        </div>
        {showCandidateForm && (
          <Card className="p-4 mb-3">
            <form onSubmit={handleCreateCandidate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs text-fg-secondary">
                Name
                <input type="text" name="name" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Email
                <input type="email" name="email" required className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Phone
                <input type="text" name="phone" className="input mt-1 w-full" />
              </label>
              <label className="text-xs text-fg-secondary">
                Source
                <select name="source" className="input mt-1 w-full">
                  <option value="direct">Direct</option>
                  <option value="referral">Referral</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="job_board">Job Board</option>
                  <option value="agency">Agency</option>
                </select>
              </label>
              <label className="text-xs text-fg-secondary">
                Job Posting
                <select name="jobPostingId" className="input mt-1 w-full">
                  <option value="">None</option>
                  {initialJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </label>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" size="sm">Add Candidate</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCandidateForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={stage.variant} className="text-xs">{stage.label}</Badge>
                <span className="text-xs text-fg-muted">{pipeline[stage.key]?.length || 0}</span>
              </div>
              <div className="space-y-2">
                {(pipeline[stage.key] || []).map((c) => (
                  <Card key={c.id} className="p-3">
                    <div className="text-xs font-medium truncate">{c.name}</div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {c.rating > 0 ? (
                        Array.from({ length: c.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-warning fill-current" />
                        ))
                      ) : (
                        <span className="text-xs text-fg-muted">No rating</span>
                      )}
                    </div>
                  </Card>
                ))}
                {(pipeline[stage.key] || []).length === 0 && (
                  <div className="text-xs text-fg-muted text-center py-4">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview Schedule */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-primary" /> Interviews
        </h2>
        {interviews.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Calendar} title="No interviews scheduled" description="Schedule interviews to track your hiring process." />
          </Card>
        ) : (
          <div className="space-y-2">
            {interviews.map((iv) => (
              <Card key={iv.id} className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="h-4 w-4 text-fg-muted shrink-0" />
                    <span className="text-sm font-medium">
                      {new Date(iv.scheduledAt).toLocaleString()}
                    </span>
                    <Badge variant="default" className="text-xs">{iv.type}</Badge>
                    <Badge variant={interviewStatusVariant[iv.status] || 'default'} className="text-xs">{iv.status}</Badge>
                  </div>
                  <span className="text-xs text-fg-secondary shrink-0">{iv.duration}min · {iv.location || '—'}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Offers Panel */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-primary" /> Job Offers
        </h2>
        {offers.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={FileText} title="No offers yet" description="Create job offers for your candidates." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <Card key={offer.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold">{offer.currency} {offer.salary.toFixed(0)}</span>
                  <Badge variant={offerStatusVariant[offer.status] || 'default'} className="text-xs">{offer.status}</Badge>
                </div>
                <div className="text-xs text-fg-secondary mb-2">Candidate: {offer.candidateId}</div>
                {offer.sentAt && (
                  <div className="text-xs text-fg-muted mb-2">Sent: {new Date(offer.sentAt).toLocaleDateString()}</div>
                )}
                <div className="flex gap-2">
                  {offer.status === 'draft' && (
                    <Button size="sm" variant="ghost" disabled={actingId === offer.id} onClick={() => handleOfferAction(offer.id, 'send')}>Send</Button>
                  )}
                  {offer.status === 'sent' && (
                    <>
                      <Button size="sm" variant="ghost" disabled={actingId === offer.id} onClick={() => handleOfferAction(offer.id, 'accept')}>
                        <Check className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" disabled={actingId === offer.id} onClick={() => handleOfferAction(offer.id, 'reject')}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" disabled={actingId === offer.id} onClick={() => handleOfferAction(offer.id, 'withdraw')}>Withdraw</Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
