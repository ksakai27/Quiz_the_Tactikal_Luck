import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import questionsData from './questions.json';

// ── Audio ──────────────────────────────────────────────────────────────────────
let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}
function sfxRev(ac, g, wet = 0.4, delay = 0.09, fb = 0.42) {
  const d = ac.createDelay(2); d.delayTime.value = delay;
  const f = ac.createGain(); f.gain.value = fb;
  const w = ac.createGain(); w.gain.value = wet;
  g.connect(d); d.connect(f); f.connect(d); d.connect(w); w.connect(ac.destination);
}
function playIntro() {
  // 重力波検出：chirp → echo → chord tail
  const ac = getAC(); const t = ac.currentTime;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.3);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g); g.connect(ac.destination); sfxRev(ac, g, 0.5, 0.1, 0.5); o.start(t); o.stop(t + 0.35);
  const o2 = ac.createOscillator(); const g2 = ac.createGain();
  o2.type = 'sine'; o2.frequency.setValueAtTime(80, t + 0.25); o2.frequency.exponentialRampToValueAtTime(600, t + 0.5);
  g2.gain.setValueAtTime(0, t + 0.25); g2.gain.linearRampToValueAtTime(0.25, t + 0.38); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o2.connect(g2); g2.connect(ac.destination); sfxRev(ac, g2, 0.6, 0.12, 0.5); o2.start(t + 0.25); o2.stop(t + 0.55);
  [220, 330, 440].forEach((f, i) => {
    const oo = ac.createOscillator(); const gg = ac.createGain();
    oo.type = 'sine'; oo.frequency.value = f;
    gg.gain.setValueAtTime(0, t + 0.3 + i * 0.04); gg.gain.linearRampToValueAtTime(0.1, t + 0.4 + i * 0.04);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    oo.connect(gg); gg.connect(ac.destination); sfxRev(ac, gg, 0.7, 0.12, 0.55); oo.start(t + 0.3 + i * 0.04); oo.stop(t + 1.2);
  });
}
function playCorrect() {
  // L3: パルスレーザー3連射
  const ac = getAC(); const t = ac.currentTime;
  [0, 0.11, 0.22].forEach((offset, i) => {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(2800 - i * 100, t + offset); o.frequency.exponentialRampToValueAtTime(300, t + offset + 0.09);
    g.gain.setValueAtTime(0.45, t + offset); g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.09);
    o.connect(g); g.connect(ac.destination); sfxRev(ac, g, 0.25, 0.05, 0.3); o.start(t + offset); o.stop(t + offset + 0.09);
  });
}
function playIncorrect() {
  // うにゅ〜：風船しぼむ
  const ac = getAC(); const t = ac.currentTime;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(60, t + 1.2);
  const lfo = ac.createOscillator(); const lg = ac.createGain();
  lfo.frequency.setValueAtTime(12, t); lfo.frequency.exponentialRampToValueAtTime(3, t + 1.2);
  lg.gain.setValueAtTime(100, t); lg.gain.exponentialRampToValueAtTime(10, t + 1.2);
  lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  o.connect(g); g.connect(ac.destination); lfo.start(t); lfo.stop(t + 1.2); o.start(t); o.stop(t + 1.2);
}
function playTick() {
  // B2: スイッチON（クリック＋ビープ）
  const ac = getAC(); const t = ac.currentTime;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.008), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
  const g = ac.createGain(); g.gain.value = 1.0;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t);
  const o = ac.createOscillator(); const og = ac.createGain();
  o.type = 'sine'; o.frequency.value = 1047;
  og.gain.setValueAtTime(0.35, t + 0.01); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og); og.connect(ac.destination); o.start(t + 0.01); o.stop(t + 0.1);
}
function playQuestionStart() {
  // ホテル呼び鈴チーン：純音 + 倍音、短いアタック、自然な減衰
  const ac = getAC(); const t = ac.currentTime;
  // 基音 1047Hz (C6)
  const o1 = ac.createOscillator(); const g1 = ac.createGain();
  o1.type = 'sine'; o1.frequency.value = 1760;
  g1.gain.setValueAtTime(0, t); g1.gain.linearRampToValueAtTime(0.16, t + 0.003);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
  o1.connect(g1); g1.connect(ac.destination); sfxRev(ac, g1, 0.15, 0.06, 0.28);
  o1.start(t); o1.stop(t + 2.2);
  // 第2倍音 3520Hz
  const o2 = ac.createOscillator(); const g2 = ac.createGain();
  o2.type = 'sine'; o2.frequency.value = 3520;
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.05, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  o2.connect(g2); g2.connect(ac.destination);
  o2.start(t); o2.stop(t + 0.9);
}
function playButtonPress() {
  // L10: エネルギー砲（低音ドン＋ビーム）
  const ac = getAC(); const t = ac.currentTime;
  const boom = ac.createOscillator(); const bg = ac.createGain();
  boom.type = 'sine'; boom.frequency.setValueAtTime(80, t); boom.frequency.exponentialRampToValueAtTime(25, t + 0.3);
  bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.9, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  boom.connect(bg); bg.connect(ac.destination); boom.start(t); boom.stop(t + 0.35);
  const beam = ac.createOscillator(); const beamg = ac.createGain();
  beam.type = 'sawtooth'; beam.frequency.setValueAtTime(2500, t); beam.frequency.exponentialRampToValueAtTime(150, t + 0.4);
  beamg.gain.setValueAtTime(0.4, t); beamg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  beam.connect(beamg); beamg.connect(ac.destination); sfxRev(ac, beamg, 0.4, 0.08, 0.4); beam.start(t); beam.stop(t + 0.4);
  const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate);
  const nd = nbuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
  const nsrc = ac.createBufferSource(); nsrc.buffer = nbuf;
  const nf = ac.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2000;
  const ng = ac.createGain(); ng.gain.value = 1.5;
  nsrc.connect(nf); nf.connect(ng); ng.connect(ac.destination); nsrc.start(t);
}

const QUESTION_REVEAL_MS = 100;
const FEEDBACK_REVEAL_MS = 80;
const EXPLANATION_TO_FUN_DELAY_MS = 600;
const COUNTDOWN_TOTAL_MS = 5000;
const COUNTDOWN_INTERVAL_MS = 100;
const RESUME_AFTER_TYPING_MS = 2000;
const SEGMENT_SIZE = 10;

const positiveComments = [
  'ナイス！いい流れです。',
  '正解です。とても良い理解です。',
  'お見事！その調子です。',
  '素晴らしい判断ですね。',
];

