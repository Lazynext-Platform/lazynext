import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_VOICE_COST,
  getVoiceTones,
  getVoiceAttributes,
  getMessagingPillars,
  getVisualStyleRules,
  getConsistencyIssues,
  validateBrandVoiceRequest,
  calculateOverallConsistency,
  type VoiceTone,
  type VoiceAttribute,
  type MessagingPillar,
  type ConsistencyIssue,
  type IssueSeverity,
  type VisualStyleRule,
} from '../src/lib/creative/brand-voice.ts';

describe('brand-voice', () => {
  describe('type completeness', () => {
    test('VoiceTone has 10 tones', () => {
      const tones: VoiceTone[] = ['professional', 'casual', 'friendly', 'authoritative', 'playful', 'inspirational', 'urgent', 'empathetic', 'luxurious', 'technical'];
      assert.equal(tones.length, 10);
    });

    test('VoiceAttribute has 14 attributes', () => {
      const attrs: VoiceAttribute[] = ['formal', 'informal', 'serious', 'humorous', 'respectful', 'irreverent', 'warm', 'cool', 'direct', 'subtle', 'active', 'passive', 'simple', 'sophisticated'];
      assert.equal(attrs.length, 14);
    });

    test('MessagingPillar has 10 pillars', () => {
      const pillars: MessagingPillar[] = ['value_proposition', 'social_proof', 'authority', 'scarcity', 'urgency', 'community', 'innovation', 'trust', 'quality', 'sustainability'];
      assert.equal(pillars.length, 10);
    });

    test('ConsistencyIssue has 7 issues', () => {
      const issues: ConsistencyIssue[] = ['tone_mismatch', 'vocabulary_mismatch', 'messaging_off_pillar', 'style_violation', 'format_violation', 'voice_inconsistency', 'audience_mismatch'];
      assert.equal(issues.length, 7);
    });

    test('IssueSeverity has 4 severities', () => {
      const severities: IssueSeverity[] = ['critical', 'major', 'minor', 'suggestion'];
      assert.equal(severities.length, 4);
    });

    test('VisualStyleRule has 8 rules', () => {
      const rules: VisualStyleRule[] = ['color_palette', 'typography', 'imagery_style', 'layout', 'logo_usage', 'spacing', 'photography_style', 'graphic_elements'];
      assert.equal(rules.length, 8);
    });

    test('getVoiceTones returns 10 tones', () => {
      assert.equal(getVoiceTones().length, 10);
    });

    test('getVoiceAttributes returns 14 attributes', () => {
      assert.equal(getVoiceAttributes().length, 14);
    });

    test('getMessagingPillars returns 10 pillars', () => {
      assert.equal(getMessagingPillars().length, 10);
    });

    test('getVisualStyleRules returns 8 rules', () => {
      assert.equal(getVisualStyleRules().length, 8);
    });

    test('getConsistencyIssues returns 7 issues', () => {
      assert.equal(getConsistencyIssues().length, 7);
    });
  });

  describe('validateBrandVoiceRequest', () => {
    test('missing brandName fails', () => {
      const r = validateBrandVoiceRequest({ brandDescription: 'test' });
      assert.ok(!r.valid);
    });

    test('valid request passes', () => {
      const r = validateBrandVoiceRequest({ brandName: 'Test Brand' });
      assert.ok(r.valid);
    });
  });

  describe('calculateOverallConsistency', () => {
    test('empty checks returns 100', () => {
      assert.equal(calculateOverallConsistency([]), 100);
    });

    test('returns average of check scores', () => {
      const checks = [
        { overallScore: 80 } as any,
        { overallScore: 60 } as any,
      ];
      assert.equal(calculateOverallConsistency(checks), 70);
    });
  });

  describe('BRAND_VOICE_COST', () => {
    test('cost is 6', () => {
      assert.equal(BRAND_VOICE_COST, 6);
    });
  });
});
