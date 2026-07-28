import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Wind, Waves, Sun, Maximize, Minimize, 
  Play, Pause, Sparkles, Image, Clock, Info, Sliders, Compass, Download,
  CloudRain, Mountain, Anchor
} from 'lucide-react';

// Imported generated image assets
import sunsetBeachImg from './assets/images/sunset_beach_waves_1785172400376.webp';
import seascapeImg from './assets/images/beautiful_seascape_1785172287050.webp';
import lagoonImg from './assets/images/tropical_lagoon_1785172300785.webp';

// A hangmotor egyetlen forrása: modulként itt, `?raw` forrásként a standalone exportban
import { createOceanAudio, type OceanAudio, type OceanSoundType } from './audio/oceanAudio.js';
import oceanAudioSource from './audio/oceanAudio.js?raw';
import appStylesSource from './index.css?raw';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface CloudLayer {
  id: number;
  top: string;
  speedFactor: number;
  opacity: number;
  scale: number;
}

interface Preset {
  nameHu: string;
  nameEn: string;
  windSpeed: number;
  waveSpeed: number;
  waveVolume: number;
  timeOfDay: 'sunset' | 'golden' | 'twilight' | 'night';
  soundType: 'sandy' | 'rocky' | 'ocean' | 'rain';
  sunGlow?: number;
}

// A hangprofilok halmazát a hangmotor definiálja
type SoundType = OceanSoundType;

const PRESETS: Preset[] = [
  {
    nameHu: 'Nyugtató Aranyóra',
    nameEn: 'Calming Golden Hour',
    windSpeed: 25,
    waveSpeed: 4.5,
    waveVolume: 0.6,
    timeOfDay: 'golden',
    soundType: 'sandy',
    sunGlow: 90
  },
  {
    nameHu: 'Sziklás Part & Viharos Hullámok',
    nameEn: 'Rocky Shore & Crashing Waves',
    windSpeed: 65,
    waveSpeed: 2.8,
    waveVolume: 0.85,
    timeOfDay: 'sunset',
    soundType: 'rocky',
    sunGlow: 75
  },
  {
    nameHu: 'Csendes Eső a Tengeren',
    nameEn: 'Tranquil Rain on Ocean',
    windSpeed: 30,
    waveSpeed: 5.0,
    waveVolume: 0.7,
    timeOfDay: 'twilight',
    soundType: 'rain',
    sunGlow: 40
  },
  {
    nameHu: 'Mély Nyílt Óceán',
    nameEn: 'Deep Open Ocean Swell',
    windSpeed: 15,
    waveSpeed: 7.5,
    waveVolume: 0.5,
    timeOfDay: 'night',
    soundType: 'ocean',
    sunGlow: 25
  }
];

// Pre-calculated water sparkle positions across the horizon & wave surface
const WATER_SPARKLES = Array.from({ length: 42 }).map((_, i) => {
  const isCorridor = i % 2 === 0;
  const left = isCorridor 
    ? 36 + ((i * 13) % 32) + (Math.sin(i) * 3)
    : 8 + ((i * 19) % 84);
  const top = 48 + ((i * 7) % 42); // 48% to 90% vertical sea region
  const baseScale = isCorridor ? 1.0 + (i % 4) * 0.25 : 0.6 + (i % 3) * 0.2;
  const delay = (i * 0.17) % 2.8;
  const duration = 1.6 + (i % 5) * 0.4;
  return { id: i, left, top, baseScale, delay, duration, isCorridor };
});

const WAVE_CREST_GLINTS = [
  { left: '12%', top: '18px', delay: '0.2s', scale: 1.1 },
  { left: '28%', top: '38px', delay: '0.8s', scale: 1.4 },
  { left: '44%', top: '12px', delay: '1.4s', scale: 1.6 },
  { left: '52%', top: '24px', delay: '0.5s', scale: 1.5 },
  { left: '68%', top: '42px', delay: '1.1s', scale: 1.2 },
  { left: '84%', top: '20px', delay: '1.7s', scale: 1.0 },
];

const WAVE_FOAM_GLINTS = [
  { left: '22%', top: '15px', delay: '0.4s', scale: 1.2 },
  { left: '48%', top: '10px', delay: '1.0s', scale: 1.7 },
  { left: '58%', top: '22px', delay: '0.2s', scale: 1.5 },
  { left: '76%', top: '18px', delay: '1.5s', scale: 1.1 },
];

/**
 * Kiemeli az index.css `@layer utilities { ... }` blokkjának tartalmát.
 * A standalone exportnak csak az animációkra van szüksége: a `@import "tailwindcss"`
 * és a body szabályok ott nem értelmezhetők. A layer-burkot is elhagyjuk, hogy a
 * szabályok normál (rétegen kívüli) specificitással érvényesüljenek.
 */
const extractUtilitiesLayer = (css: string): string => {
  const layerStart = css.indexOf('@layer utilities');
  if (layerStart === -1) return '';

  const blockStart = css.indexOf('{', layerStart);
  if (blockStart === -1) return '';

  let depth = 0;
  for (let i = blockStart; i < css.length; i++) {
    if (css[i] === '{') {
      depth++;
    } else if (css[i] === '}' && --depth === 0) {
      return css.slice(blockStart + 1, i);
    }
  }
  return '';
};