const gentleRoasts = [
  '惜しい！次はきっと取れます。',
  '今回は一歩及ばず。次で挽回しましょう。',
  'まだまだここからです。',
  'この問題は復習案件ですね。',
];

function normalize(text) {
  return String(text ?? '').trim().toLowerCase().replace(/[\u3000\s]+/g, '');
}

function toQuestion(raw, index) {
  return {
    id: Number(raw.number ?? index + 1),
    prompt: String(raw.Quiz ?? ''),
    answer: String(raw.Answer ?? ''),
    alternatives: Array.isArray(raw.Alternative_Answer) ? raw.Alternative_Answer.map(String) : [],
    hint: String(raw.Hint ?? ''),
    explanation: String(raw.Explanation ?? ''),
    fun: String(raw.Fun ?? ''),
  };
}

function isCorrect(question, userAnswer) {
  const user = normalize(userAnswer);
  return [question.answer, ...question.alternatives].map(normalize).includes(user);
}

function getSegmentSummary(results, start, end) {
  const slice = results.slice(start, end).filter(Boolean);
  const correct = slice.filter((r) => r.correct).length;
  const total = slice.length || 1;
  const rate = correct / total;
  if (rate >= 0.9) return { title: 'PERFECT ROUND', emoji: '🏆🔥', message: '圧倒的だ。この勢いで行け。' };
  if (rate >= 0.7) return { title: 'STRONG PERFORMANCE', emoji: '⚔️🌟', message: 'いいペースだ。次も攻めろ。' };
  if (rate >= 0.5) return { title: 'HOLDING GROUND', emoji: '💪🔥', message: 'まだ戦える。立て直せ。' };
  return { title: 'TACTICAL RESET', emoji: '🔥', message: '崩れた。次のブロックで取り返せ。' };
}

function getOverallRank(correctCount, totalQuestions) {
  const rate = totalQuestions === 0 ? 0 : correctCount / totalQuestions;
  if (rate >= 0.9) return 'S';
  if (rate >= 0.75) return 'A';
  if (rate >= 0.6) return 'B';
  if (rate >= 0.4) return 'C';
  return 'D';
}

// ── UI Components ──────────────────────────────────────────────────────────

function Divider({ accent = '#dc2626' }) {
  const c = accent;
  return (
    <svg width="100%" height="18" viewBox="0 0 300 18" preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', margin: '6px 0', filter: `drop-shadow(0 0 4px ${c}55)` }}>
      {/* Left pointed tip */}
      <polygon points="2,7 12,9 2,11" fill={c} opacity="0.55" />
      {/* Left line with tick marks */}
      <line x1="12" y1="9" x2="122" y2="9" stroke={c} strokeWidth="1" opacity="0.45" />
      <line x1="50" y1="6" x2="50" y2="12" stroke={c} strokeWidth="1" opacity="0.3" />
      <line x1="88" y1="6" x2="88" y2="12" stroke={c} strokeWidth="1" opacity="0.3" />
      {/* Central gothic diamond */}
      <polygon points="150,2 170,9 150,16 130,9" fill={c} opacity="0.5" />
      <polygon points="150,5.5 164,9 150,12.5 136,9" fill="#09090b" />
      <circle cx="150" cy="9" r="2" fill={c} opacity="0.85" />
      {/* Right line with tick marks */}
      <line x1="178" y1="9" x2="288" y2="9" stroke={c} strokeWidth="1" opacity="0.45" />
      <line x1="212" y1="6" x2="212" y2="12" stroke={c} strokeWidth="1" opacity="0.3" />
      <line x1="250" y1="6" x2="250" y2="12" stroke={c} strokeWidth="1" opacity="0.3" />
      {/* Right pointed tip */}
      <polygon points="298,7 288,9 298,11" fill={c} opacity="0.55" />
    </svg>
  );
}

function RankBadge({ rank, size = 52 }) {
  const palette = {
    S: { outer: '#fbbf24', bg: '#451a03', glow: '#fbbf2468', text: '#fef3c7' },
    A: { outer: '#a78bfa', bg: '#2e1065', glow: '#a78bfa68', text: '#ede9fe' },
    B: { outer: '#60a5fa', bg: '#1e3a5f', glow: '#60a5fa68', text: '#dbeafe' },
    C: { outer: '#4ade80', bg: '#052e16', glow: '#4ade8068', text: '#dcfce7' },
    D: { outer: '#f87171', bg: '#450a0a', glow: '#f8717168', text: '#fee2e2' },
  };
  const p = palette[rank] || palette.D;
  const w = size; const h = Math.round(size * 70 / 56);
  return (
    <svg width={w} height={h} viewBox="0 0 60 70"
      style={{ filter: `drop-shadow(0 0 5px ${p.glow}) drop-shadow(0 0 14px ${p.glow})` }}>
      {/* Outer hexagon */}
      <polygon points="30,3 57,18 57,52 30,67 3,52 3,18"
        fill={p.bg} stroke={p.outer} strokeWidth="2" />
      {/* Inner hex ring */}
      <polygon points="30,10 51,22 51,48 30,60 9,48 9,22"
        fill="none" stroke={p.outer} strokeWidth="0.7" opacity="0.35" />
      {/* Gothic accent ticks at each vertex */}
      {[
        [30,3,30,10],[57,18,51,22],[57,52,51,48],
        [30,67,30,60],[3,52,9,48],[3,18,9,22],
      ].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.outer} strokeWidth="2.5" />
      ))}
      {/* Small diamond ornament at top vertex */}
      <polygon points="30,4 33.5,9 30,14 26.5,9" fill={p.outer} opacity="0.6" />
      {/* Rank letter */}
      <text x="30" y="48" textAnchor="middle"
        fontFamily="'Bebas Neue', sans-serif" fontSize="40" fill={p.text}
        style={{ filter: `drop-shadow(0 0 6px ${p.outer})` }}>
        {rank}
      </text>
      {/* RANK label */}
      <text x="30" y="62" textAnchor="middle"
        fontFamily="'Share Tech Mono', monospace" fontSize="6.5"
        fill={p.outer} letterSpacing="3" opacity="0.85">
        RANK
      </text>
    </svg>
  );
}

