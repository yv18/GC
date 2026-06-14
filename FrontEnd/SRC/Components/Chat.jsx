import React, { useEffect, useState, useRef, useCallback } from 'react';
import socket from './socket.js';

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL AVATAR — deterministic 8×8 sprite from username seed
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
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
  const [primary, secondary, highlight, dark] = palette;
  const grid = [];
  for (let r = 0; r < 8; r++) {
    const half = [];
    for (let c = 0; c < 4; c++) {
      const v = rng();
      half.push(v < 0.30 ? dark : v < 0.60 ? primary : v < 0.80 ? secondary : v < 0.92 ? highlight : 'transparent');
    }
    grid.push([...half, ...[...half].reverse()]);
  }
  return { grid, palette };
}

function PixelAvatar({ name, size = 32, ring = false }) {
  const { grid, palette } = buildPixelGrid(name || '?');
  const [dark] = [palette[3]];
  return (
    <div
      className="flex-shrink-0 select-none"
      style={{
        width: size, height: size,
        borderRadius: 4,
        overflow: 'hidden',
        imageRendering: 'pixelated',
        background: dark,
        boxShadow: ring ? `0 0 0 2px ${palette[0]}` : undefined,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 8 8" style={{ imageRendering: 'pixelated', display: 'block' }}>
        {grid.map((row, r) => row.map((color, c) =>
          color !== 'transparent'
            ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
            : null
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
// STREAK BADGE
// ─────────────────────────────────────────────────────────────────────────────
const STREAK_TIMEOUT = 45;

function StreakBadge({ streak, secondsLeft, compact = false }) {
  const pct  = Math.max(0, secondsLeft / STREAK_TIMEOUT);
  const hot  = streak >= 10;
  const warm = streak >= 5;
  const col  = hot ? '#f97316' : warm ? '#f59e0b' : '#6366f1';

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ background: `${col}20`, color: col, border: `1px solid ${col}30` }}>
        <span style={{ filter: hot ? 'drop-shadow(0 0 3px #f97316)' : 'none' }}>🔥</span>
        <span>{streak}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-2xl" style={{ filter: hot ? 'drop-shadow(0 0 6px #f97316)' : 'none' }}>🔥</span>
        <div>
          <p className="text-white font-bold text-base leading-none">{streak} message{streak !== 1 ? 's' : ''}</p>
          <p className="text-xs mt-0.5" style={{ color: col }}>
            {hot ? 'ON FIRE! 🔥' : warm ? 'Heating up!' : 'Keep it going!'}
          </p>
        </div>
      </div>
      {/* Burn timer bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${col}, ${col}aa)` }}
        />
      </div>
      <p className="text-[10px] text-slate-600">{Math.round(secondsLeft)}s until streak resets</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTION PICKER
// ─────────────────────────────────────────────────────────────────────────────
const EMOJIS = ['👍','❤️','😂','😮','🔥','💯','👏','😢'];

function ReactionPicker({ onPick, isMe }) {
  return (
    <div
      className="absolute z-30 bottom-full mb-2 bg-[#252638] border border-white/10 rounded-2xl px-2 py-1.5 flex gap-0.5 shadow-2xl"
      style={{ [isMe ? 'right' : 'left']: 0 }}
      onMouseDown={e => e.preventDefault()} // keep focus in input
    >
      {EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-transform rounded-lg hover:bg-white/10"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, showName, onReact, onImageClick }) {
  const [open, setOpen]       = useState(false);
  const [hovered, setHovered] = useState(false);
  const longPressRef          = useRef(null);
  const reactions             = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);

  // Long-press for mobile
  const startLongPress = () => {
    longPressRef.current = setTimeout(() => setOpen(true), 450);
  };
  const cancelLongPress = () => clearTimeout(longPressRef.current);

  return (
    <div
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setOpen(false); }}
    >
      {/* Avatar */}
      {!isMe && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatar && <PixelAvatar name={msg.sender} size={28} />}
        </div>
      )}

      <div className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[78%] sm:max-w-[62%]`}>
        {showName && (
          <p className="text-[11px] font-semibold mb-1 px-1" style={{ color: accentColor(msg.sender) }}>
            {msg.sender}
          </p>
        )}

        <div className="relative">
          {/* Hover react button — desktop */}
          {hovered && !open && (
            <button
              onClick={() => setOpen(true)}
              className={`absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-[#252638] border border-white/10 flex items-center justify-center text-xs hover:scale-110 transition-all ${isMe ? '-left-9' : '-right-9'}`}
            >😊</button>
          )}

          {/* Picker */}
          {open && <ReactionPicker onPick={e => { onReact(msg.id, e); setOpen(false); }} isMe={isMe} />}

          {/* Bubble */}
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed cursor-default select-text ${
              isMe
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                : 'bg-[#1e1f2e] text-slate-200 border border-white/5 rounded-bl-sm'
            }`}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
          >
            {msg.message && <p className="break-words whitespace-pre-wrap">{msg.message}</p>}
            {msg.image && (
              <img
                src={msg.image} alt="shared"
                onClick={() => onImageClick(msg.image)}
                className="rounded-xl max-w-[220px] cursor-zoom-in mt-1 hover:opacity-90 transition"
              />
            )}
          </div>
        </div>

        {/* Reaction chips */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactions.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#1e1f2e] border border-white/10 text-xs hover:bg-white/10 transition active:scale-95"
                title={users.join(', ')}
              >
                <span>{emoji}</span>
                <span className="text-slate-400 text-[10px] font-semibold ml-0.5">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time + tick */}
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-600">{msg.time}</span>
          {isMe && (
            <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
let msgIdCounter = 0;
const makeId = () => `msg_${Date.now()}_${msgIdCounter++}`;

// ─────────────────────────────────────────────────────────────────────────────
// NAME MODAL — shows live avatar preview as you type
// ─────────────────────────────────────────────────────────────────────────────
function NameModal({ onSubmit }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  const preview = val.trim() || 'You';

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="bg-[#1a1b2e] border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-xs mx-4 flex flex-col items-center gap-5">

        {/* Live avatar preview */}
        <div className="relative">
          <div className="p-3 rounded-2xl bg-[#13141f] border border-white/5">
            <PixelAvatar name={preview} size={80} ring />
          </div>
          <div className="absolute -bottom-2 -right-2 text-lg">👾</div>
        </div>

        <div className="text-center">
          <h2 className="text-white text-xl font-bold">Pick your name</h2>
          <p className="text-slate-500 text-xs mt-1">Your pixel avatar is generated from your name</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && val.trim() && onSubmit(val.trim())}
            placeholder="Your name…"
            maxLength={24}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            style={{ fontSize: '16px' }}
          />
          <button
            disabled={!val.trim()}
            onClick={() => onSubmit(val.trim())}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Enter Chat →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
  const [sender,       setSender]       = useState('');
  const [nameReady,    setNameReady]    = useState(false);
  const [message,      setMessage]      = useState('');
  const [messages,     setMessages]     = useState([]);
  const [typingUsers,  setTypingUsers]  = useState([]);
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [showSidebar,  setShowSidebar]  = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxSrc,  setLightboxSrc]  = useState(null);

  // Streak
  const [streak,     setStreak]     = useState(0);
  const [streakLeft, setStreakLeft]  = useState(0);
  const streakTimerRef = useRef(null);
  const streakTickRef  = useRef(null);
  const streakSecsRef  = useRef(0);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const typingTimerRef = useRef(null);
  const senderRef      = useRef('');

  useEffect(() => { senderRef.current = sender; }, [sender]);

  // ── Streak engine ────────────────────────────────────────────────────────────
  const bumpStreak = useCallback(() => {
    setStreak(s => s + 1);
    streakSecsRef.current = STREAK_TIMEOUT;
    setStreakLeft(STREAK_TIMEOUT);
    clearInterval(streakTickRef.current);
    clearTimeout(streakTimerRef.current);

    streakTickRef.current = setInterval(() => {
      streakSecsRef.current -= 1;
      setStreakLeft(streakSecsRef.current);
      if (streakSecsRef.current <= 0) clearInterval(streakTickRef.current);
    }, 1000);

    streakTimerRef.current = setTimeout(() => {
      setStreak(0); setStreakLeft(0);
      clearInterval(streakTickRef.current);
    }, STREAK_TIMEOUT * 1000);
  }, []);

  // ── Socket events ────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('chat history', (history) => {
      setMessages((history || []).map(m => ({ ...m, id: m.id || makeId(), reactions: m.reactions || {} })));
    });

    socket.on('chat message', (data) => {
      const msg = { ...data, id: data.id || makeId(), reactions: data.reactions || {}, seen: false };
      setMessages(prev => [...prev, msg]);
      bumpStreak();
      if (data.sender !== senderRef.current && Notification.permission === 'granted') {
        new Notification(data.sender, { body: data.message || 'Sent an image', silent: true });
      }
    });

    socket.on('reaction', ({ msgId, emoji, user }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const r = { ...m.reactions };
        if (!r[emoji]) r[emoji] = [];
        const i = r[emoji].indexOf(user);
        r[emoji] = i === -1 ? [...r[emoji], user] : r[emoji].filter(u => u !== user);
        return { ...m, reactions: r };
      }));
    });

    socket.on('typing', ({ sender: s, text }) => {
      if (s !== senderRef.current)
        setTypingUsers(prev => prev.includes(s) ? prev : [...prev, s]);
    });

    socket.on('stop typing', (data) => {
      const name = typeof data === 'string' ? data : data?.sender;
      setTypingUsers(prev => prev.filter(u => u !== name));
    });

    socket.on('user list', setOnlineUsers);

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
      ['connect','disconnect','chat history','chat message','reaction','typing','stop typing','user list']
        .forEach(e => socket.off(e));
      window.removeEventListener('paste', onPaste);
      clearInterval(streakTickRef.current);
      clearTimeout(streakTimerRef.current);
    };
  }, [bumpStreak]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (sender) socket.emit('read', { reader: sender });
  }, [messages]);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // ── Session restore ──────────────────────────────────────────────────────────
  const joinChat = useCallback((name) => {
    setSender(name);
    setNameReady(true);
    sessionStorage.setItem('gc_sender', name);
    sessionStorage.setItem('gc_time', Date.now());
    socket.emit('join', name);
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem('gc_sender');
    const t = sessionStorage.getItem('gc_time');
    if (s && t && Date.now() - Number(t) < 30 * 60 * 1000) joinChat(s);
  }, [joinChat]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (imagePreview) {
      socket.emit('chat message', { id: makeId(), sender, image: imagePreview, time: formatTime(), reactions: {} });
      setImagePreview(null); return;
    }
    if (!message.trim()) return;
    socket.emit('chat message', { id: makeId(), sender, message: message.trim(), time: formatTime(), reactions: {} });
    setMessage('');
    clearTimeout(typingTimerRef.current);
    socket.emit('stop typing', sender);
  }, [message, sender, imagePreview]);

  // ── React ────────────────────────────────────────────────────────────────────
  const handleReact = useCallback((msgId, emoji) => {
    socket.emit('reaction', { msgId, emoji, user: sender });
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const r = { ...m.reactions };
      if (!r[emoji]) r[emoji] = [];
      const i = r[emoji].indexOf(sender);
      r[emoji] = i === -1 ? [...r[emoji], sender] : r[emoji].filter(u => u !== sender);
      return { ...m, reactions: r };
    }));
  }, [sender]);

  // ── Typing ───────────────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { sender, text: e.target.value });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => socket.emit('stop typing', sender), 1500);
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

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing…`
    : typingUsers.length > 1
    ? `${typingUsers.slice(0, 2).join(' & ')} are typing…`
    : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {!nameReady && <NameModal onSubmit={joinChat} />}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="full" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Shell */}
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d0e1a]" style={{ height: '100dvh' }}>
        <div className="relative w-full h-full md:max-w-5xl md:h-[90vh] md:rounded-2xl flex overflow-hidden shadow-2xl border border-white/5">

          {/* Sidebar mobile overlay */}
          {showSidebar && (
            <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setShowSidebar(false)} />
          )}

          {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
          <aside className={`
            absolute md:static inset-y-0 left-0 z-40 w-72
            flex flex-col bg-[#161728] border-r border-white/5
            transform transition-transform duration-300 ease-in-out
            ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            {/* Logo */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base">
                  👾
                </div>
                <span className="text-white font-bold text-base tracking-tight">GroupChat</span>
              </div>
              <button onClick={() => setShowSidebar(false)}
                className="md:hidden text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Streak card */}
            <div className="mx-3 mt-3 p-3.5 rounded-2xl bg-[#1a1b2e] border border-white/5">
              {streak > 0 ? (
                <StreakBadge streak={streak} secondsLeft={streakLeft} />
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-lg opacity-40">🔥</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Chat Streak</p>
                    <p className="text-[11px] text-slate-700">Send a message to start!</p>
                  </div>
                </div>
              )}
            </div>

            {/* You */}
            {nameReady && (
              <div className="px-4 pt-4 pb-3 border-b border-white/5">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">You</p>
                <div className="flex items-center gap-2.5">
                  <PixelAvatar name={sender} size={34} ring />
                  <div>
                    <p className="text-white font-semibold text-sm">{sender}</p>
                    <p className="text-xs text-emerald-400">Active now</p>
                  </div>
                </div>
              </div>
            )}

            {/* Online users */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                  Online — {onlineUsers.length}
                </p>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                {onlineUsers.map((user, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/4 transition">
                    <div className="relative">
                      <PixelAvatar name={user} size={30} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#161728]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">{user}</p>
                      <p className="text-[10px] text-slate-600">Online</p>
                    </div>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <p className="text-slate-700 text-xs text-center py-4">No one else here yet</p>
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN ──────────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#13141f]">

            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-[#161728]">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>

              <div className="w-9 h-9 rounded-xl bg-[#1e1f2e] border border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                👾
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-white font-semibold text-sm leading-tight">Group Chat</h1>
                <p className="text-[11px] truncate" style={{ color: typingLabel ? '#f59e0b' : '#475569', fontStyle: typingLabel ? 'italic' : 'normal' }}>
                  {typingLabel || `${onlineUsers.length} online`}
                </p>
              </div>

              {/* Streak compact badge in header */}
              {streak > 0 && <StreakBadge streak={streak} secondsLeft={streakLeft} compact />}

              {/* Connection pill */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Off'}
              </div>
            </header>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center select-none">
                  <div className="text-5xl opacity-30">👾</div>
                  <p className="text-slate-600 text-sm">No messages yet — say hello!</p>
                  <p className="text-slate-700 text-xs">Long-press or hover a message to react 😊</p>
                  <p className="text-slate-700 text-xs">Keep chatting to build a streak 🔥</p>
                </div>
              )}

              <div className="flex flex-col">
                {messages.map((msg, idx) => {
                  const isMe      = msg.sender === sender;
                  const prev      = messages[idx - 1];
                  const showAv    = !isMe && msg.sender !== prev?.sender;
                  const showName  = !isMe && showAv;
                  const gap       = idx > 0 && msg.sender === prev?.sender ? 'mt-0.5' : 'mt-3';
                  return (
                    <div key={msg.id || idx} className={gap}>
                      <MessageBubble
                        msg={msg} isMe={isMe}
                        showAvatar={showAv} showName={showName}
                        onReact={handleReact} onImageClick={setLightboxSrc}
                      />
                    </div>
                  );
                })}

                {/* Typing bubble */}
                {typingLabel && (
                  <div className="flex items-end gap-2 mt-3">
                    <div className="w-8 flex-shrink-0" />
                    <div className="bg-[#1e1f2e] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block animate-bounce"
                          style={{ animationDelay: `${i*150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Image preview bar */}
            {imagePreview && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-[#1e1f2e] border border-white/10 flex items-center gap-3">
                <img src={imagePreview} alt="preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Image ready</p>
                  <p className="text-slate-600 text-xs mt-0.5">Enter to send · Esc to cancel</p>
                </div>
                <button onClick={() => setImagePreview(null)}
                  className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 pt-2 bg-[#161728] border-t border-white/5"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
              <div className="flex items-center gap-2 bg-[#1e1f2e] border border-white/10 rounded-2xl px-3 py-2 focus-within:border-indigo-500/40 transition">
                {/* Attach */}
                <label className="cursor-pointer text-slate-600 hover:text-indigo-400 transition p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                </label>

                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder={imagePreview ? 'Image attached…' : 'Message the group…'}
                  disabled={!!imagePreview}
                  className="flex-1 bg-transparent text-white placeholder-slate-600 focus:outline-none py-1 min-w-0"
                  style={{ fontSize: '16px' }}
                />

                {/* Send */}
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() && !imagePreview}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed transition flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-700 mt-1.5 select-none">
                Hover or long-press a message to react 😊 · Keep chatting to build a streak 🔥
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
