import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for transcript-driven editing and editing skill archive.
 *
 * These modules use @/ aliases which the test loader resolves, so they
 * can be imported directly.
 */

import {
  generateRoughCut,
  exportCutPlanAsJSON,
  exportCutPlanAsEDL,
} from '../src/lib/editor/transcript-cut.ts';
import type { ASRResult } from '../src/lib/providers/types.ts';

import {
  BUILTIN_SKILLS,
  getSkill,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  recommendSkills,
} from '../src/lib/editor/skills.ts';

// ── Test data ──

const mockTranscript: ASRResult = {
  text: 'Hey guys so um today I want to show you this amazing product. It has like really cool features. The first thing you know is the design. Uh the second thing is the battery life. And the third thing is the price. So check it out.',
  duration: 30,
  segments: [
    { start: 0, end: 2, text: 'Hey guys so um today I want to show you this amazing product.' },
    { start: 2.5, end: 5, text: 'It has like really cool features.' },
    { start: 5.5, end: 8, text: 'The first thing you know is the design.' },
    { start: 8.5, end: 11, text: 'Uh the second thing is the battery life.' },
    { start: 11.5, end: 14, text: 'And the third thing is the price.' },
    { start: 14.5, end: 16, text: 'So check it out.' },
  ],
};

describe('Transcript-Driven Editing — generateRoughCut', () => {
  it('generates a rough cut plan from a transcript', () => {
    const plan = generateRoughCut(mockTranscript);
    assert.ok(plan.cuts.length > 0);
    assert.ok(plan.totalDurationSec > 0);
    assert.ok(plan.sourceDurationSec > 0);
  });

  it('filters out segments shorter than minSegmentSec', () => {
    const plan = generateRoughCut(mockTranscript, { minSegmentSec: 3 });
    // Only segments >= 3s should be included
    for (const cut of plan.cuts) {
      assert.ok(cut.durationSec >= 3, `cut ${cut.label} is ${cut.durationSec}s`);
    }
  });

  it('respects targetDurationSec', () => {
    const plan = generateRoughCut(mockTranscript, { targetDurationSec: 5 });
    assert.ok(plan.totalDurationSec <= 10, `total ${plan.totalDurationSec}s should be near 5s target`);
  });

  it('calculates compression ratio', () => {
    const plan = generateRoughCut(mockTranscript);
    assert.ok(plan.compressionRatio > 0);
    // Compression ratio = source / cut, should be >= 1 (cut is shorter)
    assert.ok(plan.compressionRatio >= 1);
  });

  it('generates transitions between cuts', () => {
    const plan = generateRoughCut(mockTranscript);
    if (plan.cuts.length > 1) {
      assert.ok(plan.transitions.length > 0);
      for (const t of plan.transitions) {
        assert.ok(t.fromIndex >= 0);
        assert.ok(t.toIndex > t.fromIndex);
        assert.ok(['cut', 'fade', 'dissolve'].includes(t.type));
      }
    }
  });

  it('includes notes about cut decisions', () => {
    const plan = generateRoughCut(mockTranscript, { minSegmentSec: 3 });
    assert.ok(plan.notes.length > 0);
  });

  it('handles empty transcript gracefully', () => {
    const plan = generateRoughCut({ text: '', segments: [] });
    assert.equal(plan.cuts.length, 0);
    assert.equal(plan.totalDurationSec, 0);
  });

  it('removes filler words when removeFillers is true', () => {
    const plan = generateRoughCut(mockTranscript, { removeFillers: true });
    for (const cut of plan.cuts) {
      assert.ok(!/\b(uh|um)\b/i.test(cut.text), `filler words in: ${cut.text}`);
    }
  });

  it('keeps filler words when removeFillers is false', () => {
    const plan = generateRoughCut(mockTranscript, { removeFillers: false });
    // At least one segment should contain filler words
    const hasFiller = plan.cuts.some(c => /\b(uh|um)\b/i.test(c.text));
    assert.ok(hasFiller, 'should keep filler words when removeFillers=false');
  });
});

describe('Transcript-Driven Editing — export', () => {
  it('exports as JSON', () => {
    const plan = generateRoughCut(mockTranscript);
    const json = exportCutPlanAsJSON(plan);
    const parsed = JSON.parse(json);
    assert.ok(parsed.cuts);
    assert.ok(parsed.sourceSegments);
  });

  it('exports as EDL', () => {
    const plan = generateRoughCut(mockTranscript);
    const edl = exportCutPlanAsEDL(plan, 'TEST_VIDEO');
    assert.ok(edl.includes('TITLE:'));
    assert.ok(edl.includes('FROM CLIP NAME: TEST_VIDEO'));
    // EDL should have timecodes
    assert.ok(/\d{2}:\d{2}:\d{2}:\d{2}/.test(edl));
  });
});

