'use client';

import { useState } from 'react';
import {
  Star, ThumbsUp, MessageSquare, TrendingDown, TrendingUp, Award,
  Check, X, Send, Plus, AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

interface NpsStats {
  totalSurveys: number;
  totalResponses: number;
  avgNps: number;
  responseRate: number;
}
interface CsatStats {
  totalSurveys: number;
  totalResponses: number;
  avgCsat: number;
}
interface FeedbackStats {
  total: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  avgRating: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
}
interface TestimonialStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avgRating: number;
}
interface ChurnStats {
  totalCustomers: number;
  atRisk: number;
  byRiskLevel: { low: number; medium: number; high: number };
  avgRiskScore: number;
}

interface NpsSurvey {
  id: string;
  name: string;
  question: string;
  status?: string;
}
interface CsatSurvey {
  id: string;
  name: string;
  question: string;
  scale?: string;
}
interface FeedbackEntry {
  id: string;
  source: string;
  content: string;
  rating?: number;
  category?: string;
  sentiment?: string;
  sentimentScore?: number;
  response?: string;
  createdAt: Date;
}
interface Testimonial {
  id: string;
  customerName: string;
  customerCompany?: string;
  customerTitle?: string;
  content: string;
  rating?: number;
  approved: boolean;
  rejectedReason?: string;
  createdAt: Date;
}
interface AtRiskCustomer {
  customerId: string;
  customerName: string;
  riskLevel: string;
  riskScore: number;
  factors: string[];
  recommendations: string[];
}

// ── Component ──

