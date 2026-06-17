import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import socket from './socket.js';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Fade from '@mui/material/Fade';
import Zoom from '@mui/material/Zoom';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// MUI Icons
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import TranslateIcon from '@mui/icons-material/Translate';
import PaletteIcon from '@mui/icons-material/Palette';
import ImageIcon from '@mui/icons-material/Image';
import CodeIcon from '@mui/icons-material/Code';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BedIcon from '@mui/icons-material/Bed';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CelebrationIcon from '@mui/icons-material/Celebration';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import TagIcon from '@mui/icons-material/Tag';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ShieldIcon from '@mui/icons-material/Shield';
import BlockIcon from '@mui/icons-material/Block';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GavelIcon from '@mui/icons-material/Gavel';

// ─────────────────────────────────────────────────────────────────────────────
// MUI DARK THEME
// ─────────────────────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#6366f1' },
    secondary: { main: '#9333ea' },
    background:{ default: '#0a0b14', paper: '#131420' },
    surface:   '#1a1b2e',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: { background: '#12131e', borderRight: '1px solid rgba(255,255,255,0.06)' }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { background: '#1a1b2e', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }
      }
    },
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL AVATAR ENGINE — deterministic 8×8 sprite from name
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
      half.push(v < .30 ? pal[3] : v < .60 ? pal[0] : v < .80 ? pal[1] : v < .92 ? pal[2] : null);
    }
    grid.push([...half, ...[...half].reverse()]);
  }
  return { grid, pal };
}
function PixelAvatar({ name, size = 36, ring = false, ghost = false, sx = {} }) {
  const { grid, pal } = buildPixelGrid(name || '?');
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const cell = c.width / 8;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = pal[3]; ctx.fillRect(0, 0, c.width, c.height);
    grid.forEach((row, r) => row.forEach((col, ci) => {
      if (col) { ctx.fillStyle = col; ctx.fillRect(ci * cell, r * cell, cell, cell); }
    }));
  }, [name]);
  return (
    <Box sx={{ position: 'relative', flexShrink: 0, ...sx }}>
      <Box component="canvas" ref={canvasRef} width={64} height={64}
        sx={{ width: size, height: size, borderRadius: '6px', imageRendering: 'pixelated', display: 'block', opacity: ghost ? 0.4 : 1, filter: ghost ? 'grayscale(1)' : 'none', boxShadow: ring ? `0 0 0 2px ${pal[0]}, 0 0 16px ${pal[0]}55` : 'none' }} />
    </Box>
  );
}
function accentColor(name) {
  const rng = seededRng(name || '?'); return PALETTES[Math.floor(rng() * PALETTES.length)][0];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const REACTION_EMOJIS = ['👍','❤️','😂','😮','🔥','😢'];
const STATUSES = [
  { value: 'online',  label: 'Online',   color: '#22c55e', Icon: FiberManualRecordIcon },
  { value: 'coding',  label: 'Coding',   color: '#60a5fa', Icon: CodeIcon },
  { value: 'gaming',  label: 'Gaming',   color: '#a78bfa', Icon: SportsEsportsIcon },
  { value: 'music',   label: 'Music',    color: '#f472b6', Icon: MusicNoteIcon },
  { value: 'afk',     label: 'AFK',      color: '#94a3b8', Icon: BedIcon },
  { value: 'busy',    label: 'Busy',     color: '#f87171', Icon: DoNotDisturbIcon },
];
const LANGUAGES = [
  { code: 'en', label: 'English 🇺🇸' }, { code: 'es', label: 'Spanish 🇪🇸' },
  { code: 'fr', label: 'French 🇫🇷' },  { code: 'de', label: 'German 🇩🇪' },
  { code: 'hi', label: 'Hindi 🇮🇳' },   { code: 'ja', label: 'Japanese 🇯🇵' },
  { code: 'ar', label: 'Arabic 🇸🇦' },  { code: 'pt', label: 'Portuguese 🇧🇷' },
  { code: 'zh', label: 'Chinese 🇨🇳' }, { code: 'ko', label: 'Korean 🇰🇷' },
];
const CONSEQUENCE_RULES = [
  { trigger: /\b(damn|shit|fuck)\b/i,    effect: 'flip',    label: '🙃 Flipped!' },
  { trigger: /\b(lol|haha|lmao|lmfao)\b/i, effect: 'rainbow', label: '🌈 Rainbow Mode!' },
  { trigger: /spam/i,                    effect: 'tiny',    label: '🤏 Tiny Text!' },
];
const formatTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
let _msgId = 0;
const makeId = () => `msg_${Date.now()}_${_msgId++}`;

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────────────────
function Confetti({ onDone }) {
  const particles = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#8b5cf6'][i % 7],
    size: 6 + Math.random() * 9, delay: Math.random() * 1, dur: 1.8 + Math.random() * 0.8,
  })), []);
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map(p => (
        <Box key={p.id} sx={{
          position: 'absolute', left: `${p.x}%`, top: -20,
          width: p.size, height: p.size, borderRadius: '2px',
          background: p.color, animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTION PICKER — compact 6-emoji pill, renders below bubble in flow
// ─────────────────────────────────────────────────────────────────────────────
function ReactionPicker({ onPick, onClose, isMe }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // small delay so the same pointerdown that opened it doesn't also close it
    const id = setTimeout(() => document.addEventListener('pointerdown', handler, true), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', handler, true);
    };
  }, [onClose]);

  return (
    <Fade in timeout={120}>
      <Box
        ref={ref}
        sx={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '2px',
          px: '6px',
          py: '4px',
          mt: '4px',
          background: '#1e2035',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
          // Never overflow — 6 emojis always fit in one row
          flexWrap: 'nowrap',
          alignSelf: isMe ? 'flex-end' : 'flex-start',
        }}
      >
        {REACTION_EMOJIS.map(emoji => (
          <Box
            key={emoji}
            component="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPick(emoji);
              onClose();
            }}
            sx={{
              width: 36,
              height: 36,
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'transform 0.12s, background 0.12s',
              '&:hover': {
                transform: 'scale(1.35)',
                background: 'rgba(255,255,255,0.08)',
              },
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            {emoji}
          </Box>
        ))}
      </Box>
    </Fade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, showName, onReact, myUsername, isSpectator, cinematicMsgId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered]       = useState(false);
  const longPressRef = useRef(null);
  const isCinematic = cinematicMsgId === msg.id;

  const reactions = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);
  const myReactions = reactions.filter(([, u]) => u.includes(myUsername)).map(([e]) => e);

  const effectSx = msg.effect === 'flip' ? { transform: 'scaleY(-1)', display: 'inline-block' }
    : msg.effect === 'tiny' ? { fontSize: '9px !important' } : {};
  const effectClass = msg.effect === 'rainbow' ? 'rainbow-txt' : '';

  const handleTouchStart = () => {
    if (!isSpectator) longPressRef.current = setTimeout(() => setPickerOpen(true), 420);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  return (
    <Box
      className="msg-anim"
      onMouseEnter={() => !isSpectator && setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1,
        flexDirection: isMe ? 'row-reverse' : 'row',
        filter: isCinematic ? 'drop-shadow(0 0 20px #f59e0b)' : 'none',
        transition: 'filter 0.3s', mb: 0.25,
      }}>

      {/* Avatar */}
      <Box sx={{ width: 34, flexShrink: 0, pt: 0.25 }}>
        {!isMe && showAvatar && <PixelAvatar name={msg.isAnon ? 'Ghost' : msg.sender} size={30} ghost={msg.isAnon} />}
      </Box>

      {/* Column: name + bubble + picker + reactions + time */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: { xs: '80%', sm: '65%' } }}>

        {showName && !isMe && (
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.4, pl: 0.5, color: accentColor(msg.isAnon ? 'Ghost' : msg.sender) }}>
            {msg.isAnon ? 'Mystery Guest' : msg.sender}
          </Typography>
        )}

        {/* Bubble + hover react button */}
        <Box sx={{ position: 'relative', width: '100%', display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 0.5 }}>

          {/* React button — shows on hover, sits beside the bubble */}
          {hovered && !pickerOpen && !isSpectator && (
            <Tooltip title="React" placement={isMe ? 'left' : 'right'}>
              <IconButton size="small"
                onPointerDown={(e) => { e.stopPropagation(); setPickerOpen(true); }}
                sx={{
                  mt: 0.5, width: 28, height: 28, flexShrink: 0,
                  background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.12)',
                  '&:hover': { background: '#252638' },
                }}>
                <EmojiEmotionsIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Bubble */}
          <Box
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchEnd}
            sx={{
              px: 1.75, py: 1.25, borderRadius: 3, fontSize: 14, lineHeight: 1.6,
              wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              background: msg.isAnon
                ? 'linear-gradient(135deg,#374151,#1f2937)'
                : isMe
                  ? 'linear-gradient(135deg,#6366f1,#9333ea)'
                  : '#1e1f2e',
              color: '#fff',
              borderBottomRightRadius: isMe ? 4 : 24,
              borderBottomLeftRadius:  isMe ? 24 : 4,
              border: (isMe || msg.isAnon) ? 'none' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: isMe ? '0 2px 16px rgba(99,102,241,0.25)' : 'none',
            }}>
            {msg.replyTo && (
              <Box sx={{ borderLeft: '2px solid rgba(255,255,255,0.25)', pl: 1, mb: 0.75, opacity: 0.55, fontSize: 12 }}>
                <b>{msg.replyTo.sender}</b>: {(msg.replyTo.message || '').slice(0, 60)}
              </Box>
            )}
            <Box component="span" className={effectClass} sx={effectSx}>{msg.message}</Box>
            {msg.translate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}>
                <TranslateIcon sx={{ fontSize: 11, opacity: 0.4 }} />
                <Typography variant="caption" sx={{ opacity: 0.45, fontStyle: 'italic' }}>
                  {msg.translate}
                </Typography>
              </Box>
            )}
            {msg.image && (
              <Box component="img" src={msg.image} alt="shared"
                sx={{ maxWidth: 220, borderRadius: 2, mt: 1, display: 'block', cursor: 'zoom-in', '&:hover': { opacity: 0.9 } }} />
            )}
          </Box>
        </Box>

        {/* Reaction picker — BELOW the bubble, inline in flow, always horizontal row */}
        {pickerOpen && (
          <Box sx={{ width: '100%', mt: 0.25 }}>
            <ReactionPicker
              onPick={(e) => { onReact(msg.id, e); setPickerOpen(false); setHovered(false); }}
              onClose={() => { setPickerOpen(false); setHovered(false); }}
              isMe={isMe}
            />
          </Box>
        )}

        {/* Reaction chips — horizontal row below bubble */}
        {reactions.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.4, mt: 0.5, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
            {reactions.map(([emoji, users]) => (
              <Chip key={emoji}
                label={`${emoji} ${users.length}`}
                size="small"
                onPointerDown={() => !isSpectator && onReact(msg.id, emoji)}
                title={users.join(', ')}
                sx={{
                  height: 24, fontSize: 12, cursor: isSpectator ? 'default' : 'pointer',
                  background: myReactions.includes(emoji) ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${myReactions.includes(emoji) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff', '& .MuiChip-label': { px: 0.75 },
                  '&:hover': { background: myReactions.includes(emoji) ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.12)' },
                  transition: 'all 0.15s',
                }} />
            ))}
          </Box>
        )}

        {/* Timestamp */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3, flexDirection: isMe ? 'row-reverse' : 'row', pl: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>{msg.time}</Typography>
          {isMe && <DoneAllIcon sx={{ fontSize: 12, color: '#818cf8' }} />}
        </Box>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER CARD in Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function UserCard({ user, isMe }) {
  const st = STATUSES.find(s => s.value === (user.status || 'online')) || STATUSES[0];
  return (
    <ListItem disablePadding sx={{ px: 1, py: 0.4 }}>
      <ListItemAvatar sx={{ minWidth: 42 }}>
        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={<Box sx={{ width: 10, height: 10, borderRadius: '50%', background: st.color, border: '2px solid #12131e' }} />}>
          <PixelAvatar name={user.username} size={32} ghost={user.spectator} />
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isMe ? '#a5b4fc' : '#e2e8f0', fontSize: 13 }}>
              {user.username}{isMe ? ' (you)' : ''}
            </Typography>
            {user.spectator && <VisibilityIcon sx={{ fontSize: 12, color: '#64748b' }} />}
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <st.Icon sx={{ fontSize: 10, color: st.color }} />
            <Typography variant="caption" sx={{ fontSize: 10, color: st.color }}>{st.label}</Typography>
          </Box>
        }
      />
    </ListItem>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
function JoinModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, p: 4, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, animation: 'popModal 0.25s cubic-bezier(.34,1.56,.64,1) both' }}>
        <Box sx={{ position: 'relative', p: 1.5, background: '#0a0b14', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
          <PixelAvatar name={name.trim() || 'You'} size={88} ring />
          <AutoAwesomeIcon sx={{ position: 'absolute', bottom: -4, right: -4, fontSize: 22, color: '#f59e0b' }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Join GroupChat</Typography>
          <Typography variant="caption" sx={{ color: '#475569' }}>Your pixel avatar is unique to your name</Typography>
        </Box>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField inputRef={inputRef} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name.trim(), lang)}
            placeholder="Your name…" variant="outlined" fullWidth size="medium"
            inputProps={{ maxLength: 24 }}
            sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', borderRadius: 2, color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-focused fieldset': { borderColor: '#6366f1' } }, '& .MuiInputBase-input::placeholder': { color: '#475569' } }} />
          <FormControl fullWidth size="medium" sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', borderRadius: 2, color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiSvgIcon-root': { color: '#64748b' } }}>
            <InputLabel sx={{ color: '#64748b' }}>My Language</InputLabel>
            <Select value={lang} onChange={e => setLang(e.target.value)} label="My Language">
              {LANGUAGES.map(l => <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Box component="button" onClick={() => name.trim() && onSubmit(name.trim(), lang)} disabled={!name.trim()}
            sx={{ py: 1.6, borderRadius: 2.5, background: name.trim() ? 'linear-gradient(135deg,#6366f1,#9333ea)' : 'rgba(255,255,255,0.05)', color: name.trim() ? '#fff' : '#334155', fontWeight: 700, fontSize: 15, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', '&:hover': { opacity: 0.9 } }}>
            Enter Chat →
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function RoomsDialog({ open, onClose, onJoin, onCreate, username }) {
  const [tab,       setTab]       = useState(0);
  const [code,      setCode]      = useState('');
  const [pass,      setPass]      = useState('');
  const [rName,     setRName]     = useState('');
  const [rPass,     setRPass]     = useState('');
  const [spectator, setSpectator] = useState(false);
  const [created,   setCreated]   = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    if (!open) { setCreated(null); setCode(''); setPass(''); setRName(''); setRPass(''); return; }
    socket.emit('list rooms');
    socket.on('room list', setPublicRooms);
    socket.on('room created', (data) => setCreated(data));
    return () => { socket.off('room list'); socket.off('room created'); };
  }, [open]);

  const handleCreate = () => { if (!rName.trim()) return; socket.emit('create room', { name: rName.trim(), password: rPass, username }); };
  const copyCode = () => { navigator.clipboard.writeText(created.roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MeetingRoomIcon sx={{ color: '#6366f1' }} />
          <Typography fontWeight={700}>Rooms</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setCreated(null); }} sx={{ mb: 2, '& .MuiTab-root': { color: '#64748b', fontSize: 13, minWidth: 0 }, '& .Mui-selected': { color: '#a5b4fc' }, '& .MuiTabs-indicator': { background: '#6366f1' } }}>
          <Tab icon={<LockIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Join" />
          <Tab icon={<AddIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Create" />
          <Tab icon={<PublicIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Browse" />
        </Tabs>

        {/* Join Tab */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Room code (e.g. AB12CD)" inputProps={{ maxLength: 6, style: { letterSpacing: 8, fontFamily: 'monospace', fontSize: 20, fontWeight: 700 } }} fullWidth variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
            <TextField value={pass} onChange={e => setPass(e.target.value)} placeholder="Password (if required)" type="password" fullWidth variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
            <FormControlLabel control={<Switch checked={spectator} onChange={e => setSpectator(e.target.checked)} size="small" />}
              label={<Typography variant="body2" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}><VisibilityIcon sx={{ fontSize: 14 }} /> Spectator mode (invisible, read-only)</Typography>} />
            <Box component="button" disabled={code.length < 4} onClick={() => onJoin(code, pass, spectator)}
              sx={{ py: 1.5, borderRadius: 2, background: code.length >= 4 ? 'linear-gradient(135deg,#6366f1,#9333ea)' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, border: 'none', cursor: code.length >= 4 ? 'pointer' : 'not-allowed', fontSize: 14 }}>
              Join Room
            </Box>
          </Box>
        )}

        {/* Create Tab */}
        {tab === 1 && !created && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField value={rName} onChange={e => setRName(e.target.value)} placeholder="Room name…" inputProps={{ maxLength: 30 }} fullWidth variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
            <TextField value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Password (optional)" type="password" fullWidth variant="outlined"
              InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16, color: '#64748b' }} /></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
            <Box component="button" disabled={!rName.trim()} onClick={handleCreate}
              sx={{ py: 1.5, borderRadius: 2, background: rName.trim() ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, border: 'none', cursor: rName.trim() ? 'pointer' : 'not-allowed', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <AddIcon sx={{ fontSize: 18 }} /> Create Private Room
            </Box>
          </Box>
        )}

        {/* Created success */}
        {tab === 1 && created && (
          <Box sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CelebrationIcon sx={{ fontSize: 48, color: '#f59e0b' }} />
            <Typography variant="h6" fontWeight={700} color="white">{created.name}</Typography>
            <Box sx={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 3, p: 3, width: '100%' }}>
              <Typography variant="caption" sx={{ color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Room Code</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 12, fontFamily: 'monospace', color: '#a5b4fc', mt: 0.5 }}>{created.roomId}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
              <Box component="button" onClick={copyCode} sx={{ flex: 1, py: 1.2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, fontSize: 13 }}>
                {copied ? <><CheckIcon sx={{ fontSize: 16 }} /> Copied!</> : <><ContentCopyIcon sx={{ fontSize: 16 }} /> Copy Code</>}
              </Box>
              <Box component="button" onClick={() => onJoin(created.roomId, rPass, false)} sx={{ flex: 1, py: 1.2, borderRadius: 2, background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                Enter Room →
              </Box>
            </Box>
          </Box>
        )}

        {/* Browse Tab */}
        {tab === 2 && (
          <Box>
            {publicRooms.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, color: '#475569' }}>
                <PublicIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                <Typography>No public rooms yet</Typography>
              </Box>
            )}
            <List disablePadding>
              {publicRooms.map(r => (
                <ListItem key={r.id} onClick={() => onJoin(r.id, '', false)}
                  sx={{ borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { background: 'rgba(99,102,241,0.1)' }, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ListItemAvatar><Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TagIcon sx={{ color: '#6366f1' }} /></Box></ListItemAvatar>
                  <ListItemText primary={<Typography fontWeight={600} color="white" fontSize={14}>{r.name}</Typography>} secondary={<Typography variant="caption" color="#64748b">{r.count} online</Typography>} />
                  <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600 }}>Join →</Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIBE BOARD DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function VibeBoardDialog({ open, onClose, items, onDrop }) {
  const [url, setUrl] = useState('');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PaletteIcon sx={{ color: '#f472b6' }} /><Typography fontWeight={700}>Vibe Board</Typography></Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a GIF or image URL…" fullWidth size="small" variant="outlined"
            sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.04)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
          <IconButton onClick={() => { if (url.trim()) { onDrop(url.trim()); setUrl(''); } }}
            sx={{ background: 'linear-gradient(135deg,#6366f1,#9333ea)', borderRadius: 2, '&:hover': { opacity: 0.9 } }}>
            <AddIcon sx={{ color: '#fff' }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 1.5 }}>
          {items.map(item => (
            <Box key={item.id} sx={{ borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Box component="img" src={item.url} alt="vibe" sx={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
              <Typography variant="caption" sx={{ display: 'block', px: 1, py: 0.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>by {item.sender}</Typography>
            </Box>
          ))}
          {items.length === 0 && (
            <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 5, color: '#334155' }}>
              <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography>Drop GIFs or images to build the vibe</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT MODERATION — client-side pre-send filter + Claude API verification
// ─────────────────────────────────────────────────────────────────────────────
const BAD_WORD_PATTERNS = [
  /\b(fuck|shit|ass|bitch|cunt|dick|pussy|cock|nigger|faggot|retard)\b/gi,
  /\b(kill\s+your?self|kys|go\s+die)\b/gi,
];
const ILLEGAL_PATTERNS = [
  /\b(buy|sell|get)\s+(drugs?|meth|cocaine|heroin|weed|marijuana)\b/gi,
  /\b(hack|ddos|phish|exploit|malware|ransomware)\b/gi,
  /\b(cp|child\s+porn|csam)\b/gi,
];
const SEXUAL_PATTERNS = [
  /\b(sex|porn|nude|naked|xxx|onlyfans|nsfw)\b/gi,
];

function moderateMessage(text) {
  for (const p of BAD_WORD_PATTERNS) { if (p.test(text)) return { blocked: true, reason: 'profanity', label: 'Hate speech or profanity is not allowed' }; }
  for (const p of ILLEGAL_PATTERNS) { if (p.test(text)) return { blocked: true, reason: 'illegal', label: 'Discussion of illegal activities is not allowed' }; }
  for (const p of SEXUAL_PATTERNS) { if (p.test(text)) return { blocked: true, reason: 'sexual', label: 'Sexual content is not allowed in this space' }; }
  return { blocked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM BRAIN — AI-powered live chat summary using Claude API
// ─────────────────────────────────────────────────────────────────────────────
function RoomBrain({ messages, isOpen, onClose }) {
  const [summary,   setSummary]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const [topics,    setTopics]    = useState([]);
  const [mood,      setMood]      = useState('');

  const summarize = useCallback(async () => {
    const recentMsgs = messages.filter(m => m.message).slice(-40);
    if (recentMsgs.length < 3) { setSummary('Not enough messages yet — keep chatting!'); return; }
    if (recentMsgs.length === lastCount) return;

    setLoading(true);
    const transcript = recentMsgs.map(m => `${m.sender}: ${m.message}`).join('\n');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are the Room Brain — a friendly AI secretary for a group chat. Analyze this conversation and respond ONLY with a valid JSON object (no markdown, no extra text) with these exact keys:
{
  "summary": "2-3 sentence casual summary of what the group has been talking about",
  "topics": ["topic1", "topic2", "topic3"],
  "mood": "one word: hype / chill / serious / funny / mixed",
  "highlight": "the most interesting or funny moment in one sentence"
}

Chat transcript:
${transcript}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setSummary(parsed.summary || '');
      setTopics(parsed.topics || []);
      setMood(parsed.mood || '');
      setLastCount(recentMsgs.length);
    } catch (e) {
      setSummary('Could not generate summary right now. Try again!');
    } finally {
      setLoading(false);
    }
  }, [messages, lastCount]);

  useEffect(() => { if (isOpen) summarize(); }, [isOpen]);

  const moodColor = { hype: '#f97316', chill: '#06b6d4', serious: '#6366f1', funny: '#10b981', mixed: '#f59e0b' };
  const col = moodColor[mood] || '#6366f1';

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '85vw', sm: 320 }, background: '#12131e', borderLeft: '1px solid rgba(255,255,255,0.07)' } }}>
      <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon sx={{ color: '#6366f1', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff' }}>Room Brain</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: '#64748b' }}><CloseIcon /></IconButton>
        </Box>

        <Typography variant="caption" sx={{ color: '#475569', mt: -1 }}>
          AI-powered live summary of your conversation
        </Typography>

        {/* Mood */}
        {mood && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, background: `${col}15`, border: `1px solid ${col}30`, borderRadius: 2 }}>
            <AutoFixHighIcon sx={{ color: col, fontSize: 18 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room Mood</Typography>
              <Typography variant="body2" sx={{ color: col, fontWeight: 700, textTransform: 'capitalize' }}>{mood}</Typography>
            </Box>
          </Box>
        )}

        {/* Summary */}
        <Box sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2.5, p: 2 }}>
          <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>
            <PsychologyIcon sx={{ fontSize: 12 }} /> What's happening
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
              <CircularProgress size={16} sx={{ color: '#6366f1' }} />
              <Typography variant="caption" sx={{ color: '#475569' }}>Analyzing conversation…</Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 13 }}>
              {summary || 'Click refresh to generate a summary'}
            </Typography>
          )}
        </Box>

        {/* Topics */}
        {topics.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 1, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>Hot Topics</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {topics.map(t => (
                <Chip key={t} label={t} size="small" sx={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', fontSize: 12, height: 26 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {[
            { label: 'Messages', value: messages.filter(m => m.message).length },
            { label: 'Active Users', value: new Set(messages.map(m => m.sender)).size },
            { label: 'Reactions', value: messages.reduce((a, m) => a + Object.values(m.reactions || {}).reduce((b, u) => b + u.length, 0), 0) },
            { label: 'Anonymous', value: messages.filter(m => m.isAnon).length },
          ].map(s => (
            <Box key={s.label} sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#6366f1', fontWeight: 800, lineHeight: 1 }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontSize: 10 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Refresh */}
        <Box component="button" onClick={summarize} disabled={loading}
          sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1.3, borderRadius: 2.5, background: loading ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
          <RefreshIcon sx={{ fontSize: 18 }} /> Refresh Summary
        </Box>
      </Box>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODERATION BLOCKED DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function ModerationBlock({ reason, label, onClose }) {
  const icons = { profanity: <GavelIcon sx={{ fontSize: 40, color: '#f87171' }} />, illegal: <BlockIcon sx={{ fontSize: 40, color: '#f97316' }} />, sexual: <ShieldIcon sx={{ fontSize: 40, color: '#f59e0b' }} /> };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {icons[reason] || <WarningAmberIcon sx={{ fontSize: 40, color: '#f87171' }} />}
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>Message Blocked</Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8' }}>{label}</Typography>
        <Box sx={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 2, p: 1.5, width: '100%' }}>
          <Typography variant="caption" sx={{ color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 13 }} /> This space is safe and family-friendly
          </Typography>
        </Box>
        <Box component="button" onClick={onClose}
          sx={{ px: 3, py: 1.2, borderRadius: 2, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          Edit Message
        </Box>
      </DialogContent>
    </Dialog>
  );
}
const SIDEBAR_W = 260;
function SidebarContent({ sender, myStatus, onStatusChange, onlineUsers, currentRoom, roomDisplayName, onOpenRooms, isSpectator, anonMode }) {
  const stObj = STATUSES.find(s => s.value === myStatus) || STATUSES[0];
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#12131e' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2.5, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👾</Box>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>GroupChat</Typography>
          <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <TagIcon sx={{ fontSize: 10 }} />{roomDisplayName}
          </Typography>
        </Box>
      </Box>

      {/* Quick actions */}
      <Box sx={{ px: 1.5, pt: 1.5 }}>
        <Box component="button" onClick={onOpenRooms}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.1, borderRadius: 2.5, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', width: '100%', '&:hover': { background: 'rgba(99,102,241,0.2)' } }}>
          <MeetingRoomIcon sx={{ fontSize: 18 }} /> Rooms
          <Chip label={currentRoom === 'general' ? 'General' : 'Private'} size="small" sx={{ ml: 'auto', height: 20, fontSize: 10, background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }} />
        </Box>
      </Box>

      <Divider sx={{ mx: 1.5, my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* You */}
      <Box sx={{ px: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontSize: 10 }}>You</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 1 }}>
          <Tooltip title="Click to change status" placement="right">
            <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowStatusPicker(v => !v)}>
              <PixelAvatar name={sender} size={36} ring ghost={isSpectator} />
              <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 13, height: 13, borderRadius: '50%', background: stObj.color, border: '2px solid #12131e' }} />
            </Box>
          </Tooltip>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sender}</Typography>
              {isSpectator && <VisibilityIcon sx={{ fontSize: 12, color: '#64748b' }} />}
              {anonMode && <PersonOffIcon sx={{ fontSize: 12, color: '#9ca3af' }} />}
            </Box>
            <Typography variant="caption" sx={{ color: stObj.color, fontSize: 10, display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <stObj.Icon sx={{ fontSize: 11 }} /> {stObj.label}
            </Typography>
          </Box>
        </Box>

        {/* Status picker */}
        {showStatusPicker && (
          <Box sx={{ mt: 1, background: '#0a0b14', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {STATUSES.map(s => (
              <Box key={s.value} component="button" onClick={() => { onStatusChange(s.value); setShowStatusPicker(false); }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.9, width: '100%', background: myStatus === s.value ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: s.color, fontSize: 13, fontWeight: 600, '&:hover': { background: 'rgba(255,255,255,0.05)' } }}>
                <s.Icon sx={{ fontSize: 15 }} /> {s.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Online users */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, fontSize: 10 }}>
            Online — {onlineUsers.filter(u => !u.spectator).length}
          </Typography>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulseDot 2s infinite' }} />
        </Box>
        <List disablePadding>
          {onlineUsers.map((u, i) => <UserCard key={i} user={u} isMe={u.username === sender} />)}
          {onlineUsers.length === 0 && (
            <Typography variant="caption" sx={{ color: '#334155', textAlign: 'center', display: 'block', py: 2 }}>No one else here yet</Typography>
          )}
        </List>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CHAT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Chat() {
  // ── useMediaQuery replaces window.matchMedia (safe for iOS re-renders) ───
  const isMobile = useMediaQuery('(max-width:767px)', { noSsr: true });

  const [sender,       setSender]       = useState('');
  const [userLang,     setUserLang]     = useState('en');
  const [nameReady,    setNameReady]    = useState(false);
  const [message,      setMessage]      = useState('');
  const [messages,     setMessages]     = useState([]);
  const [typingUsers,  setTypingUsers]  = useState([]);
  const [onlineUsers,  setOnlineUsers]  = useState([]);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxSrc,  setLightboxSrc]  = useState(null);
  const [isSpectator,  setIsSpectator]  = useState(false);
  const [currentRoom,  setCurrentRoom]  = useState('general');
  const [roomDisplay,  setRoomDisplay]  = useState('General');
  const [roomsOpen,    setRoomsOpen]    = useState(false);
  const [vibeOpen,     setVibeOpen]     = useState(false);
  const [vibeItems,    setVibeItems]    = useState([]);
  const [myStatus,     setMyStatus]     = useState('online');
  const [cinematicId,  setCinematicId]  = useState(null);
  const [confetti,     setConfetti]     = useState(false);
  const [anonMode,     setAnonMode]     = useState(false);
  const [snack,        setSnack]        = useState({ open: false, msg: '', severity: 'info' });
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [scrollBottom, setScrollBottom] = useState(true);
  // New features
  const [brainOpen,    setBrainOpen]    = useState(false);
  const [modBlock,     setModBlock]     = useState(null); // { reason, label }

  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const typingTimerRef  = useRef(null);
  const senderRef       = useRef('');
  const userLangRef     = useRef('en');
  const cinematicRef    = useRef({});
  const messagesBoxRef  = useRef(null);

  useEffect(() => { senderRef.current = sender; }, [sender]);
  useEffect(() => { userLangRef.current = userLang; }, [userLang]);

  const showSnack = (msg, severity = 'info') => setSnack({ open: true, msg, severity });

  // ── Translate ────────────────────────────────────────────────────────────
  const translateText = useCallback(async (text, targetLang) => {
    if (!targetLang || targetLang === 'en') return null;
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,300))}&langpair=en|${targetLang}`);
      const d = await r.json();
      const t = d?.responseData?.translatedText;
      return t && t !== text && !t.includes('PLEASE SELECT') ? t : null;
    } catch { return null; }
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect',    () => { setConnected(true);  showSnack('Connected to server', 'success'); });
    socket.on('disconnect', () => { setConnected(false); showSnack('Connection lost — reconnecting…', 'warning'); });
    if (socket.connected) setConnected(true);

    socket.on('chat history', (history) => {
      setMessages((history || []).map(m => ({ ...m, id: m.id || makeId(), reactions: m.reactions || {} })));
    });

    socket.on('chat message', async (data) => {
      const msg = { ...data, id: data.id || makeId(), reactions: data.reactions || {} };
      const myName = senderRef.current;

      if (data.sender !== myName) {
        const mentionsMe = msg.message?.toLowerCase().includes(myName.toLowerCase());
        if (mentionsMe) {
          showSnack(`📣 ${data.sender} mentioned you`, 'info');
          if (Notification.permission === 'granted') {
            new Notification(`${data.sender} mentioned you`, { body: msg.message, silent: false });
          }
        }
        if (!scrollBottom) setUnreadCount(u => u + 1);
      }

      const lang = userLangRef.current;
      if (lang && lang !== 'en' && msg.message) {
        const t = await translateText(msg.message, lang);
        if (t) msg.translate = t;
      }
      setMessages(prev => [...prev, msg]);
    });

    // Fixed: server sends full reactions object
    socket.on('reaction update', ({ msgId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    });

    socket.on('typing', ({ sender: s }) => {
      if (s !== senderRef.current)
        setTypingUsers(prev => prev.includes(s) ? prev : [...prev, s]);
    });
    socket.on('stop typing', ({ sender: s }) => setTypingUsers(prev => prev.filter(u => u !== s)));
    socket.on('user list',  setOnlineUsers);
    socket.on('vibe board', setVibeItems);

    socket.on('cinematic moment', ({ msgId }) => {
      setCinematicId(msgId);
      setConfetti(true);
      showSnack('🎬 Cinematic Moment! 🎉', 'success');
      setTimeout(() => setCinematicId(null), 5000);
    });

    socket.on('room joined', ({ room, name, spectator }) => {
      setCurrentRoom(room); setRoomDisplay(name);
      setIsSpectator(spectator); setMessages([]);
      setRoomsOpen(false);
      showSnack(spectator ? `👁 Joined #${name} as spectator` : `🏠 Joined #${name}`, 'success');
    });

    socket.on('error', (msg) => showSnack(msg, 'error'));

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
    if (Notification.permission === 'default') Notification.requestPermission();

    return () => {
      ['connect','disconnect','chat history','chat message','reaction update','typing','stop typing','user list','vibe board','cinematic moment','room joined','error'].forEach(e => socket.off(e));
      window.removeEventListener('paste', onPaste);
    };
  }, [translateText]);

  // Auto-scroll to bottom when new messages arrive, only if already near bottom
  useEffect(() => {
    if (!scrollBottom) return;
    const el = messagesBoxRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    setUnreadCount(0);
  }, [messages.length, scrollBottom]);

  const handleScroll = useCallback(() => {
    const el = messagesBoxRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setScrollBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  // ── Join ──────────────────────────────────────────────────────────────────
  const joinChat = useCallback((name, lang) => {
    setSender(name); setUserLang(lang); userLangRef.current = lang;
    setNameReady(true);
    sessionStorage.setItem('gc_sender', name);
    sessionStorage.setItem('gc_lang', lang);
    socket.emit('join', { username: name, room: 'general' });
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

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (isSpectator) return;

    if (imagePreview) {
      socket.emit('chat message', { id: makeId(), sender, image: imagePreview, time: formatTime(), reactions: {}, isAnon: anonMode });
      setImagePreview(null); return;
    }

    const text = message.trim();
    if (!text) return;

    // ── Content moderation (client-side fast check) ──────────────────────
    const mod = moderateMessage(text);
    if (mod.blocked) {
      setModBlock({ reason: mod.reason, label: mod.label });
      return;
    }

    let effect = null;
    let effectLabel = null;
    for (const rule of CONSEQUENCE_RULES) {
      if (rule.trigger.test(text)) { effect = rule.effect; effectLabel = rule.label; break; }
    }
    if (effectLabel) showSnack(effectLabel, 'warning');

    socket.emit('chat message', { id: makeId(), sender: anonMode ? 'Anonymous' : sender, message: text, time: formatTime(), reactions: {}, effect, isAnon: anonMode });
    setMessage('');
    clearTimeout(typingTimerRef.current);
    socket.emit('stop typing', { sender });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [message, sender, imagePreview, anonMode, isSpectator]);

  // ── React ─────────────────────────────────────────────────────────────────
  const handleReact = useCallback((msgId, emoji) => {
    if (isSpectator) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const r = { ...m.reactions };
      if (!r[emoji]) r[emoji] = [];
      const idx = r[emoji].indexOf(sender);
      r[emoji] = idx === -1 ? [...r[emoji], sender] : r[emoji].filter(u => u !== sender);
      return { ...m, reactions: r };
    }));
    socket.emit('reaction', { msgId, emoji, user: sender });

    // Cinematic check
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
    r.readAsDataURL(f); e.target.value = '';
  };

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing…`
    : typingUsers.length > 1 ? `${typingUsers.slice(0,2).join(' & ')} are typing…` : '';

  const sidebarContent = (
    <Box sx={{ width: SIDEBAR_W, height: '100%' }}>
      <SidebarContent
        sender={sender} myStatus={myStatus}
        onStatusChange={(s) => { setMyStatus(s); socket.emit('status', { status: s }); }}
        onlineUsers={onlineUsers} currentRoom={currentRoom} roomDisplayName={roomDisplay}
        onOpenRooms={() => setRoomsOpen(true)}
        isSpectator={isSpectator} anonMode={anonMode}
      />
    </Box>
  );

  if (!nameReady) return <ThemeProvider theme={theme}><JoinModal onSubmit={joinChat} /></ThemeProvider>;

  return (
    <ThemeProvider theme={theme}>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      {/* Lightbox */}
      {lightboxSrc && (
        <Box onClick={() => setLightboxSrc(null)} sx={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <Box component="img" src={lightboxSrc} alt="full" sx={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 3 }} />
          <IconButton sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', background: 'rgba(255,255,255,0.1)' }} onClick={() => setLightboxSrc(null)}><CloseIcon /></IconButton>
        </Box>
      )}

      {/* Dialogs */}
      <RoomsDialog open={roomsOpen} onClose={() => setRoomsOpen(false)} onJoin={joinRoom} username={sender} />
      <VibeBoardDialog open={vibeOpen} onClose={() => setVibeOpen(false)} items={vibeItems} onDrop={(url) => socket.emit('vibe drop', { url, sender })} />
      <RoomBrain messages={messages} isOpen={brainOpen} onClose={() => setBrainOpen(false)} />
      {modBlock && <ModerationBlock reason={modBlock.reason} label={modBlock.label} onClose={() => setModBlock(null)} />}

      {/* Toast */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Fade}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} variant="filled" sx={{ borderRadius: 3 }}>{snack.msg}</Alert>
      </Snackbar>

      {/* App Shell */}
      <Box sx={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0a0b14',
        // dvh shrinks when iOS keyboard/toolbar appears — never use 100vh
        height: '100dvh',
      }}>
        <Box sx={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', overflow: 'hidden',
          background: '#131420', border: '1px solid rgba(255,255,255,0.05)',
          ...(!isMobile ? {
            maxWidth: 1024, height: '94vh',
            borderRadius: 4, boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
          } : {}),
        }}>

          {/* Sidebar — permanent on desktop, drawer on mobile */}
          {!isMobile ? (
            <Box sx={{ width: SIDEBAR_W, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>{sidebarContent}</Box>
          ) : (
            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: SIDEBAR_W } }}>
              {sidebarContent}
            </Drawer>
          )}

          {/* Main */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative' }}>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#12131e', flexShrink: 0 }}>
              {isMobile && (
                <Tooltip title="Menu">
                  <IconButton onClick={() => setDrawerOpen(true)} size="small" sx={{ color: '#64748b' }}>
                    <Badge badgeContent={unreadCount > 0 ? unreadCount : 0} color="primary" max={99}>
                      <MenuIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
              )}

              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👾</Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TagIcon sx={{ fontSize: 14, color: '#475569' }} />{roomDisplay}
                  {isSpectator && <Chip label="Spectator" size="small" icon={<VisibilityIcon />} sx={{ height: 18, fontSize: 10, ml: 0.5 }} />}
                </Typography>
                <Typography variant="caption" sx={{ color: typingLabel ? '#f59e0b' : '#475569', fontStyle: typingLabel ? 'italic' : 'normal', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typingLabel || `${onlineUsers.length} online`}
                </Typography>
              </Box>

              {/* Anon toggle */}
              {!isSpectator && (
                <Tooltip title={anonMode ? 'Anonymous ON — click to disable' : 'Send anonymously'}>
                  <Chip icon={<PersonOffIcon sx={{ fontSize: 14 }} />} label="Anon" size="small" onClick={() => setAnonMode(a => !a)}
                    sx={{ cursor: 'pointer', height: 26, fontSize: 11, background: anonMode ? 'rgba(107,114,128,0.3)' : 'rgba(255,255,255,0.06)', border: `1px solid ${anonMode ? 'rgba(107,114,128,0.5)' : 'rgba(255,255,255,0.1)'}`, color: anonMode ? '#d1d5db' : '#64748b' }} />
                </Tooltip>
              )}

              {/* Room Brain */}
              <Tooltip title="Room Brain — AI summary">
                <IconButton size="small" onClick={() => setBrainOpen(true)}
                  sx={{ color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 1.5, width: 32, height: 32, '&:hover': { background: 'rgba(99,102,241,0.2)' } }}>
                  <PsychologyIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Language */}
              <Tooltip title="Auto-translate incoming messages">
                <FormControl size="small" sx={{ minWidth: 42 }}>
                  <Select value={userLang} onChange={e => setUserLang(e.target.value)} variant="standard" disableUnderline
                    IconComponent={() => null}
                    renderValue={(v) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}><TranslateIcon sx={{ fontSize: 14, color: '#64748b' }} /><Typography variant="caption" sx={{ color: '#64748b', fontSize: 11 }}>{v.toUpperCase()}</Typography></Box>}
                    sx={{ color: '#64748b', '& .MuiSelect-select': { py: 0, pr: '0 !important' }, background: 'transparent' }}>
                    {LANGUAGES.map(l => <MenuItem key={l.code} value={l.code} sx={{ fontSize: 13 }}>{l.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Tooltip>

              {/* Connection status */}
              <Tooltip title={connected ? 'Connected' : 'Reconnecting…'}>
                <Chip
                  icon={connected ? <WifiIcon sx={{ fontSize: 14 }} /> : <WifiOffIcon sx={{ fontSize: 14 }} />}
                  label={connected ? 'Live' : 'Off'}
                  size="small"
                  sx={{ height: 24, fontSize: 11, background: connected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: connected ? '#22c55e' : '#ef4444' }}
                />
              </Tooltip>
            </Box>

            {/* Spectator banner */}
            {isSpectator && (
              <Box sx={{ background: 'rgba(148,163,184,0.06)', borderBottom: '1px solid rgba(148,163,184,0.1)', py: 0.75, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <VisibilityIcon sx={{ fontSize: 14 }} /> You are in Spectator Mode — invisible to others, read-only
                </Typography>
              </Box>
            )}

            {/* Messages — ref AND onScroll must be on the same scrollable element */}
            <Box
              ref={messagesBoxRef}
              onScroll={handleScroll}
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                px: { xs: 1.5, sm: 2 },
                pt: 2,
                // Extra bottom padding so the last message is never hidden behind the input bar
                pb: '80px',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                // Custom scrollbar — thin, only on hover
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.07)', borderRadius: 99 },
                '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.14)' },
              }}
            >
              {messages.length === 0 && (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center', userSelect: 'none' }}>
                  <Typography sx={{ fontSize: 48, opacity: 0.2 }}>👾</Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>No messages yet — say hello!</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                    {['Hover to react 😊','5 reactions = 🎉','👻 Anon mode','🏠 Private rooms','🎨 Vibe Board'].map(t => (
                      <Chip key={t} label={t} size="small" sx={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }} />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, idx) => {
                  const isMe   = msg.sender === sender;
                  const prev   = messages[idx - 1];
                  const showAv = !isMe && msg.sender !== prev?.sender;
                  const gap    = idx > 0 && msg.sender === prev?.sender ? 0.5 : 2;
                  return (
                    <Box key={msg.id || idx} sx={{ mt: gap }}>
                      <MessageBubble msg={msg} isMe={isMe} showAvatar={showAv} showName={showAv && !isMe}
                        onReact={handleReact} myUsername={sender} isSpectator={isSpectator} cinematicMsgId={cinematicId} />
                    </Box>
                  );
                })}

                {/* Typing indicator */}
                {typingLabel && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 1.5 }}>
                    <Box sx={{ width: 30, flexShrink: 0 }} />
                    <Box sx={{ background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, borderBottomLeftRadius: 4, px: 1.75, py: 1.2, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {[0,1,2].map(i => (
                        <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', background: '#475569', animation: 'bounceTyping 1s infinite', animationDelay: `${i*150}ms` }} />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
              <Box ref={messagesEndRef} />
            </Box>

            {/* Scroll to bottom — fixed inside the relative main column, above input bar */}
            <Zoom in={!scrollBottom}>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: imagePreview ? 120 : 76,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  pointerEvents: scrollBottom ? 'none' : 'auto',
                }}
              >
                <Box
                  component="button"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setUnreadCount(0);
                    setScrollBottom(true);
                  }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.75, py: 0.75,
                    background: 'linear-gradient(135deg,#6366f1,#9333ea)',
                    color: '#fff', border: 'none', borderRadius: '20px',
                    cursor: 'pointer', fontWeight: 700, fontSize: 12,
                    boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                    whiteSpace: 'nowrap',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 24px rgba(99,102,241,0.65)' },
                    '&:active': { transform: 'translateY(0)' },
                  }}
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                  {unreadCount > 0 ? `${unreadCount} new` : 'Scroll down'}
                </Box>
              </Box>
            </Zoom>

            {/* Image preview */}
            {imagePreview && (
              <Box sx={{ mx: 2, mb: 1, p: 1.5, background: '#1e1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box component="img" src={imagePreview} alt="preview" sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>Image ready to send</Typography>
                  <Typography variant="caption" sx={{ color: '#475569' }}>Enter to send · Esc to cancel</Typography>
                </Box>
                <IconButton size="small" onClick={() => setImagePreview(null)} sx={{ color: '#64748b' }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
            )}

            {/* Input bar */}
            {!isSpectator && (
              <Box sx={{ px: 2, pt: 1, pb: 'calc(10px + env(safe-area-inset-bottom))', background: '#12131e', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                {anonMode && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                    <PersonOffIcon sx={{ fontSize: 13, color: '#9ca3af' }} />
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 11 }}>Sending as Anonymous — others can't see your name</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, px: 1.5, py: 0.75, '&:focus-within': { borderColor: 'rgba(99,102,241,0.5)' }, transition: 'border-color 0.2s' }}>
                  {/* File attach */}
                  <Tooltip title="Attach image">
                    <IconButton component="label" size="small" sx={{ color: '#475569', flexShrink: 0, '&:hover': { color: '#6366f1', background: 'rgba(99,102,241,0.1)' } }}>
                      <AttachFileIcon sx={{ fontSize: 20 }} />
                      <input type="file" accept="image/*" hidden onChange={handleFileInput} />
                    </IconButton>
                  </Tooltip>

                  <TextField
                    inputRef={inputRef}
                    value={message}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                    placeholder={imagePreview ? 'Image attached…' : anonMode ? '👻 Message as Anonymous…' : 'Message the group…'}
                    disabled={!!imagePreview}
                    multiline
                    maxRows={4}
                    variant="standard"
                    fullWidth
                    InputProps={{ disableUnderline: true, style: { color: '#fff', fontSize: 15 } }}
                    sx={{ '& .MuiInputBase-input': { color: '#fff', '&::placeholder': { color: '#334155' } } }}
                  />

                  <Tooltip title="Send (Enter)">
                    <span>
                      <IconButton onClick={sendMessage} disabled={!message.trim() && !imagePreview}
                        sx={{ background: (!message.trim() && !imagePreview) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', width: 36, height: 36, borderRadius: 2, flexShrink: 0, '&:hover': { opacity: 0.88 }, '&.Mui-disabled': { opacity: 0.3, color: '#fff' }, transition: 'all 0.15s' }}>
                        <SendIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#1e293b', mt: 0.5, fontSize: 10 }}>
                  Hover to react · 5 reactions = 🎉 cinematic · Enter to send
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
