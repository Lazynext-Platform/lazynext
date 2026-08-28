'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Volume2,
  Music,
  Sliders,
  Mic,
  Play,
  Pause,
  Download,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import {
  getVoiceProfiles,
  getMusicMoods,
  estimateTTSDuration,
  TTS_CREDIT_COST,
  MUSIC_CREDIT_COST,
  MIX_CREDIT_COST,
  type VoiceProfile,
  type VoiceGender,
  type VoiceTone,
  type VoiceLanguage,
  type MusicMood,
  type MusicTrack,
  type TTSResult,
  type AudioMixResult,
  type AudioFormat,
} from '@/lib/creative/audio-studio';

type Tab = 'voiceover' | 'music' | 'mix';

const MOOD_ICONS: Record<MusicMood, string> = {
  upbeat: '☀️',
  energetic: '⚡',
  calm: '🌊',
  dramatic: '🎭',
  inspirational: '✨',
  corporate: '💼',
  playful: '🎈',
  tense: '⏳',
  sad: '🌧️',
  luxurious: '💎',
};

const FORMATS: AudioFormat[] = ['mp3', 'wav', 'ogg', 'aac'];

export function AudioStudio() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('voiceover');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          {t('audioStudio.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('audioStudio.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t('audioStudio.title')} className="flex flex-wrap gap-1 border-b border-border">
        <TabButton active={tab === 'voiceover'} onClick={() => setTab('voiceover')} icon={<Mic className="w-4 h-4" />} label={t('audioStudio.tabVoiceover')} />
        <TabButton active={tab === 'music'} onClick={() => setTab('music')} icon={<Music className="w-4 h-4" />} label={t('audioStudio.tabMusic')} />
        <TabButton active={tab === 'mix'} onClick={() => setTab('mix')} icon={<Sliders className="w-4 h-4" />} label={t('audioStudio.tabMix')} />
      </div>

      {tab === 'voiceover' && <VoiceoverTab />}
      {tab === 'music' && <MusicTab />}
      {tab === 'mix' && <MixTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-brand-accent text-brand-accent'
          : 'border-transparent text-fg-muted hover:text-fg'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Voiceover Tab ──

function VoiceoverTab() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [gender, setGender] = useState<VoiceGender | ''>('');
  const [tone, setTone] = useState<VoiceTone | ''>('');
  const [language, setLanguage] = useState<VoiceLanguage | ''>('en');
  const [voiceId, setVoiceId] = useState('');
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TTSResult | null>(null);

  const voices = useMemo(() => {
    return getVoiceProfiles({
      gender: gender || undefined,
      tone: tone || undefined,
      language: language || undefined,
    });
  }, [gender, tone, language]);

  const estimatedDuration = useMemo(
    () => (text.trim() ? estimateTTSDuration(text, speed) : 0),
    [text, speed],
  );

  const generate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/audio-studio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: voiceId || undefined,
          gender: gender || undefined,
          tone: tone || undefined,
          language: language || undefined,
          pitch,
          speed,
          format,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [text, voiceId, gender, tone, language, pitch, speed, format]);

  return (
    <div className="space-y-4" role="tabpanel" aria-label={t('audioStudio.tabVoiceover')}>
      <div>
        <label htmlFor="tts-text" className="block text-sm font-medium mb-1">
          {t('audioStudio.text')}
        </label>
        <textarea
          id="tts-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 5000))}
          placeholder={t('audioStudio.textPlaceholder')}
          rows={5}
          maxLength={5000}
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        />
        <div className="mt-1 text-xs text-fg-muted text-right" aria-live="polite">
          {text.length}/5000
        </div>
      </div>

      {/* Voice filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="tts-gender" className="block text-sm font-medium mb-1">
            {t('audioStudio.gender')}
          </label>
          <select
            id="tts-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as VoiceGender | '')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          >
            <option value="">{t('audioStudio.any')}</option>
            <option value="male">{t('audioStudio.male')}</option>
            <option value="female">{t('audioStudio.female')}</option>
            <option value="neutral">{t('audioStudio.neutral')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="tss-tone" className="block text-sm font-medium mb-1">
            {t('audioStudio.tone')}
          </label>
          <select
            id="tss-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as VoiceTone | '')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          >
            <option value="">{t('audioStudio.any')}</option>
            <option value="energetic">Energetic</option>
            <option value="calm">Calm</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="dramatic">Dramatic</option>
            <option value="narrative">Narrative</option>
            <option value="conversational">Conversational</option>
            <option value="authoritative">Authoritative</option>
          </select>
        </div>
        <div>
          <label htmlFor="tts-language" className="block text-sm font-medium mb-1">
            {t('audioStudio.language')}
          </label>
          <select
            id="tts-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as VoiceLanguage | '')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          >
            <option value="">{t('audioStudio.any')}</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="es">Español</option>
            <option value="ko">한국어</option>
            <option value="pt">Português</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ar">العربية</option>
            <option value="hi">हिन्दी</option>
            <option value="vi">Tiếng Việt</option>
            <option value="th">ไทย</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </div>
      </div>

      {/* Voice selector */}
      <div>
        <label htmlFor="tts-voice" className="block text-sm font-medium mb-1">
          {t('audioStudio.voice')}
        </label>
        <select
          id="tts-voice"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        >
          <option value="">{t('audioStudio.autoSelect')}</option>
          {voices.map((v) => (
            <option key={v.voiceId} value={v.voiceId}>
              {v.name} — {v.gender}, {v.tone}, {v.language}
            </option>
          ))}
        </select>
        {voices.length === 0 && (
          <p className="mt-1 text-xs text-fg-muted">{t('audioStudio.noVoices')}</p>
        )}
      </div>

      {/* Pitch & Speed sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tts-pitch" className="block text-sm font-medium mb-1">
            {t('audioStudio.pitch')}: {pitch.toFixed(2)}x
          </label>
          <input
            id="tts-pitch"
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full accent-brand-accent"
            disabled={loading}
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={pitch}
          />
        </div>
        <div>
          <label htmlFor="tts-speed" className="block text-sm font-medium mb-1">
            {t('audioStudio.speed')}: {speed.toFixed(2)}x
          </label>
          <input
            id="tts-speed"
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-brand-accent"
            disabled={loading}
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={speed}
          />
        </div>
      </div>

      {/* Format + estimated duration */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="tts-format" className="block text-sm font-medium mb-1">
            {t('audioStudio.format')}
          </label>
          <select
            id="tts-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as AudioFormat)}
            className="w-32 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-fg-muted" aria-live="polite">
          {t('audioStudio.estimatedDuration')}: <span className="font-medium text-fg">{estimatedDuration}s</span>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !text.trim()}
        className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        {loading ? t('audioStudio.generating') : `${t('audioStudio.generate')} (${TTS_CREDIT_COST} ${t('audioStudio.credits')})`}
      </button>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3" role="status">
          <h3 className="font-medium">{t('audioStudio.result')}</h3>
          <div className="text-xs text-fg-muted space-y-0.5">
            <div>{t('audioStudio.voiceUsed')}: {result.voiceUsed.name} ({result.voiceUsed.gender}, {result.voiceUsed.tone})</div>
            <div>{t('audioStudio.duration')}: {result.durationSec}s · {result.wordCount} {t('audioStudio.words')}</div>
            <div>{t('audioStudio.format')}: {result.format.toUpperCase()}</div>
          </div>
          <audio controls src={result.audioUrl} className="w-full" preload="none" />
          <a
            href={result.audioUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover"
          >
            <Download className="w-4 h-4" /> {t('audioStudio.download')}
          </a>
        </div>
      )}
    </div>
  );
}