export function FeedbackDashboard({
  organizationId,
  npsStats,
  csatStats,
  feedbackStats,
  testimonialStats,
  churnStats,
  npsSurveys,
  csatSurveys,
  feedback,
  testimonials,
  atRiskCustomers,
}: {
  organizationId: string;
  npsStats: NpsStats;
  csatStats: CsatStats;
  feedbackStats: FeedbackStats;
  testimonialStats: TestimonialStats;
  churnStats: ChurnStats;
  npsSurveys: NpsSurvey[];
  csatSurveys: CsatSurvey[];
  feedback: FeedbackEntry[];
  testimonials: Testimonial[];
  atRiskCustomers: AtRiskCustomer[];
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'nps' | 'csat' | 'feedback' | 'churn' | 'testimonials'>('overview');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [requestForm, setRequestForm] = useState({ customerName: '', customerEmail: '', productName: '' });
  const [emailTemplate, setEmailTemplate] = useState<{ subject: string; body: string } | null>(null);

  async function handleRespond(feedbackId: string) {
    if (!responseText.trim()) return;
    await fetch(`/api/feedback/entries/${feedbackId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText }),
    });
    setRespondingTo(null);
    setResponseText('');
    window.location.reload();
  }

  async function handleApprove(id: string) {
    await fetch(`/api/feedback/testimonials/${id}/approve`, { method: 'POST' });
    window.location.reload();
  }

  async function handleReject(id: string) {
    await fetch(`/api/feedback/testimonials/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Does not meet guidelines' }),
    });
    window.location.reload();
  }

  async function handleRequestTestimonial() {
    const res = await fetch('/api/feedback/testimonials/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestForm),
    });
    const data = await res.json();
    if (data.emailTemplate) setEmailTemplate(data.emailTemplate);
  }

  const sentimentVariant: Record<string, 'success' | 'danger' | 'default'> = {
    positive: 'success', negative: 'danger', neutral: 'default',
  };
  const riskVariant: Record<string, 'success' | 'warning' | 'danger'> = {
    low: 'success', medium: 'warning', high: 'danger',
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'nps' as const, label: 'NPS' },
    { id: 'csat' as const, label: 'CSAT' },
    { id: 'feedback' as const, label: 'Feedback' },
    { id: 'churn' as const, label: 'Churn Risk' },
    { id: 'testimonials' as const, label: 'Testimonials' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'secondary'}
            onClick={() => setActiveTab(tab.id)}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent-primary" />
                <div className="text-xs text-fg-secondary">Avg NPS</div>
              </div>
              <div className="text-2xl font-bold">{npsStats.avgNps}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="h-4 w-4 text-accent-primary" />
                <div className="text-xs text-fg-secondary">Avg CSAT</div>
              </div>
              <div className="text-2xl font-bold">{csatStats.avgCsat}%</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-accent-primary" />
                <div className="text-xs text-fg-secondary">Feedback</div>
              </div>
              <div className="text-2xl font-bold">{feedbackStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-accent-primary" />
                <div className="text-xs text-fg-secondary">At Risk</div>
              </div>
              <div className="text-2xl font-bold">{churnStats.atRisk}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-accent-primary" />
                <div className="text-xs text-fg-secondary">Testimonials</div>
              </div>
              <div className="text-2xl font-bold">{testimonialStats.approved}</div>
            </Card>
          </div>

          {/* Sentiment Breakdown */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Sentiment Breakdown</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{feedbackStats.sentimentBreakdown.positive}</div>
                <div className="text-xs text-fg-secondary">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-fg-secondary">{feedbackStats.sentimentBreakdown.neutral}</div>
                <div className="text-xs text-fg-secondary">Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-danger">{feedbackStats.sentimentBreakdown.negative}</div>
                <div className="text-xs text-fg-secondary">Negative</div>
              </div>
            </div>
          </Card>

          {/* Recent Feedback */}
          <div>
            <h3 className="text-sm font-medium mb-3">Recent Feedback</h3>
            <div className="space-y-2">
              {feedback.slice(0, 5).map((f) => (
                <Card key={f.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{f.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs">{f.source}</Badge>
                        {f.sentiment && (
                          <Badge variant={sentimentVariant[f.sentiment] || 'default'} className="text-xs">{f.sentiment}</Badge>
                        )}
                        {f.category && <span className="text-xs text-fg-secondary">{f.category}</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {feedback.length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No feedback yet.</div></Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NPS Tab */}
      {activeTab === 'nps' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Surveys</div>
              <div className="text-2xl font-bold">{npsStats.totalSurveys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Responses</div>
              <div className="text-2xl font-bold">{npsStats.totalResponses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg NPS</div>
              <div className="text-2xl font-bold">{npsStats.avgNps}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Response Rate</div>
              <div className="text-2xl font-bold">{npsStats.responseRate}</div>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">NPS Surveys</h3>
              <Button variant="primary" size="sm"><Plus className="h-4 w-4" /> New Survey</Button>
            </div>
            <div className="space-y-2">
              {npsSurveys.map((s) => (
                <Card key={s.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{s.name}</span>
                      <p className="text-xs text-fg-secondary mt-1">{s.question}</p>
                    </div>
                    <Badge variant={s.status === 'active' ? 'success' : 'default'} className="text-xs">{s.status}</Badge>
                  </div>
                </Card>
              ))}
              {npsSurveys.length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No NPS surveys yet.</div></Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSAT Tab */}
      {activeTab === 'csat' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Surveys</div>
              <div className="text-2xl font-bold">{csatStats.totalSurveys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Responses</div>
              <div className="text-2xl font-bold">{csatStats.totalResponses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg CSAT</div>
              <div className="text-2xl font-bold">{csatStats.avgCsat}%</div>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">CSAT Surveys</h3>
              <Button variant="primary" size="sm"><Plus className="h-4 w-4" /> New Survey</Button>
            </div>
            <div className="space-y-2">
              {csatSurveys.map((s) => (
                <Card key={s.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{s.name}</span>
                      <p className="text-xs text-fg-secondary mt-1">{s.question}</p>
                    </div>
                    <Badge variant="default" className="text-xs">{s.scale}</Badge>
                  </div>
                </Card>
              ))}
              {csatSurveys.length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No CSAT surveys yet.</div></Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">All Feedback ({feedback.length})</h3>
          </div>
          <div className="space-y-2">
            {feedback.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{f.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="default" className="text-xs">{f.source}</Badge>
                      {f.category && <Badge variant="info" className="text-xs">{f.category}</Badge>}
                      {f.sentiment && (
                        <Badge variant={sentimentVariant[f.sentiment] || 'default'} className="text-xs">{f.sentiment}</Badge>
                      )}
                      {f.rating !== undefined && f.rating !== null && (
                        <span className="text-xs text-fg-secondary flex items-center gap-1">
                          <Star className="h-3 w-3" /> {f.rating}
                        </span>
                      )}
                    </div>
                    {f.response && (
                      <div className="mt-2 p-2 bg-fg-muted/10 rounded text-xs">
                        <span className="font-medium">Response: </span>{f.response}
                      </div>
                    )}
                  </div>
                </div>
                {!f.response && (
                  <div className="mt-2">
                    {respondingTo === f.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full text-sm p-2 border rounded bg-transparent"
                          rows={2}
                          placeholder="Type your response..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" onClick={() => handleRespond(f.id)}>
                            <Send className="h-3 w-3" /> Send
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseText(''); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setRespondingTo(f.id)}>
                        <MessageSquare className="h-3 w-3" /> Respond
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
            {feedback.length === 0 && (
              <Card className="p-6"><div className="text-sm text-fg-secondary">No feedback collected yet.</div></Card>
            )}
          </div>
        </div>
      )}

      {/* Churn Tab */}
      {activeTab === 'churn' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Customers</div>
              <div className="text-2xl font-bold">{churnStats.totalCustomers}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">At Risk</div>
              <div className="text-2xl font-bold text-danger">{churnStats.atRisk}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">High Risk</div>
              <div className="text-2xl font-bold text-danger">{churnStats.byRiskLevel.high}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg Risk Score</div>
              <div className="text-2xl font-bold">{churnStats.avgRiskScore}</div>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">At-Risk Customers</h3>
            <div className="space-y-2">
              {atRiskCustomers.map((c) => (
                <Card key={c.customerId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{c.customerName}</span>
                        <Badge variant={riskVariant[c.riskLevel] || 'default'} className="text-xs">{c.riskLevel}</Badge>
                        <span className="text-xs text-fg-secondary">Score: {c.riskScore}/100</span>
                      </div>
                      {c.factors.length > 0 && (
                        <div className="flex items-start gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-warning mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-fg-secondary">
                            {c.factors.join(', ')}
                          </div>
                        </div>
                      )}
                      {c.recommendations.length > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Recommendations: </span>
                          {c.recommendations.join(' • ')}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {atRiskCustomers.length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No at-risk customers detected.</div></Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Tab */}
      {activeTab === 'testimonials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total</div>
              <div className="text-2xl font-bold">{testimonialStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Approved</div>
              <div className="text-2xl font-bold text-success">{testimonialStats.approved}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Pending</div>
              <div className="text-2xl font-bold text-warning">{testimonialStats.pending}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Avg Rating</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Star className="h-4 w-4" /> {testimonialStats.avgRating}
              </div>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div>
            <h3 className="text-sm font-medium mb-3">Pending Approval</h3>
            <div className="space-y-2">
              {testimonials.filter((t) => !t.approved && !t.rejectedReason).map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{t.customerName}</span>
                        {t.customerCompany && <span className="text-xs text-fg-secondary">{t.customerCompany}</span>}
                        {t.rating !== undefined && t.rating !== null && (
                          <span className="text-xs flex items-center gap-1">
                            <Star className="h-3 w-3" /> {t.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{t.content}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="primary" size="sm" onClick={() => handleApprove(t.id)}>
                        <Check className="h-3 w-3" /> Approve
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleReject(t.id)}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {testimonials.filter((t) => !t.approved && !t.rejectedReason).length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No pending testimonials.</div></Card>
              )}
            </div>
          </div>

          {/* Approved Testimonials */}
          <div>
            <h3 className="text-sm font-medium mb-3">Approved Testimonials</h3>
            <div className="space-y-2">
              {testimonials.filter((t) => t.approved).map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{t.customerName}</span>
                    {t.customerCompany && <span className="text-xs text-fg-secondary">{t.customerCompany}</span>}
                    {t.customerTitle && <span className="text-xs text-fg-secondary">{t.customerTitle}</span>}
                    {t.rating !== undefined && t.rating !== null && (
                      <span className="text-xs flex items-center gap-1">
                        <Star className="h-3 w-3" /> {t.rating}
                      </span>
                    )}
                    <Badge variant="success" className="text-xs">Approved</Badge>
                  </div>
                  <p className="text-sm">{t.content}</p>
                </Card>
              ))}
              {testimonials.filter((t) => t.approved).length === 0 && (
                <Card className="p-6"><div className="text-sm text-fg-secondary">No approved testimonials yet.</div></Card>
              )}
            </div>
          </div>

          {/* Request Testimonial Form */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Request a Testimonial</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="text-sm p-2 border rounded bg-transparent"
                  placeholder="Customer name"
                  value={requestForm.customerName}
                  onChange={(e) => setRequestForm({ ...requestForm, customerName: e.target.value })}
                />
                <input
                  className="text-sm p-2 border rounded bg-transparent"
                  placeholder="Customer email"
                  value={requestForm.customerEmail}
                  onChange={(e) => setRequestForm({ ...requestForm, customerEmail: e.target.value })}
                />
              </div>
              <input
                className="text-sm p-2 border rounded bg-transparent w-full"
                placeholder="Product name (optional)"
                value={requestForm.productName}
                onChange={(e) => setRequestForm({ ...requestForm, productName: e.target.value })}
              />
              <Button variant="primary" size="sm" onClick={handleRequestTestimonial}>
                <Send className="h-3 w-3" /> Generate Email
              </Button>
              {emailTemplate && (
                <div className="mt-2 p-3 bg-fg-muted/10 rounded">
                  <div className="text-xs font-medium mb-1">Subject: {emailTemplate.subject}</div>
                  <pre className="text-xs whitespace-pre-wrap font-sans">{emailTemplate.body}</pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
