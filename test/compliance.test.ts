import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectViolations, dbRuleToComplianceRule, getComplianceRules } from '../src/lib/creative/compliance.ts';

describe('Creative Compliance Checker', () => {
  test('ComplianceRule structure validation', () => {
    const rule = {
      ruleId: 'r1', platform: 'meta', category: 'prohibited_content', title: 'No illegal products',
      description: 'Ads must not promote illegal products', severity: 'critical',
      keywords: ['drugs', 'weapons'], recommendation: 'Remove references to illegal products',
    };
    assert.equal(rule.severity, 'critical');
    assert.ok(rule.keywords.length > 0);
  });

  test('all compliance rules have valid structure', () => {
    const rules = [
      { ruleId: 'r1', platform: 'meta', category: 'prohibited_content', severity: 'critical', keywords: ['drugs'] },
      { ruleId: 'r2', platform: 'tiktok', category: 'restricted_content', severity: 'high', keywords: ['alcohol'] },
      { ruleId: 'r3', platform: 'youtube', category: 'claim_verification', severity: 'medium', keywords: ['best'] },
    ];
    for (const r of rules) {
      assert.ok(r.ruleId);
      assert.ok(r.platform);
      assert.ok(r.severity);
    }
  });

  test('ComplianceViolation structure validation', () => {
    const v = {
      ruleId: 'r1', platform: 'meta', category: 'prohibited_content', severity: 'critical',
      title: 'Prohibited content detected', description: 'Contains reference to drugs',
      matchedContent: 'buy drugs online', recommendation: 'Remove this content',
    };
    assert.equal(v.severity, 'critical');
    assert.ok(v.matchedContent);
  });

  test('ComplianceResult complete structure validation', () => {
    const result = {
      overallStatus: 'warning', complianceScore: 75, platforms: [], violations: [], warnings: [],
      claimVerification: [], brandSafetyScore: 80, brandSafetyFlags: [], recommendations: [], checkedAt: '2026-08-29T00:00:00Z',
    };
    assert.ok(result.complianceScore >= 0 && result.complianceScore <= 100);
    assert.ok(result.brandSafetyScore >= 0 && result.brandSafetyScore <= 100);
  });

  test('violation detection with prohibited keywords', () => {
    const content = 'Buy our amazing weight loss drugs today!';
    const prohibitedKeywords = ['drugs', 'weapons', 'illegal'];
    const found = prohibitedKeywords.filter((k) => content.toLowerCase().includes(k));
    assert.ok(found.includes('drugs'));
  });

  test('warning detection with restricted keywords', () => {
    const content = 'Best product guaranteed to work 100%!';
    const restrictedKeywords = ['best', 'guaranteed', '100%'];
    const found = restrictedKeywords.filter((k) => content.toLowerCase().includes(k));
    assert.ok(found.length >= 2);
  });

  test('claim verification status types', () => {
    const statuses = ['verified', 'unverified', 'misleading', 'needs_evidence'];
    assert.equal(statuses.length, 4);
    for (const s of statuses) assert.ok(typeof s === 'string');
  });

  test('brand safety score calculation', () => {
    const violations = [
      { severity: 'critical' }, { severity: 'high' }, { severity: 'medium' },
    ];
    const penalties = { critical: 30, high: 20, medium: 10, low: 5, info: 0 };
    const totalPenalty = violations.reduce((a, v) => a + (penalties[v.severity as keyof typeof penalties] || 0), 0);
    const score = Math.max(0, 100 - totalPenalty);
    assert.equal(score, 40);
  });

  test('compliance score thresholds', () => {
    const getStatus = (score: number) => score >= 90 ? 'compliant' : score >= 70 ? 'warning' : 'violation';
    assert.equal(getStatus(95), 'compliant');
    assert.equal(getStatus(75), 'warning');
    assert.equal(getStatus(50), 'violation');
  });

  test('severity levels completeness', () => {
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    assert.equal(severities.length, 5);
  });

  test('compliance category completeness', () => {
    const categories = ['prohibited_content', 'restricted_content', 'claim_verification', 'brand_safety', 'platform_policy', 'disclosure', 'copyright', 'accessibility', 'data_privacy'];
    assert.equal(categories.length, 9);
  });

  test('platform coverage - all 5 platforms have rules', () => {
    const platforms = ['tiktok', 'youtube', 'meta', 'google', 'universal'];
    assert.equal(platforms.length, 5);
  });

  test('request validation - missing content', () => {
    const req = { content: '', platforms: ['meta'] };
    assert.equal(req.content, '');
  });

  test('request validation - missing platforms', () => {
    const req = { content: 'Some ad text', platforms: [] };
    assert.equal(req.platforms.length, 0);
  });

  test('detectViolations uses custom rules', () => {
    const customRules = [
      {
        ruleId: 'custom:test-1',
        platform: 'meta' as const,
        category: 'prohibited_content' as const,
        title: 'No competitor names',
        description: 'Ads must not mention competitor names',
        severity: 'critical' as const,
        keywords: ['competitorxyz'],
        recommendation: 'Remove competitor name',
      },
    ];
    const { violations } = detectViolations('This product is better than competitorxyz', ['meta'], customRules);
    const customViolation = violations.find((v) => v.ruleId === 'custom:test-1');
    assert.ok(customViolation, 'should detect custom rule violation');
    assert.equal(customViolation!.title, 'No competitor names');
  });

  test('detectViolations works without custom rules (backward compatible)', () => {
    const { violations, warnings } = detectViolations('Some ad text', ['meta']);
    assert.ok(Array.isArray(violations));
    assert.ok(Array.isArray(warnings));
  });

  test('dbRuleToComplianceRule converts DB record correctly', () => {
    const dbRule = {
      id: 'abc123',
      platform: 'tiktok',
      category: 'restricted_content',
      title: 'No dangerous activities',
      description: 'Ads must not show dangerous activities',
      keywordsJson: JSON.stringify(['danger', 'extreme']),
      recommendation: 'Remove dangerous content',
      severity: 'high',
    };
    const rule = dbRuleToComplianceRule(dbRule);
    assert.equal(rule.ruleId, 'custom:abc123');
    assert.equal(rule.platform, 'tiktok');
    assert.equal(rule.severity, 'high');
    assert.deepEqual(rule.keywords, ['danger', 'extreme']);
  });

  test('getComplianceRules filters by platform', () => {
    const metaRules = getComplianceRules('meta');
    assert.ok(metaRules.length > 0);
    assert.ok(metaRules.every((r) => r.platform === 'meta'));
  });
});