describe('Editing Skill Archive — builtins', () => {
  it('has built-in skills', () => {
    assert.ok(BUILTIN_SKILLS.length >= 4);
  });

  it('each builtin skill has required fields', () => {
    for (const skill of BUILTIN_SKILLS) {
      assert.ok(skill.id);
      assert.ok(skill.name);
      assert.ok(skill.description);
      assert.ok(skill.contentTypes.length > 0);
      assert.ok(skill.platforms.length > 0);
      assert.ok(skill.steps.length > 0);
      assert.ok(skill.estimatedTimeMin > 0);
      assert.equal(skill.source, 'builtin');
    }
  });

  it('builtin skill steps are ordered', () => {
    for (const skill of BUILTIN_SKILLS) {
      for (let i = 0; i < skill.steps.length; i++) {
        assert.equal(skill.steps[i].order, i + 1);
      }
    }
  });

  it('getSkill returns a skill by ID', () => {
    const skill = getSkill('fast-paced-hook-cut');
    assert.ok(skill);
    assert.equal(skill!.name, 'Fast-Paced Hook Cut');
  });

  it('getSkill returns undefined for unknown ID', () => {
    assert.equal(getSkill('nonexistent'), undefined);
  });

  it('listSkills returns all skills by default', () => {
    const skills = listSkills();
    assert.ok(skills.length >= BUILTIN_SKILLS.length);
  });

  it('listSkills filters by contentType', () => {
    const skills = listSkills({ contentType: 'talking-head' });
    assert.ok(skills.length > 0);
    for (const s of skills) {
      assert.ok(s.contentTypes.includes('talking-head'));
    }
  });

  it('listSkills filters by platform', () => {
    const skills = listSkills({ platform: 'tiktok' });
    assert.ok(skills.length > 0);
    for (const s of skills) {
      assert.ok(s.platforms.includes('tiktok'));
    }
  });

  it('listSkills filters by tag', () => {
    const skills = listSkills({ tag: 'captions' });
    assert.ok(skills.length > 0);
    for (const s of skills) {
      assert.ok(s.tags.includes('captions'));
    }
  });
});

describe('Editing Skill Archive — user skills', () => {
  it('creates a user skill', () => {
    const skill = createSkill({
      name: 'My Custom Cut',
      description: 'A custom editing pattern',
      contentTypes: ['ugc'],
      platforms: ['tiktok'],
      steps: [
        { order: 1, action: 'cut', trigger: 'at start', params: {}, description: 'Cut at start' },
      ],
      estimatedTimeMin: 5,
      tags: ['custom'],
    });
    assert.ok(skill.id);
    assert.equal(skill.source, 'user');
    assert.equal(skill.name, 'My Custom Cut');
  });

  it('updates a user skill', () => {
    const skill = createSkill({
      name: 'Test Skill',
      description: 'Before update',
      contentTypes: ['ugc'],
      platforms: ['tiktok'],
      steps: [],
      estimatedTimeMin: 3,
      tags: ['test'],
    });
    const updated = updateSkill(skill.id, { description: 'After update' });
    assert.ok(updated);
    assert.equal(updated!.description, 'After update');
  });

  it('cannot update a builtin skill', () => {
    const result = updateSkill('fast-paced-hook-cut', { name: 'Hacked' });
    assert.equal(result, undefined);
  });

  it('deletes a user skill', () => {
    const skill = createSkill({
      name: 'Delete Me',
      description: 'To be deleted',
      contentTypes: ['ugc'],
      platforms: ['tiktok'],
      steps: [],
      estimatedTimeMin: 1,
      tags: ['temp'],
    });
    assert.ok(deleteSkill(skill.id));
    assert.equal(getSkill(skill.id), undefined);
  });

  it('cannot delete a builtin skill', () => {
    assert.equal(deleteSkill('fast-paced-hook-cut'), false);
    assert.ok(getSkill('fast-paced-hook-cut'));
  });
});

describe('Editing Skill Archive — recommendSkills', () => {
  it('recommends skills for talking-head content', () => {
    const skills = recommendSkills('talking-head', 'tiktok');
    assert.ok(skills.length > 0);
    for (const s of skills) {
      assert.ok(s.contentTypes.includes('talking-head'));
      assert.ok(s.platforms.includes('tiktok'));
    }
  });

  it('recommends skills for product-demo content', () => {
    const skills = recommendSkills('product-demo');
    assert.ok(skills.length > 0);
  });

  it('recommends skills for drama content', () => {
    const skills = recommendSkills('drama', 'youtube');
    assert.ok(skills.length > 0);
  });
});
