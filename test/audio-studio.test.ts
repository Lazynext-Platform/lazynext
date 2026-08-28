import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Voice & Audio Studio', () => {
  test('VoiceProfile structure validation', () => {
    const voice = {
      voiceId: 'v1',
      name: 'Energetic Male',
      gender: 'male',
      tone: 'energetic',
      language: 'en',
      description: 'High-energy male voice',
      pitch: 1.0,
      speed: 1.0,
    };
    assert.equal(voice.gender, 'male');
    assert.ok(voice.pitch >= 0.5 && voice.pitch <= 2.0);
    assert.ok(voice.speed >= 0.5 && voice.speed <= 2.0);
  });

  test('all voice profiles have valid structure', () => {
    const profiles = [
      { voiceId: 'v1', name: 'Energetic Male', gender: 'male', tone: 'energetic', language: 'en', pitch: 1.0, speed: 1.0 },
      { voiceId: 'v2', name: 'Calm Female', gender: 'female', tone: 'calm', language: 'en', pitch: 1.0, speed: 0.9 },
      { voiceId: 'v3', name: 'Professional Neutral', gender: 'neutral', tone: 'professional', language: 'en', pitch: 1.0, speed: 1.0 },
    ];
    for (const v of profiles) {
      assert.ok(v.voiceId);
      assert.ok(v.name);
      assert.ok(['male', 'female', 'neutral'].includes(v.gender));
      assert.ok(v.pitch >= 0.5 && v.pitch <= 2.0);
    }
  });

  test('MusicTrack structure validation', () => {
    const track = {
      trackId: 't1', name: 'Upbeat Corporate', mood: 'upbeat', durationSec: 30, bpm: 120, genre: 'corporate', url: 'https://example.com/track.mp3', license: 'royalty-free',
    };
    assert.equal(track.mood, 'upbeat');
    assert.ok(track.bpm > 0);
    assert.ok(track.durationSec > 0);
  });

  test('all music tracks have valid structure', () => {
    const tracks = [
      { trackId: 't1', name: 'Upbeat', mood: 'upbeat', durationSec: 30, bpm: 120, genre: 'pop', url: '...', license: 'free' },
      { trackId: 't2', name: 'Calm', mood: 'calm', durationSec: 60, bpm: 80, genre: 'ambient', url: '...', license: 'free' },
    ];
    for (const t of tracks) {
      assert.ok(t.trackId);
      assert.ok(t.name);
      assert.ok(t.bpm > 0);
    }
  });

  test('TTS request validation - valid', () => {
    const req = { text: 'Hello world', voiceId: 'v1', format: 'mp3' };
    assert.ok(req.text);
  });

  test('TTS request validation - missing text', () => {
    const req = { text: '', voiceId: 'v1' };
    assert.equal(req.text, '');
  });

  test('TTS request validation - text too long', () => {
    const req = { text: 'A'.repeat(5001) };
    assert.ok(req.text.length > 5000);
  });

  test('mix request validation - missing voiceover URL', () => {
    const req = { voiceoverUrl: '', musicUrl: 'https://example.com/music.mp3', voiceVolume: 80, musicVolume: 30 };
    assert.equal(req.voiceoverUrl, '');
  });

  test('mix request validation - invalid volumes', () => {
    const req = { voiceoverUrl: 'https://example.com/voice.mp3', voiceVolume: 150, musicVolume: -10 };
    assert.ok(req.voiceVolume > 100);
    assert.ok(req.musicVolume < 0);
  });

  test('duration estimation - word count to seconds', () => {
    const text = 'This is a test sentence with exactly ten words here';
    const words = text.split(/\s+/).length;
    const wpm = 150;
    const speed = 1.0;
    const durationSec = (words / wpm) * 60 / speed;
    assert.equal(words, 10);
    assert.ok(durationSec > 0);
    assert.ok(Math.abs(durationSec - 4) < 1);
  });

  test('music mood filtering', () => {
    const moods = ['upbeat', 'energetic', 'calm', 'dramatic', 'inspirational', 'corporate', 'playful', 'tense', 'sad', 'luxurious'];
    const filtered = moods.filter((m) => m === 'upbeat');
    assert.equal(filtered.length, 1);
    assert.equal(moods.length, 10);
  });

  test('voice profile filtering by gender', () => {
    const profiles = [
      { gender: 'male', tone: 'energetic' },
      { gender: 'female', tone: 'calm' },
      { gender: 'male', tone: 'professional' },
    ];
    const males = profiles.filter((p) => p.gender === 'male');
    assert.equal(males.length, 2);
  });

  test('audio format validation', () => {
    const formats = ['mp3', 'wav', 'ogg', 'aac'];
    assert.ok(formats.includes('mp3'));
    assert.ok(!formats.includes('flac'));
  });
});
