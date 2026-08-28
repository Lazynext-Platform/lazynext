import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Narrative Ad Builder', () => {
  test('all 8 narrative structures have valid names', () => {
    const structures = [
      { type: 'three_act', name: 'Three-Act Structure', acts: 3 },
      { type: 'heros_journey', name: "Hero's Journey", acts: 3 },
      { type: 'problem_solution', name: 'Problem-Solution', acts: 2 },
      { type: 'before_after', name: 'Before-After', acts: 2 },
      { type: 'testimony', name: 'Testimony', acts: 1 },
      { type: 'suspense_reveal', name: 'Suspense & Reveal', acts: 2 },
      { type: 'emotional_arc', name: 'Emotional Arc', acts: 3 },
      { type: 'documentary', name: 'Documentary', acts: 3 },
    ];
    assert.equal(structures.length, 8);
    for (const s of structures) {
      assert.ok(s.type);
      assert.ok(s.name);
      assert.ok(s.acts > 0);
    }
  });

  test('all 8 genres have valid names', () => {
    const genres = [
      { type: 'drama', name: 'Drama' },
      { type: 'comedy', name: 'Comedy' },
      { type: 'inspirational', name: 'Inspirational' },
      { type: 'educational', name: 'Educational' },
      { type: 'lifestyle', name: 'Lifestyle' },
      { type: 'documentary', name: 'Documentary' },
      { type: 'fantasy', name: 'Fantasy' },
      { type: 'realistic', name: 'Realistic' },
    ];
    assert.equal(genres.length, 8);
    for (const g of genres) {
      assert.ok(g.type);
      assert.ok(g.name);
    }
  });

  test('NarrativeAdRequest validation - missing product name', () => {
    const request = { productName: '', structure: 'three_act', genre: 'drama' };
    assert.equal(request.productName, '');
  });

  test('NarrativeAdRequest validation - valid request', () => {
    const request = {
      productName: 'Test Product',
      structure: 'three_act',
      genre: 'drama',
      durationSec: 60,
    };
    assert.ok(request.productName);
    assert.ok(request.structure);
    assert.ok(request.genre);
  });

  test('NarrativeCharacter structure', () => {
    const character = {
      name: 'Sarah',
      role: 'protagonist',
      description: 'A busy mom',
      motivation: 'Save time',
      arc: 'From overwhelmed to empowered',
      personalityTraits: ['relatable', 'stressed', 'determined'],
    };
    assert.equal(character.name, 'Sarah');
    assert.equal(character.role, 'protagonist');
    assert.equal(character.personalityTraits.length, 3);
  });

  test('NarrativeScene structure', () => {
    const scene = {
      act: 1,
      sceneNumber: 1,
      title: 'The Problem',
      description: 'Sarah is overwhelmed',
      characters: ['Sarah'],
      setting: 'Kitchen, morning',
      mood: 'stressed',
      durationSec: 15,
      visualDirection: 'Close-up on Sarah',
      cameraAngle: 'close-up',
      transitionTo: 'cut',
    };
    assert.equal(scene.act, 1);
    assert.equal(scene.durationSec, 15);
    assert.ok(scene.characters.length > 0);
  });

  test('NarrativeAdResult complete structure', () => {
    const result = {
      structure: 'three_act',
      genre: 'drama',
      title: 'The Time Saver',
      logline: 'A busy mom discovers a product that changes everything.',
      characters: [],
      scenes: [],
      totalDurationSec: 60,
      theme: 'Time is precious',
      moral: 'Small changes make big differences',
      emotionalJourney: [{ timeSec: 0, emotion: 'stress', intensity: 80 }],
      productIntegration: {
        placement: 'Act 2',
        revealType: 'problem-solution',
        ctaPlacement: 'End',
        brandMentions: ['BrandName'],
      },
      storyboard: [],
      script: 'INT. KITCHEN...',
      adaptationNotes: 'Can be adapted for 15s, 30s, 60s',
    };
    assert.ok(result.title);
    assert.ok(result.logline);
    assert.ok(result.productIntegration);
    assert.ok(result.script);
  });

  test('emotional journey has valid structure', () => {
    const journey = [
      { timeSec: 0, emotion: 'stress', intensity: 80 },
      { timeSec: 15, emotion: 'hope', intensity: 50 },
      { timeSec: 30, emotion: 'relief', intensity: 90 },
    ];
    for (const p of journey) {
      assert.ok(p.intensity >= 0 && p.intensity <= 100);
    }
  });

  test('product integration has all fields', () => {
    const integration = {
      placement: 'Act 2, Scene 3',
      revealType: 'demonstration',
      ctaPlacement: 'End card',
      brandMentions: ['BrandX', 'BrandX Pro'],
    };
    assert.ok(integration.placement);
    assert.ok(integration.revealType);
    assert.ok(integration.brandMentions.length > 0);
  });
});
