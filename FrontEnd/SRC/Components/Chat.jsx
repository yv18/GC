import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import socket from './socket.js';

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL AVATAR ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = [...(seed || '?')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x12345678);
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
}
const PALETTES = [
  ['#6366f1','#818cf8','#c7d2fe','#1e1b4b'],
  ['#ec4899','#f472b6','#fce7f3','#500724'],
  ['#10b981','#34d399','#d1fae5','#064e3b'],
  ['#f59e0b','#fbbf24','#fef3c7','#451a03'],
  ['#3b82f6','#60a5fa','#dbeafe','#1e3a8a'],
  ['#8b5cf6','#a78bfa','#ede9fe','#2e1065'],
  ['#ef4444','#f87171','#fee2e2','#450a0a'],
  ['#14b8a6','#2dd4bf','#ccfbf1','#042f2e'],
  ['#f97316','#fb923c','#ffedd5','#431407'],
  ['#06b6d4','#22d3ee','#cffafe','#0c4a6e'],
];
function buildPixelGrid(name) {
  const rng = seededRng(name);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const grid = [];
  for (let r = 0; r < 8; r++) {
    const half = [];
    for (let c = 0; c < 4; c++) {
      const v = rng();
      half.push(v < .30 ? pal[3] : v < .60 ? pal[0] : v < .80 ? pal[1] : v < .92 ? pal[2] : 'transparent');
    }
    grid.push([...half, ...[...half].reverse()]);
  }
  return { grid, pal };
}
function PixelAvatar({ name, size = 32, ring = false, ghost = false }) {
  const { grid, pal } = buildPixelGrid(name || '?');
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, overflow: 'hidden',
      imageRendering: 'pixelated', background: pal[3], flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px ${pal[0]}, 0 0 12px ${pal[0]}55` : undefined,
      opacity: ghost ? 0.4 : 1, filter: ghost ? 'grayscale(1)' : undefined,
    }}>
      <svg width={size} height={size} viewBox="0 0 8 8" style={{ imageRendering: 'pixelated', display: 'block' }}>
        {grid.map((row, r) => row.map((col, c) =>
          col !== 'transparent' ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={col} /> : null
        ))}
      </svg>
    </div>
  );
}
function accentColor(name) {
  const rng = seededRng(name || '?');
  return PALETTES[Math.floor(rng() * PALETTES.length)][0];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const EMOJIS = ['👍','❤️','😂','😮','🔥','💯','👏','😢','🎉','💀'];
const STATUSES = [
  { value: 'online',   label: 'Online',   color: '#34d399', icon: '🟢' },
  { value: 'coding',   label: 'Coding',   color: '#60a5fa', icon: '👨‍💻' },
  { value: 'gaming',   label: 'Gaming',   color: '#a78bfa', icon: '🎮' },
  { value: 'music',    label: 'Music',    color: '#f472b6', icon: '🎵' },
  { value: 'afk',      label: 'AFK',      color: '#94a3b8', icon: '😴' },
  { value: 'busy',     label: 'Busy',     color: '#f87171', icon: '🔴' },
];
const CONSEQUENCE_RULES = [
  { trigger: /fuck|shit|damn/i,  effect: 'flip',   msg: '🙃 Watch your language!' },
  { trigger: /lol|haha|hehe/i,   effect: 'rainbow', msg: '🌈 Laughing activated rainbow mode!' },
  { trigger: /spam|spam|spam/i,  effect: 'tiny',   msg: '🤏 Spammers get tiny text!' },
];
const BANNED_WORDS_DEFAULT = ['spam'];
const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
];

const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
let _id = 0;
const makeId = () => `msg_${Date.now()}_${_id++}`;

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI COMPONENT (Cinematic Moment)
// ─────────────────────────────────────────────────────────────────────────────
function Confetti({ onDone }) {
  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316'][i % 6],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random(),
  })), []);

  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -20,
          width: p.size, height: p.size, borderRadius: 2,
          background: p.color,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTION PICKER — fixed: uses pointer events, not hover
// ─────────────────────────────────────────────────────────────────────────────
function ReactionPicker({ onPick, onClose, isMe }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 50,
      bottom: 'calc(100% + 6px)',
      [isMe ? 'right' : 'left']: 0,
      background: '#1a1b2e',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 18, padding: '6px 8px',
      display: 'flex', gap: 2,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      flexWrap: 'wrap', maxWidth: 260,
    }}>
      {EMOJIS.map(e => (
        <button key={e}
          onPointerDown={(ev) => { ev.stopPropagation(); onPick(e); onClose(); }}
          style={{
            width: 36, height: 36, fontSize: 20, background: 'transparent',
            border: 'none', cursor: 'pointer', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s, background 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
        >{e}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, showName, onReact, onImageClick, myUsername, isSpectator, cinematicMsgId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showReactBtn, setShowReactBtn] = useState(false);
  const longPressRef = useRef(null);
  const isCinematic = cinematicMsgId === msg.id;

  const reactions = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

  // Consequence effect on the message
  let effectStyle = {};
  let effectClass = '';
  if (msg.effect === 'flip') effectStyle = { transform: 'scaleY(-1)', display: 'inline-block' };
  if (msg.effect === 'rainbow') effectClass = 'rainbow-text';
  if (msg.effect === 'tiny') effectStyle = { fontSize: 9 };

  const startLP = () => { longPressRef.current = setTimeout(() => setPickerOpen(true), 400); };
  const cancelLP = () => clearTimeout(longPressRef.current);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        flexDirection: isMe ? 'row-reverse' : 'row',
        transition: 'all 0.4s',
        ...(isCinematic ? { transform: 'scale(1.04)', filter: 'drop-shadow(0 0 16px #f59e0b)' } : {}),
      }}
      onMouseEnter={() => !isSpectator && setShowReactBtn(true)}
      onMouseLeave={() => { setShowReactBtn(false); }}
    >
      {/* Avatar */}
      {!isMe && (
        <div style={{ width: 30, flexShrink: 0 }}>
          {showAvatar && <PixelAvatar name={msg.sender} size={28} ghost={msg.isClone} />}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%', position: 'relative' }}>
        {showName && (
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, paddingLeft: 2, color: accentColor(msg.sender) }}>
            {msg.isClone ? `[Auto-${msg.sender}] 🤖` : msg.isAnon ? '👻 Mystery Guest' : msg.sender}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {/* React button */}
          {showReactBtn && !pickerOpen && !isSpectator && (
            <button
              onPointerDown={(e) => { e.stopPropagation(); setPickerOpen(true); }}
              style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                [isMe ? 'left' : 'right']: -34, zIndex: 20,
                width: 26, height: 26, borderRadius: '50%',
                background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff',
              }}
            >😊</button>
          )}

          {pickerOpen && (
            <ReactionPicker
              onPick={(emoji) => onReact(msg.id, emoji)}
              onClose={() => { setPickerOpen(false); setShowReactBtn(false); }}
              isMe={isMe}
            />
          )}

          {/* Bubble */}
          <div
            onTouchStart={!isSpectator ? startLP : undefined}
            onTouchEnd={cancelLP}
            onTouchMove={cancelLP}
            style={{
              padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.55,
              wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              background: msg.isAnon
                ? 'linear-gradient(135deg,#374151,#1f2937)'
                : isMe
                  ? 'linear-gradient(135deg,#6366f1,#9333ea)'
                  : '#1e1f2e',
              color: '#fff',
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
              border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
              opacity: msg.isClone ? 0.75 : 1,
              ...effectStyle,
            }}
          >
            {msg.replyTo && (
              <div style={{
                borderLeft: '2px solid rgba(255,255,255,0.25)', paddingLeft: 8, marginBottom: 6,
                fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
              }}>
                ↩ {msg.replyTo.sender}: {msg.replyTo.message?.slice(0, 60)}
              </div>
            )}
            {msg.translate ? (
              <>
                <span className={effectClass} style={effectStyle}>{msg.message}</span>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontStyle: 'italic' }}>
                  🌐 {msg.translate}
                </div>
              </>
            ) : (
              <span className={effectClass}>{msg.message}</span>
            )}
            {msg.image && (
              <img src={msg.image} alt="shared" onClick={() => onImageClick(msg.image)}
                style={{ maxWidth: 220, borderRadius: 10, marginTop: 6, display: 'block', cursor: 'zoom-in' }} />
            )}
          </div>
        </div>

        {/* Reaction chips */}
        {reactions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
            {reactions.map(([emoji, users]) => (
              <button key={emoji}
                onPointerDown={() => !isSpectator && onReact(msg.id, emoji)}
                title={users.join(', ')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  borderRadius: 99, fontSize: 13, cursor: isSpectator ? 'default' : 'pointer',
                  background: users.includes(myUsername) ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${users.includes(myUsername) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff', transition: 'all 0.15s',
                }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexDirection: isMe ? 'row-reverse' : 'row', paddingLeft: 2 }}>
          <span style={{ fontSize: 10, color: '#334155' }}>{msg.time}</span>
          {isMe && <svg width="11" height="11" viewBox="0 0 20 20" fill="#818cf8"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────────────────────
function NameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: 32, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', padding: 12, background: '#13141f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <PixelAvatar name={name.trim() || 'You'} size={80} ring />
          <div style={{ position: 'absolute', bottom: -8, right: -8, fontSize: 22 }}>👾</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>Join GroupChat</div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Your pixel avatar is unique to your name</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input ref={ref} value={name} maxLength={24}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name.trim(), lang)}
            placeholder="Your name…"
            style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', background: '#13141f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <button disabled={!name.trim()} onClick={() => onSubmit(name.trim(), lang)}
            style={{ width: '100%', padding: 13, borderRadius: 12, background: name.trim() ? 'linear-gradient(135deg,#6366f1,#9333ea)' : 'rgba(255,255,255,0.05)', color: name.trim() ? '#fff' : '#334155', fontWeight: 600, fontSize: 15, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
            Enter Chat →
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomModal({ onClose, onJoin, onCreate, username }) {
  const [tab, setTab] = useState('join'); // join | create | browse
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [spectator, setSpectator] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.emit('list rooms');
    socket.on('room list', setPublicRooms);
    socket.on('room created', (data) => setCreated(data));
    socket.on('error', (msg) => setError(msg));
    return () => { socket.off('room list'); socket.off('room created'); socket.off('error'); };
  }, []);

  const handleCreate = () => {
    if (!roomName.trim()) return;
    socket.emit('create room', { name: roomName.trim(), password: roomPass, username });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: 28, width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>🏠 Rooms</div>
          <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[['join','🔑 Join'],['create','✨ Create'],['browse','🌍 Browse']].map(([t, l]) => (
            <button key={t} onClick={() => { setTab(t); setError(''); setCreated(null); }}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: tab === t ? '#a5b4fc' : '#64748b', transition: 'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Join tab */}
        {tab === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Room code (e.g. AB12CD)" maxLength={6}
              style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 16, outline: 'none', fontFamily: 'monospace', letterSpacing: 4 }} />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (if required)"
              type="password"
              style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>
              <input type="checkbox" checked={spectator} onChange={e => setSpectator(e.target.checked)} />
              👁️ Join as Spectator (invisible — read only)
            </label>
            <button disabled={code.length < 4} onClick={() => onJoin(code, password, spectator)}
              style={{ padding: 13, borderRadius: 12, background: code.length >= 4 ? 'linear-gradient(135deg,#6366f1,#9333ea)' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, border: 'none', cursor: code.length >= 4 ? 'pointer' : 'not-allowed' }}>
              Join Room
            </button>
          </div>
        )}

        {/* Create tab */}
        {tab === 'create' && !created && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name…" maxLength={30}
              style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 16, outline: 'none' }} />
            <input value={roomPass} onChange={e => setRoomPass(e.target.value)} placeholder="Password (optional)" type="password"
              style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }} />
            <button disabled={!roomName.trim()} onClick={handleCreate}
              style={{ padding: 13, borderRadius: 12, background: roomName.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, border: 'none', cursor: roomName.trim() ? 'pointer' : 'not-allowed' }}>
              Create Private Room
            </button>
          </div>
        )}

        {tab === 'create' && created && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{created.name}</div>
            <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '16px 24px' }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Room Code</div>
              <div style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: 8, fontFamily: 'monospace' }}>{created.roomId}</div>
            </div>
            <div style={{ color: '#64748b', fontSize: 12 }}>Share this code with your friends</div>
            <button onClick={() => onJoin(created.roomId, roomPass, false)}
              style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Enter Room →
            </button>
          </div>
        )}

        {/* Browse tab */}
        {tab === 'browse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {publicRooms.length === 0 && <div style={{ color: '#475569', textAlign: 'center', padding: 20 }}>No public rooms yet</div>}
            {publicRooms.map(r => (
              <div key={r.id} onClick={() => onJoin(r.id, '', false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>#{r.name}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{r.count} online</div>
                </div>
                <div style={{ color: '#6366f1', fontSize: 12, fontWeight: 600 }}>Join →</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIBE BOARD PANEL
// ─────────────────────────────────────────────────────────────────────────────
function VibeBoard({ items, onDrop, onClose }) {
  const [url, setUrl] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>🎨 Vibe Board</div>
          <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste GIF or image URL…"
            style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none' }} />
          <button onClick={() => { if (url.trim()) { onDrop(url.trim()); setUrl(''); } }}
            style={{ padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Drop
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, overflowY: 'auto' }}>
          {items.map(item => (
            <div key={item.id} style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
              <img src={item.url} alt="vibe" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
              <div style={{ padding: '4px 8px', fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>by {item.sender}</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ color: '#334155', fontSize: 13, gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>No vibes yet — drop something!</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CHAT
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
  const [sender,       setSender]       = useState('');
  const [userLang,     setUserLang]     = useState('en');
  const [nameReady,    setNameReady]    = useState(false);
  const [message,      setMessage]      = useState('');
  const [messages,     setMessages]     = useState([]);
  const [typingUsers,  setTypingUsers]  = useState([]);
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [showSidebar,  setShowSidebar]  = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxSrc,  setLightboxSrc]  = useState(null);
  const [isSpectator,  setIsSpectator]  = useState(false);
  const [currentRoom,  setCurrentRoom]  = useState('general');
  const [roomName,     setRoomName]     = useState('General');
  const [showRoomModal,setShowRoomModal]= useState(false);
  const [showVibe,     setShowVibe]     = useState(false);
  const [vibeItems,    setVibeItems]    = useState([]);
  const [myStatus,     setMyStatus]     = useState('online');
  const [showStatus,   setShowStatus]   = useState(false);
  const [cinematicId,  setCinematicId]  = useState(null);
  const [confetti,     setConfetti]     = useState(false);
  const [notification, setNotification] = useState(null);
  const [anonMode,     setAnonMode]     = useState(false);
  const [unread,       setUnread]       = useState(0);

  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const typingTimerRef  = useRef(null);
  const senderRef       = useRef('');
  const cinematicRef    = useRef({});  // msgId -> timestamps of reactions

  useEffect(() => { senderRef.current = sender; }, [sender]);

  // ── Translate via MyMemory (free API, no key needed) ─────────────────────
  const translateText = useCallback(async (text, targetLang) => {
    if (targetLang === 'en') return null;
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
      const data = await res.json();
      const t = data?.responseData?.translatedText;
      return t && t !== text ? t : null;
    } catch { return null; }
  }, []);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('chat history', async (history) => {
      const msgs = (history || []).map(m => ({ ...m, id: m.id || makeId(), reactions: m.reactions || {} }));
      setMessages(msgs);
    });

    socket.on('chat message', async (data) => {
      const msg = { ...data, id: data.id || makeId(), reactions: data.reactions || {} };

      // Smart notification — only ping if mentioned or DM
      const myName = senderRef.current;
      const mentionsMe = msg.message?.toLowerCase().includes(myName.toLowerCase());
      if (data.sender !== myName) {
        if (mentionsMe) {
          setNotification(`📣 ${data.sender} mentioned you!`);
          setTimeout(() => setNotification(null), 4000);
          if (Notification.permission === 'granted') {
            new Notification(`${data.sender} mentioned you`, { body: msg.message, silent: false });
          }
        }
        setUnread(u => u + 1);
      }

      // Auto-translate incoming if user has non-English lang
      const lang = userLangRef.current;
      if (lang && lang !== 'en' && msg.message) {
        const translated = await translateText(msg.message, lang);
        if (translated) msg.translate = translated;
      }

      setMessages(prev => [...prev, msg]);
    });

    // Fixed reaction: server sends full reactions object
    socket.on('reaction update', ({ msgId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    });

    socket.on('typing', ({ sender: s }) => {
      if (s !== senderRef.current)
        setTypingUsers(prev => prev.includes(s) ? prev : [...prev, s]);
    });
    socket.on('stop typing', ({ sender: s }) => {
      setTypingUsers(prev => prev.filter(u => u !== s));
    });

    socket.on('user list', setOnlineUsers);
    socket.on('vibe board', setVibeItems);

    socket.on('cinematic moment', ({ msgId }) => {
      setCinematicId(msgId);
      setConfetti(true);
      setTimeout(() => setCinematicId(null), 4000);
    });

    socket.on('room joined', ({ room, name, spectator }) => {
      setCurrentRoom(room);
      setRoomName(name);
      setIsSpectator(spectator);
      setMessages([]);
      setShowRoomModal(false);
    });

    const onPaste = (e) => {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const r = new FileReader();
          r.onload = ev => setImagePreview(ev.target.result);
          r.readAsDataURL(item.getAsFile());
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);

    return () => {
      ['connect','disconnect','chat history','chat message','reaction update',
       'typing','stop typing','user list','vibe board','cinematic moment','room joined','error']
        .forEach(e => socket.off(e));
      window.removeEventListener('paste', onPaste);
    };
  }, [translateText]);

  const userLangRef = useRef(userLang);
  useEffect(() => { userLangRef.current = userLang; }, [userLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnread(0);
  }, [messages]);

  // ── Join chat ─────────────────────────────────────────────────────────────
  const joinChat = useCallback((name, lang) => {
    setSender(name);
    setUserLang(lang);
    userLangRef.current = lang;
    setNameReady(true);
    sessionStorage.setItem('gc_sender', name);
    sessionStorage.setItem('gc_lang', lang);
    socket.emit('join', { username: name, room: 'general' });
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem('gc_sender');
    const l = sessionStorage.getItem('gc_lang') || 'en';
    if (s) joinChat(s, l);
  }, [joinChat]);

  // ── Join room ─────────────────────────────────────────────────────────────
  const joinRoom = useCallback((roomId, password, spectator) => {
    socket.emit('join', { username: sender, room: roomId, password, spectator });
  }, [sender]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (isSpectator) return;
    if (imagePreview) {
      socket.emit('chat message', { id: makeId(), sender, image: imagePreview, time: formatTime(), reactions: {}, isAnon: anonMode });
      setImagePreview(null); return;
    }
    const text = message.trim();
    if (!text) return;

    // Consequence engine
    let effect = null;
    for (const rule of CONSEQUENCE_RULES) {
      if (rule.trigger.test(text)) { effect = rule.effect; break; }
    }

    const msg = {
      id: makeId(), sender: anonMode ? 'Anonymous' : sender,
      message: text, time: formatTime(),
      reactions: {}, effect, isAnon: anonMode,
    };
    socket.emit('chat message', msg);
    setMessage('');
    clearTimeout(typingTimerRef.current);
    socket.emit('stop typing', { sender });
  }, [message, sender, imagePreview, anonMode, isSpectator]);

  // ── React — optimistic update + server sync ───────────────────────────────
  const handleReact = useCallback((msgId, emoji) => {
    if (isSpectator) return;
    // Optimistic local update
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const r = { ...m.reactions };
      if (!r[emoji]) r[emoji] = [];
      const idx = r[emoji].indexOf(sender);
      r[emoji] = idx === -1 ? [...r[emoji], sender] : r[emoji].filter(u => u !== sender);
      return { ...m, reactions: r };
    }));
    socket.emit('reaction', { msgId, emoji, user: sender });

    // Check for cinematic moment (5 reactions in 10s on same msg)
    if (!cinematicRef.current[msgId]) cinematicRef.current[msgId] = [];
    cinematicRef.current[msgId].push(Date.now());
    const recent = cinematicRef.current[msgId].filter(t => Date.now() - t < 10000);
    cinematicRef.current[msgId] = recent;
    if (recent.length >= 5) {
      socket.emit('cinematic check', { msgId });
      cinematicRef.current[msgId] = [];
    }
  }, [sender, isSpectator]);

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { sender });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket.emit('stop typing', { sender }), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === 'Escape') setImagePreview(null);
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => setImagePreview(ev.target.result);
    r.readAsDataURL(f);
    e.target.value = '';
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const updateStatus = (s) => {
    setMyStatus(s);
    setShowStatus(false);
    socket.emit('status', { status: s });
  };

  // ── Vibe drop ─────────────────────────────────────────────────────────────
  const handleVibeDrop = (url) => {
    socket.emit('vibe drop', { url, sender });
  };

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing…`
    : typingUsers.length > 1 ? `${typingUsers.slice(0,2).join(' & ')} are typing…` : '';

  const statusObj = STATUSES.find(s => s.value === myStatus) || STATUSES[0];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (!nameReady) return <NameModal onSubmit={joinChat} />;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0d0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-text-size-adjust: 100%; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes cinematicPop { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        .rainbow-text { background: linear-gradient(90deg,#f97316,#ec4899,#8b5cf6,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .msg-in { animation: slideIn 0.2s ease both; }
        .bounce-dot { animation: bounce 1s infinite; }
      `}</style>

      {/* Confetti */}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      {/* Smart notification toast */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: '#1a1b2e', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 14, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideIn 0.2s ease', whiteSpace: 'nowrap' }}>
          {notification}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div onClick={() => setLightboxSrc(null)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightboxSrc} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16 }} />
        </div>
      )}

      {/* Room modal */}
      {showRoomModal && (
        <RoomModal username={sender} onClose={() => setShowRoomModal(false)} onJoin={joinRoom}
          onCreate={(name, pass) => socket.emit('create room', { name, password: pass, username: sender })} />
      )}

      {/* Vibe board */}
      {showVibe && <VibeBoard items={vibeItems} onDrop={handleVibeDrop} onClose={() => setShowVibe(false)} />}

      {/* Status picker */}
      {showStatus && (
        <div onClick={() => setShowStatus(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 12, bottom: 80, background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => updateStatus(s.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: myStatus === s.value ? 'rgba(99,102,241,0.2)' : 'transparent', border: 'none', cursor: 'pointer', color: s.color, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
                <span>{s.icon}</span><span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* App shell */}
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0e1a', height: '100dvh' }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', overflow: 'hidden',
          background: '#13141f', border: '1px solid rgba(255,255,255,0.05)',
          ...(window.matchMedia('(min-width:768px)').matches ? { maxWidth: 960, height: '92vh', borderRadius: 22, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' } : {}),
        }}>

          {/* Mobile sidebar overlay */}
          {showSidebar && <div onClick={() => setShowSidebar(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.6)' }} />}

          {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
          <aside style={{
            width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: '#161728', borderRight: '1px solid rgba(255,255,255,0.05)',
            position: window.matchMedia('(min-width:768px)').matches ? 'relative' : 'absolute',
            top: 0, bottom: 0, left: 0, zIndex: 40,
            transform: (window.matchMedia('(min-width:768px)').matches || showSidebar) ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>👾</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>GroupChat</div>
                  <div style={{ color: '#475569', fontSize: 10 }}>#{roomName}</div>
                </div>
              </div>
              <button onClick={() => setShowSidebar(false)} style={{ display: window.matchMedia('(min-width:768px)').matches ? 'none' : 'flex', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>✕</button>
            </div>

            {/* Room button */}
            <button onClick={() => setShowRoomModal(true)} style={{ margin: '12px 12px 0', padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}>
              🏠 <span>Rooms</span>
              <span style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.3)', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>{currentRoom === 'general' ? 'General' : 'Private'}</span>
            </button>

            {/* Vibe board button */}
            <button onClick={() => setShowVibe(true)} style={{ margin: '6px 12px 0', padding: '10px 14px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 14, color: '#f472b6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(236,72,153,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(236,72,153,0.08)'}>
              🎨 <span>Vibe Board</span>
              {vibeItems.length > 0 && <span style={{ marginLeft: 'auto', background: 'rgba(236,72,153,0.3)', borderRadius: 6, padding: '1px 6px', fontSize: 10 }}>{vibeItems.length}</span>}
            </button>

            {/* You */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>You</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <PixelAvatar name={sender} size={34} ring ghost={isSpectator} />
                  <button onClick={() => setShowStatus(s => !s)} title="Set status"
                    style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: statusObj.color, border: '2px solid #161728', cursor: 'pointer', padding: 0 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {sender}
                    {isSpectator && <span style={{ fontSize: 10, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', padding: '1px 6px', borderRadius: 6 }}>👁 Spectator</span>}
                    {anonMode && <span style={{ fontSize: 10, background: 'rgba(107,114,128,0.2)', color: '#9ca3af', padding: '1px 6px', borderRadius: 6 }}>👻 Anon</span>}
                  </div>
                  <div style={{ fontSize: 11, color: statusObj.color }}>{statusObj.icon} {statusObj.label}</div>
                </div>
              </div>
            </div>

            {/* Online users */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Online — {onlineUsers.filter(u => !u.spectator).length}</div>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
              </div>
              {onlineUsers.map((user, i) => {
                const st = STATUSES.find(s => s.value === user.status) || STATUSES[0];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 12, marginBottom: 2 }}>
                    <div style={{ position: 'relative' }}>
                      <PixelAvatar name={user.username} size={30} ghost={user.spectator} />
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: st.color, border: '2px solid #161728' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 500, truncate: true }}>{user.username}{user.spectator ? ' 👁' : ''}</div>
                      <div style={{ fontSize: 10, color: st.color }}>{st.icon} {st.label}</div>
                    </div>
                  </div>
                );
              })}
              {onlineUsers.length === 0 && <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: 16 }}>No one else here yet</div>}
            </div>
          </aside>

          {/* ── MAIN ──────────────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#161728', flexShrink: 0 }}>
              <button onClick={() => setShowSidebar(true)} style={{ display: window.matchMedia('(min-width:768px)').matches ? 'none' : 'flex', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, flexShrink: 0 }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>👾</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>#{roomName}</div>
                <div style={{ fontSize: 11, color: typingLabel ? '#f59e0b' : '#475569', fontStyle: typingLabel ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typingLabel || `${onlineUsers.length} online`}
                </div>
              </div>

              {/* Anon toggle */}
              {!isSpectator && (
                <button onClick={() => setAnonMode(a => !a)} title="Toggle anonymous mode"
                  style={{ padding: '5px 10px', borderRadius: 10, background: anonMode ? 'rgba(107,114,128,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${anonMode ? 'rgba(107,114,128,0.4)' : 'rgba(255,255,255,0.08)'}`, color: anonMode ? '#d1d5db' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  👻
                </button>
              )}

              {/* Lang selector */}
              <select value={userLang} onChange={e => setUserLang(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: 10, background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 11, cursor: 'pointer', flexShrink: 0, maxWidth: 80 }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>

              {/* Connection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', color: connected ? '#34d399' : '#f87171', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#34d399' : '#f87171', animation: connected ? 'pulse 2s infinite' : 'none' }} />
                {connected ? 'Live' : 'Off'}
              </div>
            </header>

            {/* Spectator banner */}
            {isSpectator && (
              <div style={{ background: 'rgba(148,163,184,0.08)', borderBottom: '1px solid rgba(148,163,184,0.1)', padding: '8px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                👁 You are in Spectator Mode — invisible to others, read-only
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
              {messages.length === 0 && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', userSelect: 'none' }}>
                  <div style={{ fontSize: 48, opacity: 0.25 }}>👾</div>
                  <div style={{ color: '#475569', fontSize: 14 }}>No messages yet — say hello!</div>
                  <div style={{ color: '#334155', fontSize: 12 }}>Hover a message to react · 5 reactions = 🎉 cinematic moment</div>
                  <div style={{ color: '#334155', fontSize: 12 }}>👻 Anon mode · 🌐 Auto-translate · 🏠 Private rooms</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, idx) => {
                  const isMe    = msg.sender === sender || (msg.isAnon && anonMode && msg.senderReal === sender);
                  const prev    = messages[idx - 1];
                  const showAv  = !isMe && msg.sender !== prev?.sender;
                  const gap     = idx > 0 && msg.sender === prev?.sender ? 2 : 12;
                  return (
                    <div key={msg.id || idx} className="msg-in" style={{ marginTop: gap }}>
                      <MessageBubble
                        msg={msg} isMe={isMe}
                        showAvatar={showAv} showName={showAv && !isMe}
                        onReact={handleReact} onImageClick={setLightboxSrc}
                        myUsername={sender} isSpectator={isSpectator}
                        cinematicMsgId={cinematicId}
                      />
                    </div>
                  );
                })}

                {/* Typing */}
                {typingLabel && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 12 }}>
                    <div style={{ width: 30, flexShrink: 0 }} />
                    <div style={{ background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, borderBottomLeftRadius: 4, padding: '10px 14px', display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} className="bounce-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569', animationDelay: `${i*150}ms` }} />)}
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div style={{ margin: '0 16px 8px', padding: '10px 12px', background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <img src={imagePreview} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Image ready</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>Enter to send · Esc to cancel</div>
                </div>
                <button onClick={() => setImagePreview(null)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, flexShrink: 0 }}>✕</button>
              </div>
            )}

            {/* Input bar */}
            {!isSpectator && (
              <div style={{ padding: '8px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', background: '#161728', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 8px 6px 14px', transition: 'border-color 0.2s' }}
                  onFocus={() => {}} >
                  {/* Attach */}
                  <label style={{ color: '#475569', cursor: 'pointer', display: 'flex', padding: '6px', borderRadius: 8, flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
                  </label>

                  <input ref={inputRef} type="text" value={message}
                    onChange={handleTyping} onKeyDown={handleKeyDown}
                    placeholder={imagePreview ? 'Image attached…' : anonMode ? '👻 Sending anonymously…' : 'Message the group…'}
                    disabled={!!imagePreview}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 16, padding: '4px 0', minWidth: 0 }} />

                  <button onClick={sendMessage} disabled={!message.trim() && !imagePreview}
                    style={{ width: 36, height: 36, borderRadius: 12, border: 'none', cursor: (!message.trim() && !imagePreview) ? 'not-allowed' : 'pointer', background: (!message.trim() && !imagePreview) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', opacity: (!message.trim() && !imagePreview) ? 0.3 : 1 }}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: 10, color: '#1e293b', marginTop: 5, userSelect: 'none' }}>
                  Hover to react 😊 · 5 reactions = 🎉 · 👻 anon · 🌐 auto-translate
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