// ── Music Tab ──

function MusicTab() {
  const { t } = useI18n();
  const [mood, setMood] = useState<MusicMood>('upbeat');
  const [durationSec, setDurationSec] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const moods = useMemo(() => getMusicMoods(), []);

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    setTracks(null);
    try {
      const bpmRange =
        bpmMin && bpmMax ? { min: Number(bpmMin), max: Number(bpmMax) } : undefined;
      const res = await fetch('/api/creative/audio-studio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          durationSec: durationSec ? Number(durationSec) : undefined,
          bpmRange,
          genre: genre || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTracks(data.tracks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mood, durationSec, bpmMin, bpmMax, genre]);

  const togglePreview = (trackId: string) => {
    setPreviewing((prev) => (prev === trackId ? null : trackId));
  };

  return (
    <div className="space-y-4" role="tabpanel" aria-label={t('audioStudio.tabMusic')}>
      {/* Mood selector */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('audioStudio.mood')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={t('audioStudio.mood')}>
          {moods.map((m) => (
            <button
              key={m.mood}
              role="radio"
              aria-checked={mood === m.mood}
              onClick={() => setMood(m.mood)}
              className={`rounded-lg border p-3 text-left text-xs transition ${
                mood === m.mood
                  ? 'border-brand-accent bg-brand-accent/10'
                  : 'border-border hover:bg-bg-secondary'
              }`}
            >
              <div className="text-lg mb-1">{MOOD_ICONS[m.mood]}</div>
              <div className="font-medium">{m.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="music-duration" className="block text-sm font-medium mb-1">
            {t('audioStudio.duration')} (s)
          </label>
          <input
            id="music-duration"
            type="number"
            min={1}
            value={durationSec}
            onChange={(e) => setDurationSec(e.target.value)}
            placeholder="30"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="music-bpm-min" className="block text-sm font-medium mb-1">
            {t('audioStudio.bpmMin')}
          </label>
          <input
            id="music-bpm-min"
            type="number"
            min={0}
            value={bpmMin}
            onChange={(e) => setBpmMin(e.target.value)}
            placeholder="60"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="music-bpm-max" className="block text-sm font-medium mb-1">
            {t('audioStudio.bpmMax')}
          </label>
          <input
            id="music-bpm-max"
            type="number"
            min={0}
            value={bpmMax}
            onChange={(e) => setBpmMax(e.target.value)}
            placeholder="140"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="music-genre" className="block text-sm font-medium mb-1">
          {t('audioStudio.genre')}
        </label>
        <input
          id="music-genre"
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="pop, electronic, orchestral..."
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        />
      </div>

      <button
        onClick={search}
        disabled={loading}
        className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        {loading ? t('audioStudio.searching') : `${t('audioStudio.search')} (${MUSIC_CREDIT_COST} ${t('audioStudio.credits')})`}
      </button>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {tracks !== null && tracks.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4 text-sm text-fg-muted text-center">
          {t('audioStudio.noTracks')}
        </div>
      )}

      {tracks && tracks.length > 0 && (
        <div className="space-y-2" role="status">
          <h3 className="font-medium">{t('audioStudio.tracks')} ({tracks.length})</h3>
          {tracks.map((track) => (
            <div
              key={track.trackId}
              className="rounded-lg border border-border bg-bg-card p-3 flex items-center gap-3"
            >
              <button
                onClick={() => togglePreview(track.trackId)}
                aria-label={previewing === track.trackId ? t('audioStudio.pause') : t('audioStudio.play')}
                className="shrink-0 rounded-lg bg-brand-accent/10 p-2 text-brand-accent hover:bg-brand-accent/20"
              >
                {previewing === track.trackId ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{track.name}</div>
                <div className="text-xs text-fg-muted truncate">
                  {MOOD_ICONS[track.mood]} {track.mood} · {track.durationSec}s · {track.bpm} BPM · {track.genre} · {track.license}
                </div>
                {previewing === track.trackId && track.previewUrl && (
                  <audio
                    autoPlay
                    controls
                    src={track.previewUrl}
                    className="mt-2 w-full"
                    onEnded={() => setPreviewing(null)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mix Tab ──

function MixTab() {
  const { t } = useI18n();
  const [voiceoverUrl, setVoiceoverUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(40);
  const [fadeInSec, setFadeInSec] = useState('');
  const [fadeOutSec, setFadeOutSec] = useState('');
  const [crossfadeSec, setCrossfadeSec] = useState('');
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudioMixResult | null>(null);

  const mix = useCallback(async () => {
    if (!voiceoverUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/audio-studio/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceoverUrl,
          musicUrl: musicUrl || undefined,
          voiceVolume,
          musicVolume,
          fadeInSec: fadeInSec ? Number(fadeInSec) : undefined,
          fadeOutSec: fadeOutSec ? Number(fadeOutSec) : undefined,
          crossfadeSec: crossfadeSec ? Number(crossfadeSec) : undefined,
          outputFormat: format,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [voiceoverUrl, musicUrl, voiceVolume, musicVolume, fadeInSec, fadeOutSec, crossfadeSec, format]);

  return (
    <div className="space-y-4" role="tabpanel" aria-label={t('audioStudio.tabMix')}>
      <div>
        <label htmlFor="mix-voiceover" className="block text-sm font-medium mb-1">
          {t('audioStudio.voiceoverUrl')} *
        </label>
        <input
          id="mix-voiceover"
          type="url"
          value={voiceoverUrl}
          onChange={(e) => setVoiceoverUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="mix-music" className="block text-sm font-medium mb-1">
          {t('audioStudio.musicUrl')} ({t('audioStudio.optional')})
        </label>
        <input
          id="mix-music"
          type="url"
          value={musicUrl}
          onChange={(e) => setMusicUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        />
      </div>

      {/* Volume sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="mix-voice-vol" className="block text-sm font-medium mb-1">
            {t('audioStudio.voiceVolume')}: {voiceVolume}
          </label>
          <input
            id="mix-voice-vol"
            type="range"
            min={0}
            max={100}
            step={1}
            value={voiceVolume}
            onChange={(e) => setVoiceVolume(Number(e.target.value))}
            className="w-full accent-brand-accent"
            disabled={loading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={voiceVolume}
          />
        </div>
        <div>
          <label htmlFor="mix-music-vol" className="block text-sm font-medium mb-1">
            {t('audioStudio.musicVolume')}: {musicVolume}
          </label>
          <input
            id="mix-music-vol"
            type="range"
            min={0}
            max={100}
            step={1}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            className="w-full accent-brand-accent"
            disabled={loading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={musicVolume}
          />
        </div>
      </div>

      {/* Fade controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="mix-fade-in" className="block text-sm font-medium mb-1">
            {t('audioStudio.fadeIn')} (s)
          </label>
          <input
            id="mix-fade-in"
            type="number"
            min={0}
            max={60}
            step={0.5}
            value={fadeInSec}
            onChange={(e) => setFadeInSec(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="mix-fade-out" className="block text-sm font-medium mb-1">
            {t('audioStudio.fadeOut')} (s)
          </label>
          <input
            id="mix-fade-out"
            type="number"
            min={0}
            max={60}
            step={0.5}
            value={fadeOutSec}
            onChange={(e) => setFadeOutSec(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="mix-crossfade" className="block text-sm font-medium mb-1">
            {t('audioStudio.crossfade')} (s)
          </label>
          <input
            id="mix-crossfade"
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={crossfadeSec}
            onChange={(e) => setCrossfadeSec(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="mix-format" className="block text-sm font-medium mb-1">
          {t('audioStudio.outputFormat')}
        </label>
        <select
          id="mix-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as AudioFormat)}
          className="w-32 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={mix}
        disabled={loading || !voiceoverUrl.trim()}
        className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
        {loading ? t('audioStudio.mixing') : `${t('audioStudio.mix')} (${MIX_CREDIT_COST} ${t('audioStudio.credits')})`}
      </button>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3" role="status">
          <h3 className="font-medium">{t('audioStudio.result')}</h3>
          <div className="text-xs text-fg-muted space-y-0.5">
            <div>{t('audioStudio.duration')}: {result.durationSec}s</div>
            <div>{t('audioStudio.format')}: {result.format.toUpperCase()}</div>
            <div>{t('audioStudio.tracks')}: {result.tracks.length}</div>
          </div>
          <audio controls src={result.mixedAudioUrl} className="w-full" preload="none" />
          <a
            href={result.mixedAudioUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-hover"
          >
            <Download className="w-4 h-4" /> {t('audioStudio.download')}
          </a>
        </div>
      )}
    </div>
  );
}
