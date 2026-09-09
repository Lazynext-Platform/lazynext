import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ChurnPrediction {
  customerId: string;
  customerName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  factors: string[];
  recommendations: string[];
}

export interface ChurnStats {
  totalCustomers: number;
  atRisk: number;
  byRiskLevel: { low: number; medium: number; high: number };
  avgRiskScore: number;
}

export interface ChurnFactorSummary {
  factor: string;
  count: number;
}

// ── Helpers ──

function daysSince(date: Date | null | undefined): number {
  if (!date) return Infinity;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Churn Prediction Service ──

export const ChurnPredictionService = {
  /**
   * Predict churn risk for a single customer.
   * Factors: last activity date, support ticket frequency, CSAT trend, NPS score, usage decline.
   */
  async predict(customerId: string): Promise<ChurnPrediction | null> {
    const customer = await safePrisma(() =>
      prisma.customer.findUnique({
        where: { id: customerId },
      }),
      null,
    );
    if (!customer) return null;

    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Factor 1: Last activity date (lastContactedAt)
    const daysSinceContact = daysSince(customer.lastContactedAt);
    if (daysSinceContact > 90) {
      riskScore += 30;
      factors.push('No contact in over 90 days');
      recommendations.push('Reach out to re-engage the customer with a personalized check-in');
    } else if (daysSinceContact > 60) {
      riskScore += 20;
      factors.push('No contact in over 60 days');
      recommendations.push('Schedule a follow-up call or email');
    } else if (daysSinceContact > 30) {
      riskScore += 10;
      factors.push('No contact in over 30 days');
      recommendations.push('Send a product update or newsletter');
    }

    // Factor 2: Support ticket frequency
    const tickets = await safePrisma(() =>
      prisma.ticket.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      [],
    );

    const openTickets = tickets.filter((t) =>
      ['open', 'in_progress', 'waiting_on_customer', 'escalated'].includes(t.status),
    );
    if (openTickets.length >= 5) {
      riskScore += 25;
      factors.push(`${openTickets.length} open support tickets`);
      recommendations.push('Prioritize resolving open support tickets and escalate critical issues');
    } else if (openTickets.length >= 3) {
      riskScore += 15;
      factors.push(`${openTickets.length} open support tickets`);
      recommendations.push('Review and resolve open support tickets promptly');
    } else if (openTickets.length >= 1) {
      riskScore += 5;
      factors.push(`${openTickets.length} open support ticket(s)`);
    }

    // Recent ticket spike (more than 3 tickets in last 30 days)
    const recentTickets = tickets.filter((t) =>
      daysSince(t.createdAt) < 30,
    );
    if (recentTickets.length > 3) {
      riskScore += 15;
      factors.push(`${recentTickets.length} tickets in the last 30 days (spike)`);
      recommendations.push('Investigate root cause of recent support spike');
    }

    // Factor 3: CSAT trend (check for low CSAT responses in Memory)
    const csatResponses = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'csat_response',
          owner: customerId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      [],
    );

    if (csatResponses.length > 0) {
      const recentCsat = csatResponses.slice(0, 5);
      const avgCsat = recentCsat.reduce((sum, r) => {
        try {
          const data = JSON.parse(r.content);
          return sum + (data.score || 0);
        } catch {
          return sum;
        }
      }, 0) / recentCsat.length;

      if (avgCsat <= 2) {
        riskScore += 20;
        factors.push(`Low CSAT score (${avgCsat.toFixed(1)}/5)`);
        recommendations.push('Address customer satisfaction concerns immediately');
      } else if (avgCsat <= 3) {
        riskScore += 10;
        factors.push(`Below-average CSAT score (${avgCsat.toFixed(1)}/5)`);
        recommendations.push('Follow up on recent support interactions');
      }
    }

    // Factor 4: NPS score (check for detractor responses)
    const npsResponses = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'nps_response',
          owner: customerId,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      [],
    );

    if (npsResponses.length > 0) {
      const latestNps = npsResponses[0];
      try {
        const data = JSON.parse(latestNps.content);
        const npsScore = data.score || 0;
        if (npsScore <= 6) {
          riskScore += 20;
          factors.push(`Detractor NPS score (${npsScore}/10)`);
          recommendations.push('Conduct a deep-dive interview to understand pain points');
        } else if (npsScore <= 7) {
          riskScore += 10;
          factors.push(`Passive NPS score (${npsScore}/10)`);
          recommendations.push('Engage customer to understand what would make them a promoter');
        }
      } catch {
        // ignore parse errors
      }
    }

    // Factor 5: Customer status/type
    if (customer.status === 'lost') {
      riskScore += 40;
      factors.push('Customer status is "lost"');
      recommendations.push('Implement a win-back campaign');
    } else if (customer.status === 'negotiation') {
      riskScore += 5;
      factors.push('Customer in negotiation stage');
    }

    // Factor 6: Customer type
    if (customer.type === 'churned') {
      riskScore += 50;
      factors.push('Customer type is "churned"');
      recommendations.push('Implement a win-back campaign with special offers');
    }

    riskScore = clampScore(riskScore);

    let riskLevel: RiskLevel;
    if (riskScore >= 60) {
      riskLevel = 'high';
    } else if (riskScore >= 30) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue regular engagement and monitoring');
    }

    return {
      customerId: customer.id,
      customerName: customer.name,
      riskLevel,
      riskScore,
      factors,
      recommendations,
    };
  },

  /**
   * Predict churn risk for all customers in an organization.
   */
  async predictAll(organizationId: string): Promise<ChurnPrediction[]> {
    const customers = await safePrisma(() =>
      prisma.customer.findMany({
        where: { organizationId },
        take: 500,
      }),
      [],
    );

    const predictions: ChurnPrediction[] = [];
    for (const customer of customers) {
      const prediction = await this.predict(customer.id);
      if (prediction) predictions.push(prediction);
    }
    return predictions;
  },

  /**
   * Get customers above a risk threshold.
   */
  async getAtRiskCustomers(organizationId: string, threshold: number = 30): Promise<ChurnPrediction[]> {
    const predictions = await this.predictAll(organizationId);
    return predictions
      .filter((p) => p.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  },

  /**
   * Get common churn factors across customers.
   */
  async getChurnFactors(organizationId: string): Promise<ChurnFactorSummary[]> {
    const predictions = await this.predictAll(organizationId);
    const factorCounts: Record<string, number> = {};

    for (const p of predictions) {
      for (const factor of p.factors) {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      }
    }

    return Object.entries(factorCounts)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Get churn stats for an organization.
   */
  async getStats(organizationId: string): Promise<ChurnStats> {
    const predictions = await this.predictAll(organizationId);
    const total = predictions.length;

    const byRiskLevel = { low: 0, medium: 0, high: 0 };
    let totalScore = 0;

    for (const p of predictions) {
      byRiskLevel[p.riskLevel]++;
      totalScore += p.riskScore;
    }

    const atRisk = byRiskLevel.medium + byRiskLevel.high;
    const avgRiskScore = total > 0
      ? Math.round(totalScore / total)
      : 0;

    return {
      totalCustomers: total,
      atRisk,
      byRiskLevel,
      avgRiskScore,
    };
  },
};