function HexBackground() {
  const R = 28;
  const w = R * Math.sqrt(3);
  const h = R * 3;
  const hex = (cx, cy, key) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
    }).join(' ');
    return <polygon key={key} points={pts} fill="none" stroke="rgba(185,28,28,0.09)" strokeWidth="0.7" />;
  };
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id="hexgrid" x="0" y="0" width={w} height={h} patternUnits="userSpaceOnUse">
          {hex(w / 2, R, 'a')}
          {hex(0, R * 2.5, 'b')}
          {hex(w, R * 2.5, 'c')}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexgrid)" />
    </svg>
  );
}

function LightningOverlay() {
  const [bolts, setBolts] = useState([]);

  const makeBolt = useCallback(() => {
    const startX = 10 + Math.random() * 80;
    const steps = 9 + Math.floor(Math.random() * 6);
    let cx = startX;
    const pts = [[cx, 0]];
    for (let i = 1; i <= steps; i++) {
      cx += (Math.random() - 0.5) * 14;
      cx = Math.max(3, Math.min(97, cx));
      pts.push([cx, (i / steps) * 72]);
    }
    const main = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

    const bi = Math.floor(steps * 0.35) + 1;
    const [bx, by] = pts[bi];
    let bcx = bx;
    const bPts = [[bx, by]];
    for (let i = 1; i <= 4; i++) {
      bcx += (Math.random() * 0.6 + 0.2) * 8 * (Math.random() > 0.5 ? 1 : -1);
      bPts.push([bcx, by + i * 7]);
    }
    const branch = bPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

    return { id: Math.random(), main, branch };
  }, []);

  useEffect(() => {
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        const bolt = makeBolt();
        setBolts(prev => [...prev, bolt]);
        setTimeout(() => setBolts(prev => prev.filter(b => b.id !== bolt.id)), 750);
        schedule();
      }, 2000 + Math.random() * 2000);
    };
    schedule();
    return () => clearTimeout(t);
  }, [makeBolt]);

  if (bolts.length === 0) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
      {bolts.map(b => (
        <g key={b.id} style={{ animation: 'lightning-flash 0.75s ease-out forwards' }}>
          <path d={b.main} stroke="#dc2626" strokeWidth="1.2" fill="none" opacity="0.55"
            style={{ filter: 'blur(1.5px)' }} />
          <path d={b.main} stroke="#ffffff" strokeWidth="0.35" fill="none" />
          <path d={b.branch} stroke="#f97316" strokeWidth="0.7" fill="none" opacity="0.5"
            style={{ filter: 'blur(1px)' }} />
          <path d={b.branch} stroke="#ffffff" strokeWidth="0.2" fill="none" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

function HudMidEdge({ accent, rotate = false }) {
  const c = accent;
  return (
    <svg width="28" height="10" viewBox="0 0 28 10"
      style={{
        display: 'block',
        transform: rotate ? 'rotate(90deg)' : 'none',
        filter: `drop-shadow(0 0 3px ${c}90)`,
      }}>
      <line x1="0" y1="5" x2="9" y2="5" stroke={c} strokeWidth="1" opacity="0.5" />
      <polygon points="14,1 19,5 14,9 9,5" fill={c} opacity="0.55" />
      <polygon points="14,3.5 17,5 14,6.5 11,5" fill="#09090b" />
      <circle cx="14" cy="5" r="1.2" fill={c} opacity="0.9" />
      <line x1="19" y1="5" x2="28" y2="5" stroke={c} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function HudFrame({ children, label, className = '', style = {}, accent = '#dc2626', dim = false }) {
  const c = dim ? `${accent}50` : accent;
  const glow = dim ? 'none' : `0 0 6px ${accent}55, 0 0 20px ${accent}28, inset 0 0 40px rgba(0,0,0,0.7)`;
  const corners = [
    { pos: { top: -1, left: -1 },    tf: 'none' },
    { pos: { top: -1, right: -1 },   tf: 'scaleX(-1)' },
    { pos: { bottom: -1, left: -1 }, tf: 'scaleY(-1)' },
    { pos: { bottom: -1, right: -1 },tf: 'scale(-1,-1)' },
  ];
  const midEdges = [
    { pos: { top: -5,    left: '50%' }, xf: 'translateX(-50%)',              rotate: false },
    { pos: { bottom: -5, left: '50%' }, xf: 'translateX(-50%)',              rotate: false },
    { pos: { top: '50%', left: -9  },   xf: 'translateY(-50%)',              rotate: true  },
    { pos: { top: '50%', right: -9 },   xf: 'translateY(-50%)',              rotate: true  },
  ];
  return (
    <div className={`relative ${className}`} style={style}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ border: `1px solid ${accent}45`, boxShadow: glow }} />
      {!dim && midEdges.map(({ pos, xf, rotate }, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ ...pos, transform: xf, zIndex: 2 }}>
          <HudMidEdge accent={c} rotate={rotate} />
        </div>
      ))}
      {/* SVG Gothic Corners */}
      {corners.map(({ pos, tf }, i) => (
        <svg key={i} width="32" height="32" viewBox="0 0 32 32"
          className="absolute pointer-events-none"
          style={{ ...pos, transform: tf, filter: `drop-shadow(0 0 3px ${c}80)` }}>
          {/* Outer diamond */}
          <path d="M 0,8 L 8,0 L 16,8 L 8,16 Z" fill={c} opacity="0.5" />
          {/* Inner hollow */}
          <path d="M 4,8 L 8,4 L 12,8 L 8,12 Z" fill="#09090b" />
          {/* Centre pip */}
          <circle cx="8" cy="8" r="1.5" fill={c} opacity="0.9" />
          {/* Horizontal arm */}
          <line x1="16" y1="8" x2="28" y2="8" stroke={c} strokeWidth="2" strokeLinecap="butt" />
          {/* Pointed tip — horizontal */}
          <polygon points="27,5.5 32,8 27,10.5" fill={c} />
          {/* Mid-arm notch */}
          <line x1="22" y1="8" x2="22" y2="12" stroke={c} strokeWidth="1" opacity="0.4" />
          {/* Vertical arm */}
          <line x1="8" y1="16" x2="8" y2="28" stroke={c} strokeWidth="2" strokeLinecap="butt" />
          {/* Pointed tip — vertical */}
          <polygon points="5.5,27 8,32 10.5,27" fill={c} />
          {/* Mid-arm notch */}
          <line x1="8" y1="22" x2="12" y2="22" stroke={c} strokeWidth="1" opacity="0.4" />
        </svg>
      ))}
      {label && (
        <div className="absolute pointer-events-none font-terminal"
          style={{ top: -9, left: 14, padding: '0 6px', background: '#09090b',
            fontSize: '0.58rem', color: c, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function CircularTimer({ remainingMs, totalMs, active, size = 136 }) {
  const pct = remainingMs / totalMs;
  const R = 50;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - pct);
  const secs = Math.ceil(remainingMs / 1000);
  const color = !active ? '#52525b' : pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  const scale = size / 136;

  return (
    <svg width={size} height={size} viewBox="0 0 136 136"
      style={{ filter: active ? `drop-shadow(0 0 10px ${color}60)` : 'none' }}>
      <circle cx="68" cy="68" r="64" fill="none" stroke="rgba(220,38,38,0.08)" strokeWidth="1" />
      {Array.from({ length: 40 }, (_, i) => {
        const a = ((i / 40) * 360 - 90) * (Math.PI / 180);
        const big = i % 5 === 0;
        const r1 = big ? 58 : 61; const r2 = 64;
        return <line key={i} x1={68 + r1 * Math.cos(a)} y1={68 + r1 * Math.sin(a)}
          x2={68 + r2 * Math.cos(a)} y2={68 + r2 * Math.sin(a)}
          stroke={big ? 'rgba(220,38,38,0.4)' : 'rgba(220,38,38,0.15)'} strokeWidth={big ? 2 : 1} />;
      })}
      <circle cx="68" cy="68" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
      <circle cx="68" cy="68" r={R} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="butt" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 68 68)"
        style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }} />
      <text x="68" y="60" textAnchor="middle" fontFamily="'Bebas Neue',sans-serif"
        fontSize="36" fill={color}>{active ? secs : '—'}</text>
      <text x="68" y="78" textAnchor="middle" fontFamily="'Share Tech Mono',monospace"
        fontSize="10" fill="rgba(255,255,255,0.3)" letterSpacing="3">{active ? '秒' : 'STANDBY'}</text>
    </svg>
  );
}

function BlockDots({ results, segmentStart, segmentEnd, currentIndex }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: segmentEnd - segmentStart }, (_, i) => {
        const idx = segmentStart + i;
        const r = results[idx];
        const cur = idx === currentIndex;
        return (
          <div key={i} className="rounded-full"
            style={{
              width: 9, height: 9,
              border: `1px solid ${r ? (r.correct ? '#22c55e' : '#ef4444') : cur ? '#ef4444' : '#3f3f46'}`,
              background: r ? (r.correct ? 'rgba(22,163,74,0.5)' : 'rgba(185,28,28,0.5)') : cur ? 'rgba(239,68,68,0.25)' : 'transparent',
              boxShadow: cur ? '0 0 6px rgba(239,68,68,0.7)' : 'none',
            }} />
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function QuizApp() {
  const questions = useMemo(() => {
    if (!Array.isArray(questionsData)) return [];
    return questionsData.map(toQuestion);
  }, []);

  const totalQuestions = questions.length;
  const [screen, setScreen] = useState('start');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);

  const [displayedText, setDisplayedText] = useState('');
  const [typedLength, setTypedLength] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);

  const [answerMode, setAnswerMode] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_TOTAL_MS);
  const [countingActive, setCountingActive] = useState(false);
  const [lastTypedAt, setLastTypedAt] = useState(null);

  const [feedback, setFeedback] = useState(null);
  const [feedbackPhase, setFeedbackPhase] = useState('explanation');
  const [explanationDisplayed, setExplanationDisplayed] = useState('');
  const [explanationTypedLength, setExplanationTypedLength] = useState(0);
  const [funDisplayed, setFunDisplayed] = useState('');
  const [funTypedLength, setFunTypedLength] = useState(0);

  const answerInputRef = useRef(null);
  const introPlayedRef = useRef(false);
  const prevTickSecRef = useRef(null);
  const timedOutRef = useRef(false);
  const autoStartedRef = useRef(false);
  const [startReady, setStartReady] = useState(false);

  const currentQuestion = questions[currentIndex];
  const correctCount = results.filter((r) => r?.correct).length;
  const answeredCount = results.filter(Boolean).length;
  const currentSegmentStart = Math.floor(currentIndex / SEGMENT_SIZE) * SEGMENT_SIZE;
  const currentSegmentEnd = Math.min(currentSegmentStart + SEGMENT_SIZE, totalQuestions);
  const overallRank = getOverallRank(correctCount, totalQuestions);
  const questionFullyRevealed = Boolean(currentQuestion && typedLength >= currentQuestion.prompt.length);

  useEffect(() => {
    if (!currentQuestion || answerMode || screen !== 'quiz') return;
    if (typedLength >= currentQuestion.prompt.length) return;
    const t = setInterval(() => {
      setTypedLength((v) => { const n = Math.min(v + 1, currentQuestion.prompt.length); setDisplayedText(currentQuestion.prompt.slice(0, n)); return n; });
    }, QUESTION_REVEAL_MS);
    return () => clearInterval(t);
  }, [currentQuestion, typedLength, answerMode, screen]);

  useEffect(() => {
    if (!answerMode || !countingActive || screen !== 'quiz') return;
    const t = setInterval(() => { setRemainingMs((v) => Math.max(0, v - COUNTDOWN_INTERVAL_MS)); }, COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(t);
  }, [answerMode, countingActive, screen]);

  useEffect(() => {
    if (!answerMode || countingActive || !lastTypedAt || screen !== 'quiz') return;
    const t = setTimeout(() => setCountingActive(true), RESUME_AFTER_TYPING_MS);
    return () => clearTimeout(t);
  }, [answerMode, countingActive, lastTypedAt, screen]);

  const startQuestion = useCallback((index) => {
    timedOutRef.current = false;
    autoStartedRef.current = false;
    setCurrentIndex(index); setDisplayedText(''); setTypedLength(0);
    setAnswerMode(false); setAnswerText(''); setRemainingMs(COUNTDOWN_TOTAL_MS);
    setCountingActive(false); setLastTypedAt(null); setFeedback(null);
    setHintVisible(false); setFeedbackPhase('explanation');
    setExplanationDisplayed(''); setExplanationTypedLength(0);
    setFunDisplayed(''); setFunTypedLength(0);
  }, []);

  const submitAnswer = useCallback((timeout = false) => {
    if (!currentQuestion) return;
    const ok = !timeout && isCorrect(currentQuestion, answerText);
    if (ok) playCorrect(); else playIncorrect();
    setResults((prev) => { const n = [...prev]; n[currentIndex] = { correct: ok, questionId: currentQuestion.id, answer: currentQuestion.answer, userAnswer: answerText }; return n; });
    setFeedback({ ok, comment: ok ? positiveComments[currentIndex % positiveComments.length] : gentleRoasts[currentIndex % gentleRoasts.length],
      explanation: currentQuestion.explanation, answer: currentQuestion.answer,
      alternatives: currentQuestion.alternatives, fun: currentQuestion.fun, userAnswer: answerText });
    setExplanationDisplayed(''); setExplanationTypedLength(0);
    setFunDisplayed(''); setFunTypedLength(0); setFeedbackPhase('explanation');
    setAnswerMode(false); setCountingActive(false); setScreen('feedback');
  }, [currentQuestion, answerText, currentIndex]);

  useEffect(() => {
    if (!questionFullyRevealed || answerMode || screen !== 'quiz' || timedOutRef.current) return;
    const t = setTimeout(() => { autoStartedRef.current = true; setAnswerMode(true); setCountingActive(true); }, 2000);
    return () => clearTimeout(t);
  }, [questionFullyRevealed, answerMode, screen]);

  useEffect(() => {
    if (!answerMode || remainingMs !== 0) return;
    if (autoStartedRef.current) {
      // 全文表示後の自動スタート → 不正解
      submitAnswer(true);
    } else {
      // 手動ボタン押し（タイプ途中） → 表示再開
      timedOutRef.current = true;
      setAnswerMode(false); setCountingActive(false);
      setRemainingMs(COUNTDOWN_TOTAL_MS); setAnswerText(''); setLastTypedAt(null);
    }
  }, [remainingMs, answerMode, submitAnswer]);

  useEffect(() => {
    if (screen !== 'feedback' || !feedback || feedbackPhase !== 'explanation') return;
    const text = feedback.explanation || '';
    if (explanationTypedLength >= text.length) { const t = setTimeout(() => setFeedbackPhase('fun'), EXPLANATION_TO_FUN_DELAY_MS); return () => clearTimeout(t); }
    const t = setInterval(() => { setExplanationTypedLength((v) => { const n = Math.min(v + 1, text.length); setExplanationDisplayed(text.slice(0, n)); return n; }); }, FEEDBACK_REVEAL_MS);
    return () => clearInterval(t);
  }, [screen, feedback, feedbackPhase, explanationTypedLength]);

  useEffect(() => {
    if (screen !== 'feedback' || !feedback || feedbackPhase !== 'fun') return;
    if (feedback.ok) { setFeedbackPhase('done'); return; }
    const text = feedback.fun || '';
    if (!text) { setFeedbackPhase('done'); return; }
    if (funTypedLength >= text.length) { setFeedbackPhase('done'); return; }
    const t = setInterval(() => { setFunTypedLength((v) => { const n = Math.min(v + 1, text.length); setFunDisplayed(text.slice(0, n)); return n; }); }, FEEDBACK_REVEAL_MS);
    return () => clearInterval(t);
  }, [screen, feedback, feedbackPhase, funTypedLength]);

  const goNextAfterFeedback = useCallback(() => {
    const nextIndex = currentIndex + 1;
    const finishedCount = currentIndex + 1;
    if (finishedCount >= totalQuestions) { setScreen('done'); return; }
    if (finishedCount % SEGMENT_SIZE === 0) { setScreen('segment'); return; }
    startQuestion(nextIndex); setScreen('quiz');
  }, [currentIndex, totalQuestions, startQuestion]);

  useEffect(() => { if (answerMode && answerInputRef.current) answerInputRef.current.focus(); }, [answerMode]);

  // Question start chime: fires each time a new question begins
  useEffect(() => {
    if (screen !== 'quiz') return;
    try { playQuestionStart(); } catch (e) {}
  }, [currentIndex, screen]);

  // Countdown tick: play once per second while counting
  useEffect(() => {
    if (!answerMode || !countingActive) { prevTickSecRef.current = null; return; }
    const secs = Math.ceil(remainingMs / 1000);
    if (prevTickSecRef.current !== null && secs !== prevTickSecRef.current) playTick();
    prevTickSecRef.current = secs;
  }, [remainingMs, answerMode, countingActive]);

  const openAnswerMode = () => { autoStartedRef.current = false; playButtonPress(); setAnswerMode(true); setCountingActive(true); };
  const goToNextBlock = () => { const n = currentIndex + 1; if (n >= totalQuestions) { setScreen('done'); return; } startQuestion(n); setScreen('quiz'); };
  const restart = () => { setResults([]); startQuestion(0); introPlayedRef.current = false; setStartReady(false); setScreen('start'); };

  if (totalQuestions === 0) return <div className="min-h-screen bg-zinc-950 text-red-400 flex items-center justify-center font-terminal">questions.json が見つかりません</div>;

  const blockCount = Math.ceil(totalQuestions / SEGMENT_SIZE);
  const segmentSummary = getSegmentSummary(results, currentSegmentStart, currentSegmentEnd);
  const displayIndex = screen === 'start' ? 0 : Math.min(currentIndex + 1, totalQuestions);

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden font-tactical"
      style={{ background: '#070709' }}>

      {/* Hex grid background */}
      <HexBackground />
      {screen === 'start' && <LightningOverlay />}

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(127,29,29,0.2) 0%, transparent 60%)' }} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30"
        style={{ background: 'rgba(5,5,8,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(185,28,28,0.25)' }}>
        <div className="max-w-screen-xl mx-auto px-5 py-2 flex items-center gap-6">

          {/* Logo */}
          <div className="shrink-0">
            <h1 className="font-display title-glow metal-text"
              style={{ fontSize: '1.4rem', letterSpacing: '0.06em', lineHeight: 1 }}>
              Quiz the Tactical Luck
            </h1>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs font-terminal">
            <div className="flex items-center gap-1.5 border border-zinc-800 px-2.5 py-1" style={{ background: 'rgba(10,10,14,0.8)' }}>
              <span className="text-zinc-600">現在:</span>
              <span className="text-white font-bold">{displayIndex}</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-500">{totalQuestions}</span>
            </div>
            <div className="flex items-center gap-1.5 border border-green-900/50 px-2.5 py-1" style={{ background: 'rgba(20,83,45,0.15)' }}>
              <span className="text-zinc-600">正解数:</span>
              <span className="text-green-400 font-bold">{correctCount}</span>
            </div>
            <div className="flex items-center gap-1.5 border border-zinc-800 px-2.5 py-1" style={{ background: 'rgba(10,10,14,0.8)' }}>
              <span className="text-zinc-600">回答済み:</span>
              <span className="text-zinc-400">{answeredCount}</span>
            </div>
          </div>

          {/* Block progress */}
          {screen === 'quiz' || screen === 'feedback' ? (
            <div className="flex flex-col gap-1 ml-auto">
              <span className="font-terminal text-zinc-700" style={{ fontSize: '0.55rem', letterSpacing: '0.15em' }}>
                {SEGMENT_SIZE}問ブロック進行状況
              </span>
              <BlockDots results={results} segmentStart={currentSegmentStart} segmentEnd={currentSegmentEnd} currentIndex={currentIndex} />
            </div>
          ) : (
            <div className="ml-auto">
              <RankBadge rank={overallRank} size={44} />
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-px" style={{ background: 'rgba(30,10,10,1)' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${totalQuestions > 0 ? (displayIndex / totalQuestions) * 100 : 0}%`,
              background: 'linear-gradient(90deg,#7f1d1d,#ef4444)', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className={`mx-auto px-5 py-5 relative z-10 ${screen === 'quiz' ? 'max-w-screen-2xl' : 'max-w-screen-xl pb-48'}`}>

        {/* ── START ── */}
        {screen === 'start' && (
          <div className="flex flex-col items-center min-h-[70vh] pt-10 space-y-10">
            <div className="text-center space-y-2">
              <p className="font-terminal text-red-800 uppercase tracking-widest" style={{ fontSize: '0.62rem', letterSpacing: '0.4em' }}>
                ⚔ Tactical Quiz Battle ⚔
              </p>
              <div className="title-glow">
                <h2 className="font-display metal-text" style={{ fontSize: 'clamp(3.5rem,9vw,7rem)', lineHeight: 0.95 }}>
                  Quiz the<br />Tactical Luck
                </h2>
              </div>
              <p className="font-terminal text-zinc-700" style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>
                {totalQuestions} QUESTIONS &nbsp;·&nbsp; {SEGMENT_SIZE} PER BLOCK
              </p>
            </div>

            {!startReady ? (
              /* Tap-to-begin overlay — first user gesture plays intro then reveals blocks */
              <button
                className="btn-primary border border-red-900 font-display"
                style={{ padding: '1.4rem 3.5rem', fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '0.18em',
                  color: '#f8d4d4',
                  background: 'linear-gradient(160deg,#3b0000,#7f1d1d)',
                  boxShadow: '0 0 40px rgba(185,28,28,0.5), 0 0 80px rgba(127,29,29,0.2), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                onClick={() => { if (!introPlayedRef.current) { introPlayedRef.current = true; playIntro(); } setStartReady(true); }}>
                ▶ CLICK TO BEGIN
              </button>
            ) : (
              <div className="w-full max-w-2xl space-y-3">
                <p className="text-center font-terminal text-zinc-700 tracking-widest" style={{ fontSize: '0.6rem', letterSpacing: '0.3em' }}>
                  — SELECT STARTING BLOCK —
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: blockCount }, (_, block) => {
                    const s = block * SEGMENT_SIZE;
                    const e = Math.min(s + SEGMENT_SIZE, totalQuestions);
                    const good = results.slice(s, e).filter((r) => r?.correct).length;
                    const done = results.slice(s, e).filter(Boolean).length === e - s;
                    return (
                      <button key={block} className="block-btn flex flex-col items-center py-3 border"
                        style={{ borderColor: done ? 'rgba(22,163,74,0.5)' : 'rgba(63,63,70,0.6)',
                          background: done ? 'rgba(20,83,45,0.2)' : 'rgba(12,12,16,0.9)' }}
                        onClick={() => { startQuestion(s); setScreen('quiz'); }}>
                        <span className="font-terminal" style={{ fontSize: '0.65rem', color: done ? '#86efac' : '#52525b' }}>{s + 1}–{e}</span>
                        <span className="font-display mt-1" style={{ fontSize: done ? '0.85rem' : '0.8rem', color: done ? '#4ade80' : '#3f3f46' }}>
                          {done ? `✓ ${good}/${e - s}` : `BLOCK ${block + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ ── */}
        {screen === 'quiz' && currentQuestion && (
          <div className="grid gap-4"
            style={{ gridTemplateColumns: '3fr 2fr', gridTemplateRows: 'auto auto', alignItems: 'stretch', paddingBottom: '440px' }}>

            {/* Row 1 Col 1: Question */}
            <HudFrame label={`第 ${currentQuestion.id} 問`} className="flex flex-col p-5"
              style={{ gridColumn: 1, gridRow: 1 }}>
              <div className="font-terminal text-green-300 leading-relaxed"
                style={{ fontSize: '2.1rem', textShadow: '0 0 10px rgba(134,239,172,0.35)' }}>
                {displayedText}
                {!answerMode && !questionFullyRevealed && <span className="animate-pulse text-green-400">█</span>}
              </div>
            </HudFrame>

            {/* Row 1 Col 2: Timer */}
            <HudFrame label="制限時間" className="flex flex-col items-center justify-center p-6"
              style={{ gridColumn: 2, gridRow: 1 }}>
              <CircularTimer remainingMs={remainingMs} totalMs={COUNTDOWN_TOTAL_MS} active={answerMode} size={240} />
              {answerMode && (
                <p className="font-terminal mt-3 text-center"
                  style={{ fontSize: '1.1rem', letterSpacing: '0.12em',
                    color: countingActive ? 'rgba(239,68,68,0.7)' : 'rgba(100,100,120,0.7)' }}>
                  {countingActive ? '● カウント中' : '■ 入力中は停止'}
                </p>
              )}
            </HudFrame>

            {/* Row 2 Col 1: Hint */}
            {currentQuestion.hint && (
              <HudFrame label="ヒント" className="p-4" style={{ gridColumn: 1, gridRow: 2 }}>
                {questionFullyRevealed ? (
                  !hintVisible ? (
                    <button
                      className="w-full flex items-center gap-3 py-2 font-tactical font-bold text-zinc-500 hover:text-yellow-400 transition-colors"
                      style={{ fontSize: '1.7rem' }}
                      onClick={() => setHintVisible(true)}>
                      <span>💡</span> ヒントを表示
                    </button>
                  ) : (
                    <p className="font-terminal text-yellow-300 leading-snug" style={{ fontSize: '1.56rem' }}>
                      💡 {currentQuestion.hint}
                    </p>
                  )
                ) : (
                  <div className="flex items-center gap-3 py-2 opacity-30">
                    <span className="text-3xl">🔒</span>
                    <p className="font-terminal text-zinc-600" style={{ fontSize: '1.16rem', letterSpacing: '0.1em' }}>
                      問題が表示されると使えます
                    </p>
                  </div>
                )}
              </HudFrame>
            )}

            {/* Row 2 Col 2: Answer button / input */}
            <div className="flex flex-col gap-4" style={{ gridColumn: 2, gridRow: 2 }}>
              {!answerMode ? (
                <button
                  className="btn-primary w-full font-display text-white border border-red-800 transition-all"
                  style={{ padding: '1.4rem', fontSize: '2.5rem', letterSpacing: '0.1em',
                    background: 'linear-gradient(160deg,#5a0a0a,#b91c1c)',
                    boxShadow: '0 0 20px rgba(185,28,28,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}
                  onClick={openAnswerMode}>
                  回答する »
                </button>
              ) : (
                <>
                  <HudFrame label="回答入力" className="p-4">
                    <label htmlFor="answer-input" className="sr-only">回答を入力</label>
                    <input
                      id="answer-input" ref={answerInputRef}
                      className="w-full bg-black border focus:border-red-600 px-4 py-4 text-white font-terminal outline-none transition-colors"
                      style={{ borderColor: 'rgba(100,100,120,0.6)', fontSize: '2.2rem',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}
                      placeholder="ここに回答を入力"
                      value={answerText}
                      onChange={(e) => { setAnswerText(e.target.value); setCountingActive(false); setLastTypedAt(Date.now()); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(false); } }}
                    />
                  </HudFrame>
                  <button
                    className="btn-primary w-full font-display text-white border border-red-800"
                    style={{ padding: '1.2rem', fontSize: '2.5rem', letterSpacing: '0.1em',
                      background: 'linear-gradient(160deg,#5a0a0a,#b91c1c)',
                      boxShadow: '0 0 20px rgba(185,28,28,0.4)' }}
                    onClick={() => submitAnswer(false)}>
                    回答する »
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {screen === 'feedback' && feedback && (
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', minHeight: '68vh' }}>

            {/* Left: Result */}
            <HudFrame label="結果" accent={feedback.ok ? '#22c55e' : '#dc2626'} className="p-6 flex flex-col">
              {/* Verdict */}
              <div className="flex items-center gap-4 pb-3">
                <span className="text-4xl leading-none">{feedback.ok ? '😄' : '🔥'}</span>
                <div>
                  <p className="font-display" style={{
                    fontSize: '2.2rem', letterSpacing: '0.06em',
                    color: feedback.ok ? '#4ade80' : '#f87171',
                    textShadow: `0 0 20px ${feedback.ok ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'}`,
                  }}>
                    {feedback.ok ? '正解！' : '不正解'}
                  </p>
                  <p className="font-tactical text-zinc-400" style={{ fontSize: '1.8rem' }}>{feedback.comment}</p>
                </div>
              </div>
              <Divider accent={feedback.ok ? '#22c55e' : '#dc2626'} />

              {/* Correct answer */}
              <div className="py-3">
                <p className="font-terminal text-zinc-600 mb-1" style={{ fontSize: '1.16rem', letterSpacing: '0.2em' }}>正答</p>
                <p className="font-tactical font-bold text-white" style={{ fontSize: '2.6rem' }}>{feedback.answer}</p>
                {feedback.alternatives?.length > 0 && (
                  <p className="font-terminal text-zinc-600 mt-0.5" style={{ fontSize: '1.44rem' }}>
                    別解: {feedback.alternatives.join(' / ')}
                  </p>
                )}
              </div>
              <Divider accent={feedback.ok ? '#22c55e40' : '#dc262640'} />

              {/* Explanation — typewriter */}
              <div className="pt-1 flex-1">
                <p className="font-terminal text-zinc-600 mb-2" style={{ fontSize: '1.16rem', letterSpacing: '0.2em' }}>解説</p>
                <p className="font-terminal text-zinc-300 leading-8" style={{ fontSize: '1.7rem' }}>
                  {explanationDisplayed}
                  {feedbackPhase === 'explanation' && <span className="animate-pulse text-zinc-600">█</span>}
                </p>
                {funDisplayed && (
                  <p className="font-terminal italic leading-8 mt-4" style={{ fontSize: '1.7rem', color: '#f87171',
                    textShadow: '0 0 8px rgba(248,113,113,0.3)' }}>
                    {funDisplayed}
                    {feedbackPhase === 'fun' && <span className="animate-pulse">█</span>}
                  </p>
                )}
              </div>
            </HudFrame>

            {/* Right: Answer input (ghost) + NEXT */}
            <div className="flex flex-col gap-4">
              <HudFrame label="回答入力" className="p-4" dim>
                <div className="space-y-3 opacity-40">
                  <input className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-zinc-500 font-terminal outline-none cursor-not-allowed"
                    style={{ fontSize: '1.8rem' }}
                    value={feedback.userAnswer || ''}
                    readOnly />
                  <button disabled className="w-full font-display border border-zinc-800 text-zinc-600 cursor-not-allowed"
                    style={{ padding: '0.65rem', fontSize: '2.4rem', letterSpacing: '0.1em', background: 'rgba(15,15,20,0.6)' }}>
                    回答する »
                  </button>
                </div>
              </HudFrame>

              <HudFrame className="p-5 flex-1 flex flex-col items-center justify-center gap-4">
                <p className="font-terminal text-zinc-700 text-center" style={{ fontSize: '1.24rem', letterSpacing: '0.15em' }}>
                  {feedbackPhase !== 'done' ? '解説を読んでいます...' : '準備完了'}
                </p>
                <button
                  className="btn-primary w-full font-display border transition-all"
                  style={{ padding: '1rem', fontSize: '2.8rem', letterSpacing: '0.1em',
                    borderColor: 'rgba(100,100,120,0.5)', background: 'rgba(18,18,24,0.8)', color: '#a1a1aa' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.6)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(100,100,120,0.5)'; e.currentTarget.style.color = '#a1a1aa'; }}
                  onClick={goNextAfterFeedback}>
                  NEXT →
                </button>
              </HudFrame>
            </div>
          </div>
        )}

        {/* ── SEGMENT ── */}
        {screen === 'segment' && (
          <div className="flex flex-col items-center min-h-[70vh] pt-8 space-y-6">
            <HudFrame label="Block Complete" accent="#dc2626"
              className="w-full max-w-2xl p-10 text-center space-y-4"
              style={{ background: 'rgba(10,5,5,0.9)' }}>
              <p className="text-5xl leading-none">{segmentSummary.emoji}</p>
              <h2 className="font-display text-white" style={{ fontSize: '2.5rem', letterSpacing: '0.08em' }}>{segmentSummary.title}</h2>
              <p className="font-tactical text-zinc-500">{segmentSummary.message}</p>
            </HudFrame>

            <div className="w-full max-w-2xl grid grid-cols-3 gap-3">
              {[
                { label: 'このブロック', value: `${results.slice(currentSegmentStart, currentSegmentEnd).filter((r) => r?.correct).length} / ${currentSegmentEnd - currentSegmentStart}` },
                { label: '累計正解', value: `${correctCount} / ${Math.min(currentIndex + 1, totalQuestions)}` },
                { label: 'RANK', value: overallRank },
              ].map(({ label, value }) => (
                <HudFrame key={label} className="p-4 text-center">
                  <p className="font-terminal text-zinc-600 mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.12em' }}>{label}</p>
                  <p className="font-display text-white" style={{ fontSize: '1.8rem' }}>{value}</p>
                </HudFrame>
              ))}
            </div>

            <div className="w-full max-w-2xl flex gap-3">
              <button className="btn-primary flex-1 font-display text-white border border-red-800"
                style={{ padding: '1rem', fontSize: '1.3rem', letterSpacing: '0.1em',
                  background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', boxShadow: '0 0 25px rgba(185,28,28,0.4)' }}
                onClick={goToNextBlock}>
                🔥 NEXT {SEGMENT_SIZE} QUESTIONS
              </button>
              <button className="font-display border border-zinc-700 hover:border-zinc-500 transition-colors"
                style={{ padding: '1rem 1.5rem', fontSize: '1.1rem', letterSpacing: '0.08em',
                  background: 'rgba(15,15,20,0.8)', color: '#71717a' }}
                onClick={() => { setResults([]); startQuestion(0); setScreen('start'); }}>
                ← MENU
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {screen === 'done' && (
          <div className="flex flex-col items-center min-h-[70vh] pt-8 space-y-6">
            <HudFrame label="Battle Complete" accent="#dc2626"
              className="w-full max-w-2xl py-14 text-center space-y-5"
              style={{ background: 'rgba(5,5,8,0.95)' }}>
              <p className="font-terminal text-red-800 uppercase tracking-widest" style={{ fontSize: '0.6rem', letterSpacing: '0.4em' }}>
                ▸ Battle Complete ◂
              </p>
              <h2 className="font-display" style={{ fontSize: 'clamp(3rem,8vw,5.5rem)', letterSpacing: '0.1em',
                textShadow: '0 0 40px rgba(127,29,29,0.5)' }}>GAME OVER</h2>
              <p className="font-tactical text-zinc-500" style={{ fontSize: '1.1rem' }}>{correctCount} / {totalQuestions} 正解</p>
              <div className="inline-block mt-2">
                <RankBadge rank={overallRank} size={130} />
              </div>
            </HudFrame>

            <div className="w-full max-w-2xl">
              <HudFrame label="Block Summary" className="p-5">
                <div className="grid gap-2 grid-cols-2 xl:grid-cols-3 mt-2">
                  {Array.from({ length: blockCount }, (_, block) => {
                    const s = block * SEGMENT_SIZE; const e = Math.min(s + SEGMENT_SIZE, totalQuestions);
                    const good = results.slice(s, e).filter((r) => r?.correct).length;
                    const rate = good / (e - s);
                    return (
                      <div key={block} className="flex items-center justify-between border border-zinc-800/50 px-3 py-2">
                        <span className="font-terminal text-zinc-600" style={{ fontSize: '0.7rem' }}>BLOCK {block + 1}</span>
                        <span className="font-display" style={{ fontSize: '1.1rem',
                          color: rate >= 0.7 ? '#4ade80' : rate >= 0.5 ? '#facc15' : '#f87171' }}>
                          {good} / {e - s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </HudFrame>
            </div>

            <button className="btn-primary w-full max-w-2xl font-display text-white border border-red-800"
              style={{ padding: '1rem', fontSize: '1.4rem', letterSpacing: '0.12em',
                background: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', boxShadow: '0 0 25px rgba(185,28,28,0.4)' }}
              onClick={restart}>
              🔥 PLAY AGAIN
            </button>
          </div>
        )}
      </main>

      {/* ── Facecam (fixed bottom-left) ── */}
      <div className="fixed bottom-4 left-4 z-50 overflow-hidden"
        style={{ width: 456, border: '1px solid #7f1d1d',
          boxShadow: '0 0 25px rgba(127,29,29,0.5), 0 0 60px rgba(127,29,29,0.12), inset 0 0 0 1px rgba(220,38,38,0.07)' }}>
        {/* Corner decorations */}
        {[{top:-1,left:-1,borderWidth:'2px 0 0 2px'},{top:-1,right:-1,borderWidth:'2px 2px 0 0'},
          {bottom:-1,left:-1,borderWidth:'0 0 2px 2px'},{bottom:-1,right:-1,borderWidth:'0 2px 2px 0'}
        ].map((pos,i) => (
          <div key={i} className="absolute pointer-events-none"
            style={{ ...pos, width:14, height:14, borderColor:'#ef4444', borderStyle:'solid', borderWidth:pos.borderWidth }} />
        ))}
        <div className="flex items-center justify-between px-4 py-2"
          style={{ background: 'linear-gradient(90deg,rgba(127,29,29,0.85),rgba(80,15,15,0.85))' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"
              style={{ boxShadow: '0 0 8px rgba(248,113,113,1)' }} />
            <span className="font-terminal text-red-200 uppercase tracking-widest" style={{ fontSize: '1.16rem' }}>Player Cam</span>
          </div>
          <span className="font-terminal text-red-700" style={{ fontSize: '1.04rem' }}>● REC</span>
        </div>
        <div className="flex items-center justify-center bg-black" style={{ height: 340 }}>
          <span className="font-terminal text-zinc-800 tracking-widest" style={{ fontSize: '1.24rem' }}>[ CAMERA ]</span>
        </div>
        <div className="flex justify-between items-center px-4 py-1.5"
          style={{ background: 'rgba(5,5,8,0.9)', borderTop: '1px solid rgba(127,29,29,0.25)' }}>
          <span className="font-terminal text-zinc-800" style={{ fontSize: '1.04rem' }}>TACTICAL LUCK</span>
          <span className="font-terminal text-red-900" style={{ fontSize: '1.04rem' }}>LIVE</span>
        </div>
      </div>
    </div>
  );
}