const OCEAN_ANIMATIONS_CSS = extractUtilitiesLayer(appStylesSource);

export default function App() {
  // Language state
  const [lang, setLang] = useState<'hu' | 'en'>('hu');

  // Visual Scene state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [
    { src: sunsetBeachImg, titleHu: 'Aranylemente & Hullámzó Tengerpart', titleEn: 'Golden Sunset & Rolling Shoreline' },
    { src: seascapeImg, titleHu: 'Bíbor Alkonyat a Tenger felett', titleEn: 'Purple Twilight over Ocean' },
    { src: lagoonImg, titleHu: 'Napsütéses Trópusi Lagúna', titleEn: 'Sunny Tropical Lagoon' }
  ];

  // Atmosphere controls
  const [windSpeed, setWindSpeed] = useState<number>(45); // 5 - 100 km/h
  const [waveSpeed, setWaveSpeed] = useState<number>(3.8); // 1.5s - 8s per wave period
  const [soundType, setSoundType] = useState<SoundType>('sandy');
  const [timeOfDay, setTimeOfDay] = useState<'sunset' | 'golden' | 'twilight' | 'night'>('golden');
  const [sunGlow, setSunGlow] = useState<number>(85);

  // Depth-of-field horizon blur calculated dynamically based on wind speed
  const horizonBlurPx = Math.max(0.2, (windSpeed / 100) * 9.5);
  const horizonHazeOpacity = (windSpeed / 100) * 0.45;

  // Audio state & Web Audio refs
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.6);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // A teljes hanggráf egyetlen kezelője (src/audio/oceanAudio.js)
  const oceanAudioRef = useRef<OceanAudio | null>(null);
  // Pending suspend timer: lets the fade-out finish before we park the AudioContext
  const suspendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interface state
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'presets' | 'timer' | 'gallery'>('controls');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [timerMinutes, setTimerMinutes] = useState<number>(10);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Cloud layers
  const cloudLayers: CloudLayer[] = [
    { id: 1, top: '6%', speedFactor: 1.0, opacity: 0.7, scale: 1.2 },
    { id: 2, top: '14%', speedFactor: 1.5, opacity: 0.5, scale: 0.9 },
    { id: 3, top: '22%', speedFactor: 0.8, opacity: 0.6, scale: 1.4 },
    { id: 4, top: '28%', speedFactor: 1.8, opacity: 0.4, scale: 0.8 }
  ];

  // Real-time audio LFO frequency update when waveSpeed changes
  useEffect(() => {
    oceanAudioRef.current?.setWaveSpeed(waveSpeed);
  }, [waveSpeed]);

  // Real-time audio wind volume update when windSpeed changes
  useEffect(() => {
    oceanAudioRef.current?.setWindSpeed(windSpeed);
  }, [windSpeed]);

  // Real-time audio update when soundType changes
  useEffect(() => {
    oceanAudioRef.current?.setSoundType(soundType);
  }, [soundType]);

  // Master Volume update
  useEffect(() => {
    oceanAudioRef.current?.setVolume(audioVolume);
  }, [audioVolume]);

  // Audio Toggle
  const toggleAudio = async () => {
    if (!isPlayingAudio) {
      // A still-pending suspend would silently park the context right after we start it
      if (suspendTimeoutRef.current !== null) {
        clearTimeout(suspendTimeoutRef.current);
        suspendTimeoutRef.current = null;
      }

      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      if (!oceanAudioRef.current) {
        oceanAudioRef.current = createOceanAudio(audioCtxRef.current, {
          volume: audioVolume,
          windSpeed,
          waveSpeed,
          soundType
        });
      }

      oceanAudioRef.current.start();
      setIsPlayingAudio(true);
    } else {
      if (oceanAudioRef.current) {
        oceanAudioRef.current.stop();

        // Let the fade finish, then park the whole graph so it stops burning CPU/battery
        suspendTimeoutRef.current = setTimeout(() => {
          if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
            void audioCtxRef.current.suspend();
          }
          suspendTimeoutRef.current = null;
        }, 350);
      }
      setIsPlayingAudio(false);
    }
  };

  // Tear everything down on unmount: without this the oscillators and noise
  // sources keep running for the lifetime of the page.
  useEffect(() => {
    return () => {
      if (suspendTimeoutRef.current !== null) {
        clearTimeout(suspendTimeoutRef.current);
        suspendTimeoutRef.current = null;
      }
      oceanAudioRef.current?.dispose();
      oceanAudioRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    };
  }, []);

  // Click on image to create interactive water ripples
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size: Math.random() * 60 + 80
    };

    setRipples((prev) => [...prev.slice(-10), newRipple]);

    // Each ripple removes itself by id, so rapid clicking can no longer
    // postpone the cleanup of the older ones.
    const timer = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      rippleTimersRef.current.delete(timer);
    }, 1500);
    rippleTimersRef.current.add(timer);
  };

  // Clear any ripple timers still in flight when the component goes away
  useEffect(() => {
    const timers = rippleTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  // Mindfulness Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSecondsLeft !== null && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (audioCtxRef.current) {
        const chime = audioCtxRef.current.createOscillator();
        const chimeGain = audioCtxRef.current.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(523.25, audioCtxRef.current.currentTime);
        chimeGain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 3);
        chime.connect(chimeGain);
        chimeGain.connect(audioCtxRef.current.destination);
        chime.start();
        chime.stop(audioCtxRef.current.currentTime + 3);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  const startTimer = () => {
    setTimerSecondsLeft(timerMinutes * 60);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimerSecondsLeft(null);
  };

  const applyPreset = (preset: Preset) => {
    setWindSpeed(preset.windSpeed);
    setWaveSpeed(preset.waveSpeed);
    setAudioVolume(preset.waveVolume);
    setTimeOfDay(preset.timeOfDay);
    setSoundType(preset.soundType);
    if (preset.sunGlow !== undefined) setSunGlow(preset.sunGlow);
  };

  const getTimeOfDayFilter = () => {
    switch (timeOfDay) {
      case 'golden':
        return 'bg-gradient-to-t from-orange-950/40 via-amber-900/20 to-amber-500/10 mix-blend-overlay';
      case 'sunset':
        return 'bg-gradient-to-t from-red-950/50 via-rose-900/30 to-amber-600/20 mix-blend-color-burn';
      case 'twilight':
        return 'bg-gradient-to-t from-purple-950/60 via-indigo-900/40 to-pink-900/20 mix-blend-hard-light';
      case 'night':
        return 'bg-gradient-to-t from-slate-950/80 via-blue-950/60 to-indigo-950/40 mix-blend-multiply';
      default:
        return 'bg-transparent';
    }
  };

  const formatTimerTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // EXPORT STANDALONE HTML WITH EMBEDDED SOUND & CONTROLS
  // A hangmotor és az animációk nincsenek újraírva: az oceanAudio.js és az
  // index.css utilities blokkja `?raw` importtal, szó szerint kerül be ide.
  const downloadStandaloneHtml = async () => {
    try {
      const response = await fetch(images[currentImageIndex].src);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Image = reader.result as string;

        const standaloneHtml = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Naplementés Tengerpart & Mélységélesség Elmosódás</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 100vw; height: 100vh; overflow: hidden; background: #0b132b;
      font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; user-select: none;
    }
    .scene { position: relative; width: 100%; height: 100%; overflow: hidden; cursor: crosshair; }
    .bg-img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
    .horizon-blur {
      position: absolute; top: 32%; left: 0; right: 0; height: 28%; pointer-events: none; z-index: 5;
      backdrop-filter: blur(var(--horizon-blur, ${horizonBlurPx.toFixed(1)}px));
      -webkit-backdrop-filter: blur(var(--horizon-blur, ${horizonBlurPx.toFixed(1)}px));
      mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
    }
    .wave-1 { position: absolute; bottom: 0; left: 0; right: 0; height: 180px; pointer-events: none; }
    .wave-2 { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; pointer-events: none; }
    .cloud { position: absolute; left: 0; width: 100%; pointer-events: none; }
    .cloud-blob {
      width: 600px; height: 120px; border-radius: 9999px;
      background: linear-gradient(90deg, transparent, rgba(254, 243, 199, 0.45), transparent);
      filter: blur(30px);
    }
    .controls {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px;
      padding: 16px 24px; display: flex; flex-direction: column; gap: 12px;
      width: 92%; max-width: 520px; z-index: 10; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    .row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; }
    input[type=range] { width: 100%; accent-color: #fbbf24; cursor: pointer; }
    select, button {
      background: linear-gradient(90deg, #f59e0b, #d97706); color: #0f172a; border: none;
      padding: 10px 14px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 13px;
    }
    select { background: #1e293b; color: #f8fafc; border: 1px solid #475569; }
    .ripple {
      position: absolute; border-radius: 50%; border: 2px solid rgba(253, 230, 138, 0.8);
      background: rgba(253, 230, 138, 0.15); pointer-events: none; animation: ping 1.2s cubic-bezier(0,0,0.2,1) forwards;
    }
    @keyframes ping {
      0% { transform: scale(0.2); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    /* Az alábbi animációk az src/index.css @layer utilities blokkjából származnak */
${OCEAN_ANIMATIONS_CSS}
  </style>
</head>
<body>
  <div class="scene" id="scene">
    <img src="${base64Image}" class="bg-img animate-ocean-swell" id="bgImg" style="--wave-period: ${waveSpeed}s">
    <div class="horizon-blur" id="horizonBlurLayer"></div>
    <div class="cloud animate-cloud-r" style="top: 10%; --cloud-period: ${1200 / windSpeed}s"><div class="cloud-blob"></div></div>
    <div class="cloud animate-cloud-r" style="top: 22%; --cloud-period: ${1800 / windSpeed}s"><div class="cloud-blob"></div></div>
    <div class="wave-1 animate-wave-1" id="wave1" style="--wave-period: ${waveSpeed}s">
      <svg width="100%" height="100%" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="rgba(254, 243, 199, 0.18)">
        <path d="M0,0 C150,90 350,-40 500,40 C650,110 900,10 1200,50 L1200,120 L0,120 Z"></path>
      </svg>
    </div>
    <div class="wave-2 animate-wave-2" id="wave2" style="--wave-period: ${waveSpeed}s">
      <svg width="100%" height="100%" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="rgba(255, 255, 255, 0.25)">
        <path d="M0,30 C300,10 600,80 900,20 C1050,0 1150,40 1200,30 L1200,120 L0,120 Z"></path>
      </svg>
    </div>
  </div>

  <div class="controls">
    <div class="row">
      <span>Tengeri Hang Típusa:</span>
      <select id="soundTypeSel">
        <option value="sandy" ${soundType === 'sandy' ? 'selected' : ''}>Homokos Part</option>
        <option value="rocky" ${soundType === 'rocky' ? 'selected' : ''}>Sziklás Part</option>
        <option value="ocean" ${soundType === 'ocean' ? 'selected' : ''}>Nyílt Óceán</option>
        <option value="rain" ${soundType === 'rain' ? 'selected' : ''}>Eső a Tengeren</option>
      </select>
      <button id="soundBtn">Hang Indítása 🔊</button>
    </div>
    <div>
      <div class="row"><span>Szélsebesség (Sztatikus & Elmosódás):</span><span id="windVal">${windSpeed} km/h</span></div>
      <input type="range" id="windSlider" min="5" max="100" value="${windSpeed}">
    </div>
    <div>
      <div class="row"><span>Hullámzás Ritmusa:</span><span id="waveVal">${waveSpeed}s</span></div>
      <input type="range" id="waveSlider" min="1.5" max="8" step="0.1" value="${waveSpeed}">
    </div>
    <div>
      <div class="row"><span>Napsütés Intenzitása (Csillogás):</span><span id="sunVal">${sunGlow}%</span></div>
      <input type="range" id="sunSlider" min="10" max="100" value="${sunGlow}">
    </div>
  </div>

  <script type="module">
// ==== src/audio/oceanAudio.js — szó szerint, ugyanaz a motor, mint a React appban ====
${oceanAudioSource}
// ==== /src/audio/oceanAudio.js ====

    const soundBtn = document.getElementById('soundBtn');
    const soundTypeSel = document.getElementById('soundTypeSel');
    const windSlider = document.getElementById('windSlider');
    const waveSlider = document.getElementById('waveSlider');
    const scene = document.getElementById('scene');

    let audioCtx = null;
    let ocean = null;
    let isPlaying = false;
    let suspendTimeout = null;

    soundBtn.addEventListener('click', async () => {
      if (!isPlaying) {
        if (suspendTimeout !== null) {
          clearTimeout(suspendTimeout);
          suspendTimeout = null;
        }
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        if (!ocean) {
          ocean = createOceanAudio(audioCtx, {
            windSpeed: parseFloat(windSlider.value),
            waveSpeed: parseFloat(waveSlider.value),
            soundType: soundTypeSel.value
          });
        }
        ocean.start();
        isPlaying = true;
      } else {
        if (ocean) ocean.stop();
        // Hagyjuk lefutni a fade-out-ot, utána parkoljuk le a kontextust
        suspendTimeout = setTimeout(() => {
          if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
          suspendTimeout = null;
        }, 350);
        isPlaying = false;
      }
      soundBtn.textContent = isPlaying ? 'Hang Némítása 🔇' : 'Hang Indítása 🔊';
    });

    soundTypeSel.addEventListener('change', (e) => {
      if (ocean) ocean.setSoundType(e.target.value);
    });

    windSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('windVal').textContent = val + ' km/h';
      document.querySelectorAll('.cloud').forEach(c => c.style.setProperty('--cloud-period', (1200 / val) + 's'));
      const blurPx = Math.max(0.2, (val / 100) * 9.5);
      document.getElementById('horizonBlurLayer').style.setProperty('--horizon-blur', blurPx + 'px');
      if (ocean) ocean.setWindSpeed(val);
    });

    waveSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('waveVal').textContent = val + 's';
      ['bgImg', 'wave1', 'wave2'].forEach(id => {
        document.getElementById(id).style.setProperty('--wave-period', val + 's');
      });
      if (ocean) ocean.setWaveSpeed(val);
    });

    scene.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      ripple.style.left = (e.clientX - 40) + 'px';
      ripple.style.top = (e.clientY - 40) + 'px';
      ripple.style.width = '80px'; ripple.style.height = '80px';
      scene.appendChild(ripple);
      setTimeout(() => ripple.remove(), 1200);
    });
  <\/script>
</body>
</html>`;

        const blob = new Blob([standaloneHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'naplementes_tengerpart.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      
      {/* BACKGROUND SEASCAPE IMAGE & ANIMATED WAVE LAYERS */}
      <div 
        className="absolute inset-0 cursor-crosshair overflow-hidden"
        onClick={handleSceneClick}
      >
        {/* Base Seascape Image with Ocean Swell Animation */}
        <img 
          src={images[currentImageIndex].src} 
          alt="Tengerparti Naplemente" 
          className="w-full h-full object-cover object-center scale-105 animate-ocean-swell transition-all duration-1000 ease-in-out"
          style={{ '--wave-period': `${waveSpeed}s` } as React.CSSProperties}
        />

        {/* DYNAMIC HORIZON DEPTH-OF-FIELD BLUR & ATMOSPHERIC SEA SPRAY MIST LAYER */}
        <div 
          className="absolute top-[32%] inset-x-0 h-[28%] pointer-events-none transition-all duration-300 ease-out z-[5]"
          style={{
            backdropFilter: `blur(${horizonBlurPx.toFixed(1)}px)`,
            WebkitBackdropFilter: `blur(${horizonBlurPx.toFixed(1)}px)`,
            maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
          }}
        >
          {/* Sea Spray / Heat Mist Band overlay that intensifies with high wind speed */}
          <div 
            className="w-full h-full bg-gradient-to-b from-amber-100/10 via-amber-200/20 to-sky-100/10 transition-opacity duration-300"
            style={{ opacity: horizonHazeOpacity }}
          />
        </div>

        {/* Dynamic Sunset / Twilight Color Filter */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${getTimeOfDayFilter()}`} />

        {/* SUN GLOW & REFLECTION */}
        <div 
          className="absolute top-[38%] left-[52%] -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none animate-sun-glow transition-all duration-700"
          style={{
            background: timeOfDay === 'night' 
              ? 'radial-gradient(circle, rgba(224,242,254,0.4) 0%, rgba(186,230,253,0.15) 45%, transparent 70%)'
              : `radial-gradient(circle, rgba(253,186,116,${sunGlow / 100}) 0%, rgba(249,115,22,${sunGlow / 150}) 40%, transparent 75%)`
          }}
        />

        {/* RAIN DROPS OVERLAY WHEN 'RAIN' SOUND TYPE IS ACTIVE */}
        {soundType === 'rain' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-60">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[1px] bg-gradient-to-b from-transparent via-sky-200/60 to-transparent animate-pulse"
                style={{
                  top: `${(i * 13) % 100}%`,
                  left: `${(i * 7) % 100}%`,
                  height: `${20 + (i % 5) * 15}px`,
                  transform: 'rotate(-12deg)',
                  animationDuration: `${0.8 + (i % 3) * 0.3}s`
                }}
              />
            ))}
          </div>
        )}

        {/* DRIFTING CLOUDS PROPORTIONAL TO WIND SPEED */}
        {cloudLayers.map((cloud) => (
          <div
            key={cloud.id}
            className="absolute left-0 w-full pointer-events-none animate-cloud-r"
            style={{
              top: cloud.top,
              opacity: cloud.opacity,
              transform: `scale(${cloud.scale})`,
              '--cloud-period': `${(1400 / (windSpeed * cloud.speedFactor))}s`
            } as React.CSSProperties}
          >
            <div className="w-[650px] h-36 rounded-full bg-gradient-to-r from-transparent via-amber-100/50 to-transparent blur-3xl" />
          </div>
        ))}

        {/* SEA SHIMMER & SUN LIGHT REFLECTION OVER WATER */}
        <div className="absolute top-[52%] inset-x-0 bottom-0 pointer-events-none bg-gradient-to-b from-amber-400/15 via-orange-500/10 to-transparent animate-water-shimmer mix-blend-soft-light" />

        {/* SUNLIGHT REFLECTION CORRIDOR ON WATER SURFACE */}
        <div 
          className="absolute top-[48%] left-[36%] w-[28%] bottom-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: timeOfDay === 'night'
              ? 'linear-gradient(to bottom, rgba(186,230,253,0.2) 0%, rgba(125,211,252,0.1) 40%, transparent 100%)'
              : `linear-gradient(to bottom, rgba(254,240,138,${(sunGlow / 100) * 0.45}) 0%, rgba(251,146,60,${(sunGlow / 100) * 0.25}) 50%, transparent 100%)`,
            // Ellipszis maszk: oldalt is kifut, így nincs éles bal/jobb perem
            maskImage: 'radial-gradient(ellipse 55% 100% at 50% 0%, black 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 100% at 50% 0%, black 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
            filter: 'blur(40px)',
          }}
        />

        {/* DYNAMIC WATER SURFACE SPARKLES (SCALES WITH SUN INTENSITY) */}
        <div className="absolute top-[48%] inset-x-0 bottom-12 pointer-events-none overflow-hidden z-[6]">
          {WATER_SPARKLES.slice(0, Math.max(8, Math.floor((sunGlow / 100) * WATER_SPARKLES.length))).map((sparkle) => {
            const isCorridorSparkle = sparkle.isCorridor;
            const sparkleScale = (sparkle.baseScale * (0.6 + (sunGlow / 100) * 0.6)).toFixed(2);
            const maxOpacity = Math.min(1, (sunGlow / 100) * (isCorridorSparkle ? 0.95 : 0.75));
            return (
              <div
                key={sparkle.id}
                className="absolute animate-sparkle-point flex items-center justify-center"
                style={{
                  left: `${sparkle.left}%`,
                  top: `${sparkle.top - 48}%`,
                  animationDelay: `${sparkle.delay}s`,
                  '--sparkle-duration': `${sparkle.duration}s`,
                  '--sparkle-scale': sparkleScale,
                  '--sparkle-max-opacity': maxOpacity,
                } as React.CSSProperties}
              >
                {/* Diamond / Star Sparkle Glint */}
                <div 
                  className={`rounded-full ${
                    isCorridorSparkle 
                      ? 'bg-amber-100 shadow-[0_0_10px_rgba(254,240,138,1)]' 
                      : 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                  }`}
                  style={{
                    width: isCorridorSparkle ? '4px' : '3px',
                    height: isCorridorSparkle ? '4px' : '3px',
                  }}
                />
                {/* Flare Cross Effect for brighter corridor glints */}
                {isCorridorSparkle && (
                  <div className="absolute w-3.5 h-[1px] bg-amber-200/90 blur-[0.2px] rotate-45" />
                )}
              </div>
            );
          })}
        </div>

        {/* ROLLING SVG SHORELINE WAVES WITH HIGH VISIBILITY & CREST LIGHT POINTS */}
        {/* Wave 1: Rolling Crest */}
        <div 
          className="absolute -bottom-8 inset-x-0 h-52 pointer-events-none animate-wave-1 overflow-hidden"
          style={{ '--wave-period': `${waveSpeed}s` } as React.CSSProperties}
        >
          <svg className="w-full h-full text-amber-100/18 fill-current transform scale-y-125" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C150,90 350,-40 500,40 C650,110 900,10 1200,50 L1200,120 L0,120 Z"></path>
          </svg>
          {/* Dynamic Sparkle Points on Wave 1 Crest */}
          <div className="absolute inset-0 pointer-events-none">
            {WAVE_CREST_GLINTS.map((glint, idx) => (
              <div
                key={`wave1-glint-${idx}`}
                className="absolute animate-crest-star flex items-center justify-center"
                style={{
                  left: glint.left,
                  top: glint.top,
                  animationDelay: glint.delay,
                  '--crest-twinkle-period': `${Math.max(1.2, waveSpeed * 0.5)}s`,
                  '--star-scale': (glint.scale * (0.6 + (sunGlow / 100) * 0.6)).toFixed(2),
                  '--crest-sparkle-opacity': Math.min(1, (sunGlow / 100) * 0.95),
                } as React.CSSProperties}
              >
                <div className="w-1.5 h-1.5 bg-amber-100 rounded-full shadow-[0_0_8px_rgba(253,224,71,0.9)]" />
                <Sparkles className="w-3.5 h-3.5 text-amber-200 opacity-90 absolute" />
              </div>
            ))}
          </div>
        </div>

        {/* Wave 2: Shore Foam Surge */}
        <div 
          className="absolute -bottom-8 inset-x-0 h-40 pointer-events-none animate-wave-2 overflow-hidden"
          style={{ '--wave-period': `${waveSpeed}s` } as React.CSSProperties}
        >
          <svg className="w-full h-full text-white/25 fill-current" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,30 C300,10 600,80 900,20 C1050,0 1150,40 1200,30 L1200,120 L0,120 Z"></path>
          </svg>
          {/* Dynamic Sparkle Points on Wave 2 Shore Surge Crest */}
          <div className="absolute inset-0 pointer-events-none">
            {WAVE_FOAM_GLINTS.map((glint, idx) => (
              <div
                key={`wave2-glint-${idx}`}
                className="absolute animate-crest-star flex items-center justify-center"
                style={{
                  left: glint.left,
                  top: glint.top,
                  animationDelay: glint.delay,
                  '--crest-twinkle-period': `${Math.max(1.0, waveSpeed * 0.45)}s`,
                  '--star-scale': (glint.scale * (0.6 + (sunGlow / 100) * 0.6)).toFixed(2),
                  '--crest-sparkle-opacity': Math.min(1, (sunGlow / 100) * 0.9),
                } as React.CSSProperties}
              >
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,1)]" />
                <div className="w-2.5 h-[1px] bg-amber-100/80 absolute rotate-45" />
              </div>
            ))}
          </div>
        </div>

        {/* Wave 3: White Foam Wash */}
        <div 
          className="absolute -bottom-8 inset-x-0 h-28 pointer-events-none animate-wave-foam"
          style={{ '--wave-period': `${waveSpeed}s` } as React.CSSProperties}
        >
          <div className="w-full h-full bg-gradient-to-t from-white/35 via-white/15 to-transparent blur-sm" />
        </div>

        {/* SWAYING PALM LEAF SILHOUETTE RESPONDING TO WIND */}
        <div 
          className="absolute bottom-0 right-0 w-64 h-80 pointer-events-none opacity-80 animate-palm-sway"
          style={{
            '--sway-period': `${6 / (windSpeed / 15)}s`,
            '--wind-tilt': `${windSpeed / 4}deg`
          } as React.CSSProperties}
        >
          <svg viewBox="0 0 200 300" className="w-full h-full fill-slate-950/80">
            <path d="M180,300 Q150,180 120,100 Q100,50 60,30 Q90,70 110,130 Q140,220 180,300 Z" />
            <path d="M120,100 Q60,80 0,90 Q40,110 100,120 Z" />
            <path d="M120,100 Q50,40 10,10 Q50,60 105,100 Z" />
            <path d="M120,100 Q110,30 100,0 Q120,40 122,95 Z" />
          </svg>
        </div>

        {/* INTERACTIVE WATER RIPPLES ON CLICK */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute rounded-full border-2 border-amber-200/80 bg-amber-300/20 pointer-events-none animate-ping"
            style={{
              left: r.x - r.size / 2,
              top: r.y - r.size / 2,
              width: r.size,
              height: r.size,
              animationDuration: '1.2s'
            }}
          />
        ))}

        {/* ZEN MODE EXIT BUTTON */}
        {isZenMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <span>{lang === 'hu' ? 'Kattints az ablakra a hullámokhoz' : 'Click screen for ripples'}</span>
            <button 
              onClick={() => setIsZenMode(false)}
              className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
            >
              <Minimize className="w-3.5 h-3.5 inline mr-1" />
              {lang === 'hu' ? 'Kilépés' : 'Exit'}
            </button>
          </div>
        )}
      </div>

      {/* TOP HEADER */}
      {!isZenMode && (
        <header className="absolute top-0 inset-x-0 p-4 md:p-6 flex items-center justify-between z-20 pointer-events-auto bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/30 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-orange-100 to-amber-300 bg-clip-text text-transparent">
                {lang === 'hu' ? 'Naplementés Tengerpart & Hullámok' : 'Ocean Sunset & Live Waves'}
              </h1>
              <p className="text-xs text-slate-300/80 flex items-center gap-1.5 font-medium">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'hu' ? 'Élő hullámzás, szélmozgás és mélységélesség elmosódás' : 'Dynamic waves, breeze motion & depth-of-field horizon blur'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Download Standalone HTML Button */}
            <button
              onClick={downloadStandaloneHtml}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              title={lang === 'hu' ? 'Letöltés önálló HTML fájlként (hanggal)' : 'Download as offline HTML file (with audio)'}
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'hu' ? 'Letöltés HTML-ként' : 'Export HTML'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                isPlayingAudio 
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/25 hover:bg-amber-400' 
                  : 'bg-slate-900/80 text-slate-200 border border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              {isPlayingAudio ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {isPlayingAudio ? (lang === 'hu' ? 'Hang Be' : 'Sound On') : (lang === 'hu' ? 'Hang Indítása' : 'Play Sound')}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              {lang === 'hu' ? 'EN' : 'HU'}
            </button>

            {/* Zen Mode */}
            <button
              onClick={() => setIsZenMode(true)}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-all"
              title={lang === 'hu' ? 'Zen Képernyő' : 'Zen View'}
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* CONTROL HUD */}
      {!isZenMode && (
        <div className="absolute bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-2xl w-full z-20 pointer-events-auto">
          
          {/* TABS */}
          <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-slate-950/80 mb-3">
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'controls' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{lang === 'hu' ? 'Beállítások & Hang' : 'Controls & Audio'}</span>
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'presets' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'hu' ? 'Hangulatok' : 'Presets'}</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'gallery' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>{lang === 'hu' ? 'Tengeri Képek' : 'Seascapes'}</span>
            </button>

            <button
              onClick={() => setActiveTab('timer')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'timer' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'hu' ? 'Meditáció' : 'Timer'}</span>
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl text-slate-200">
            
            {/* TAB 1: CONTROLS & SOUND PROFILE */}
            {activeTab === 'controls' && (
              <div className="space-y-4">
                
                {/* TENGERI HANG TÍPUS VÁLASZTÓ (SOUND TYPE SELECTION) */}
                <div>
                  <label className="block text-xs font-medium text-amber-300 mb-2 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'hu' ? 'Tengeri Hang Típusa & Karakter' : 'Ocean Sound Profile & Ambience'}</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { 
                        id: 'sandy', 
                        labelHu: 'Homokos Part', 
                        labelEn: 'Sandy Shore', 
                        descHu: 'Lágy morajlás', 
                        descEn: 'Gentle swell',
                        icon: Waves 
                      },
                      { 
                        id: 'rocky', 
                        labelHu: 'Sziklás Part', 
                        labelEn: 'Rocky Shore', 
                        descHu: 'Erősebb tajték', 
                        descEn: 'Crashing splash',
                        icon: Mountain 
                      },
                      { 
                        id: 'ocean', 
                        labelHu: 'Nyílt Óceán', 
                        labelEn: 'Open Ocean', 
                        descHu: 'Mély basszus swell', 
                        descEn: 'Deep ocean bass',
                        icon: Anchor 
                      },
                      { 
                        id: 'rain', 
                        labelHu: 'Eső a Tengeren', 
                        labelEn: 'Rain on Sea', 
                        descHu: 'Enyhe esőkopogás', 
                        descEn: 'Gentle rain drops',
                        icon: CloudRain 
                      }
                    ].map((type) => {
                      const IconComp = type.icon;
                      const isSelected = soundType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setSoundType(type.id as SoundType)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-amber-200">
                              {lang === 'hu' ? type.labelHu : type.labelEn}
                            </span>
                            <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {lang === 'hu' ? type.descHu : type.descEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wind Speed Slider with Dynamic Depth-of-Field Horizon Blur Indicator */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5 text-slate-300">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Wind className="w-3.5 h-3.5 text-amber-400" />
                      {lang === 'hu' ? 'Szélsebesség & Horizont Mélységélesség' : 'Wind Speed & Horizon Depth-of-Field'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-300/80 font-mono">
                        {lang === 'hu' ? `Horizont elmosódás: ${horizonBlurPx.toFixed(1)}px` : `DOF Blur: ${horizonBlurPx.toFixed(1)}px`}
                      </span>
                      <span className="text-amber-400 font-bold">{windSpeed} km/h</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{lang === 'hu' ? 'Csendes szellő (Éles horizont)' : 'Gentle breeze (Sharp horizon)'}</span>
                    <span>{lang === 'hu' ? 'Erős tengeri szél (Mélységélességi elmosódás)' : 'Gale (Heavy DOF blur)'}</span>
                  </div>
                </div>

                {/* Wave Speed Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5 text-slate-300">
                    <span className="flex items-center gap-1.5 text-sky-300">
                      <Waves className="w-3.5 h-3.5 text-sky-400" />
                      {lang === 'hu' ? 'Hullámzás Ritmusa (Tengeri Hullám Sebesség)' : 'Wave Rhythm Speed (Sea Swell Period)'}
                    </span>
                    <span className="text-sky-400 font-bold">{waveSpeed}s</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="8"
                    step="0.1"
                    value={waveSpeed}
                    onChange={(e) => setWaveSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{lang === 'hu' ? 'Gyors hullámtörés' : 'Fast crash'}</span>
                    <span>{lang === 'hu' ? 'Lassú ringatózás' : 'Slow swell'}</span>
                  </div>
                </div>

                {/* Sunshine Intensity & Water Sparkle Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5 text-slate-300">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      {lang === 'hu' ? 'Napsütés Intenzitása & Víz Csillogás' : 'Sunshine Intensity & Sea Sparkle'}
                    </span>
                    <span className="text-amber-400 font-bold">{sunGlow}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={sunGlow}
                    onChange={(e) => setSunGlow(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{lang === 'hu' ? 'Finom fénypontok' : 'Soft glints'}</span>
                    <span>{lang === 'hu' ? 'Szikrázó vízfelszín & taraj csillogás' : 'Dazzling sparkles & crest glints'}</span>
                  </div>
                </div>

                {/* Sunset Color Scheme Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    {lang === 'hu' ? 'Naplemente Színvilág & Hangulat' : 'Sunset Lighting & Atmosphere'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'golden', labelHu: 'Aranyóra', labelEn: 'Golden', color: 'from-amber-500 to-orange-600' },
                      { id: 'sunset', labelHu: 'Piros Végzet', labelEn: 'Vibrant Red', color: 'from-rose-600 to-amber-600' },
                      { id: 'twilight', labelHu: 'Bíbor Alkony', labelEn: 'Purple Twilight', color: 'from-purple-600 to-indigo-700' },
                      { id: 'night', labelHu: 'Csendes Éjszaka', labelEn: 'Night', color: 'from-slate-800 to-blue-950' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setTimeOfDay(mode.id as typeof timeOfDay)}
                        className={`p-2 rounded-xl text-[11px] font-medium flex flex-col items-center gap-1.5 border transition-all ${
                          timeOfDay === mode.id
                            ? 'border-amber-400 bg-amber-500/10 text-white font-bold'
                            : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-full h-2 rounded-full bg-gradient-to-r ${mode.color}`} />
                        <span>{lang === 'hu' ? mode.labelHu : mode.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider if audio is playing */}
                {isPlayingAudio && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-xs text-slate-300 w-8 text-right font-medium">{Math.round(audioVolume * 100)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 mb-2">
                  {lang === 'hu' ? 'Válassz egy előre beállított tengeri hangulatot:' : 'Choose a handcrafted coastal mood preset:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition-all flex items-start justify-between group"
                    >
                      <div>
                        <h3 className="text-xs font-bold text-amber-200 group-hover:text-amber-300">
                          {lang === 'hu' ? preset.nameHu : preset.nameEn}
                        </h3>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {lang === 'hu' ? `Szél: ${preset.windSpeed} km/h • Hullám: ${preset.waveSpeed}s` : `Wind: ${preset.windSpeed} km/h • Wave: ${preset.waveSpeed}s`}
                        </p>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: GALLERY */}
            {activeTab === 'gallery' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 mb-2">
                  {lang === 'hu' ? 'Válassz a gyönyörű nagyfelbontású tengerparti tájképek közül:' : 'Select from high-definition seascape captures:'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                        currentImageIndex === idx 
                          ? 'border-amber-400 ring-2 ring-amber-400/30 scale-[1.02]' 
                          : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                      }`}
                    >
                      <img src={img.src} alt={img.titleHu} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-1.5 flex items-end">
                        <span className="text-[9px] font-semibold text-slate-200 line-clamp-1">
                          {lang === 'hu' ? img.titleHu : img.titleEn}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MINDFULNESS TIMER */}
            {activeTab === 'timer' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-3xl font-mono font-bold text-amber-300 tracking-wider">
                    {timerSecondsLeft !== null ? formatTimerTime(timerSecondsLeft) : `${timerMinutes}:00`}
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {isTimerRunning 
                      ? (lang === 'hu' ? 'Nyugtató meditáció folyamatban...' : 'Meditation session in progress...') 
                      : (lang === 'hu' ? 'Állítsd be a meditációs időtartamot:' : 'Set your relaxation timer:')}
                  </p>
                </div>

                {!isTimerRunning ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[5, 10, 15, 20].map((m) => (
                        <button
                          key={m}
                          onClick={() => setTimerMinutes(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            timerMinutes === m
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {m} {lang === 'hu' ? 'perc' : 'min'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={startTimer}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{lang === 'hu' ? 'Meditáció Indítása' : 'Start Session'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    <span>{lang === 'hu' ? 'Időzítő Leállítása' : 'Stop Timer'}</span>
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* FOOTER HINT */}
      {!isZenMode && (
        <div className="absolute bottom-1 right-4 z-10 hidden lg:flex items-center gap-1.5 text-[10px] text-slate-300 bg-slate-950/40 px-3 py-1 rounded-full backdrop-blur-sm">
          <Info className="w-3 h-3 text-amber-400" />
          <span>{lang === 'hu' ? 'Kattints a tengerre vízhullámok keltéséhez!' : 'Click sea to generate ripples!'}</span>
        </div>
      )}

    </div>
  );
}
