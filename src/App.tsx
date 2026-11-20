import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2, VolumeX, Wind, Waves, Sun, Maximize, Minimize,
  Play, Pause, Sparkles, Image, Clock, Sliders, Download,
  CloudRain, Mountain, Anchor, PanelBottomClose, PanelBottomOpen, PanelRightClose, PanelRightOpen,
  type LucideIcon
} from 'lucide-react';

// Imported generated image assets
import sunsetBeachImg from './assets/images/sunset_beach_waves_1785172400376.webp';
import seascapeImg from './assets/images/beautiful_seascape_1785172287050.webp';
import lagoonImg from './assets/images/tropical_lagoon_1785172300785.webp';

// A hangmotor egyetlen forrása: modulként itt, `?raw` forrásként a standalone exportban
import { createOceanAudio, type OceanAudio, type OceanSoundType } from './audio/oceanAudio.js';
import oceanAudioSource from './audio/oceanAudio.js?raw';
import appStylesSource from './index.css?raw';

export type Lang = 'hu' | 'en' | 'ro' | 'de';

/** Egy szöveg mind a négy nyelven. Az adattömbök nyelvi mezői is ilyenek. */
type LangMap = Record<Lang, string>;

const LANGS: Lang[] = ['hu', 'en', 'ro', 'de'];
const LANG_STORAGE_KEY = 'gallery-lang';

const isLang = (v: string | null | undefined): v is Lang =>
  !!v && (LANGS as string[]).includes(v);

/**
 * Kezdeti nyelv: mentett választás → böngésző nyelve → magyar.
 * A useState inicializálójából hívjuk, ezért lazy és SSR-biztos.
 */
const detectInitialLang = (): Lang => {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // privát mód / letiltott storage — a böngésző nyelvére esünk vissza
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : '';
  return isLang(nav) ? nav : 'hu';
};

/**
 * Központi fordítási szótár. Kulcsonként egymás mellett a négy nyelv,
 * hogy egy szöveg összes változata egy helyen legyen lektorálható.
 */
const T = {
  exit: { hu: 'Kilépés', en: 'Exit', ro: 'Ieșire', de: 'Beenden' },
  title: {
    hu: 'Tengermoraj',
    en: 'Ocean Murmur',
    ro: 'Freamătul Mării',
    de: 'Meeresrauschen'
  },
  downloadTitle: {
    hu: 'Letöltés önálló HTML fájlként (hanggal)',
    en: 'Download as offline HTML file (with audio)',
    ro: 'Descarcă ca fișier HTML independent (cu sunet)',
    de: 'Als eigenständige HTML-Datei herunterladen (mit Ton)'
  },
  soundOn: { hu: 'Hang Be', en: 'Sound On', ro: 'Sunet Pornit', de: 'Ton An' },
  playSound: { hu: 'Hang Indítása', en: 'Play Sound', ro: 'Pornește Sunetul', de: 'Ton Abspielen' },
  zenView: { hu: 'Zen Képernyő', en: 'Zen View', ro: 'Mod Zen', de: 'Zen-Ansicht' },
  panelHide: { hu: 'Panel elrejtése', en: 'Hide panel', ro: 'Ascunde panoul', de: 'Panel ausblenden' },
  panelShow: { hu: 'Panel megjelenítése', en: 'Show panel', ro: 'Afișează panoul', de: 'Panel einblenden' },
  tabControls: {
    hu: 'Beállítások & Hang',
    en: 'Controls & Audio',
    ro: 'Setări & Sunet',
    de: 'Einstellungen & Ton'
  },
  tabPresets: { hu: 'Hangulatok', en: 'Presets', ro: 'Atmosfere', de: 'Stimmungen' },
  tabGallery: { hu: 'Tengeri Képek', en: 'Seascapes', ro: 'Peisaje Marine', de: 'Meeresbilder' },
  tabTimer: { hu: 'Meditáció', en: 'Timer', ro: 'Meditație', de: 'Meditation' },
  soundSection: {
    hu: 'Tengeri Hang Típusa & Karakter',
    en: 'Ocean Sound Profile & Ambience',
    ro: 'Tipul și Caracterul Sunetului Marin',
    de: 'Meeresklang-Profil & Charakter'
  },
  languageLabel: { hu: 'Nyelv', en: 'Language', ro: 'Limbă', de: 'Sprache' },
  volumeLabel: { hu: 'Hangerő', en: 'Volume', ro: 'Volum', de: 'Lautstärke' },
  windLabel: {
    hu: 'Szélsebesség & Horizont Mélységélesség',
    en: 'Wind Speed & Horizon Depth-of-Field',
    ro: 'Viteza Vântului & Estomparea Orizontului',
    de: 'Windgeschwindigkeit & Tiefenschärfe'
  },
  windMin: {
    hu: 'Csendes szellő (Éles horizont)',
    en: 'Gentle breeze (Sharp horizon)',
    ro: 'Briză lină (orizont clar)',
    de: 'Sanfte Brise (scharfer Horizont)'
  },
  windMax: {
    hu: 'Erős tengeri szél (Mélységélességi elmosódás)',
    en: 'Gale (Heavy DOF blur)',
    ro: 'Vânt puternic (estompare intensă)',
    de: 'Starker Seewind (starke Unschärfe)'
  },
  waveLabel: {
    hu: 'Hullámhang Ritmusa (Morajlás Periódusa)',
    en: 'Wave Sound Rhythm (Swell Period)',
    ro: 'Ritmul Sunetului Valurilor (Perioada Freamătului)',
    de: 'Wellenklang-Rhythmus (Rauschperiode)'
  },
  waveMin: {
    hu: 'Sűrű, gyors morajlás',
    en: 'Fast, dense swell',
    ro: 'Freamăt des și rapid',
    de: 'Dichtes, schnelles Rauschen'
  },
  waveMax: {
    hu: 'Lassú, mély lélegzés',
    en: 'Slow, deep breathing',
    ro: 'Respirație lentă, adâncă',
    de: 'Langsames, tiefes Atmen'
  },
  sunLabel: {
    hu: 'Napsütés Intenzitása & Víz Csillogás',
    en: 'Sunshine Intensity & Sea Sparkle',
    ro: 'Intensitatea Soarelui & Sclipirea Apei',
    de: 'Sonnenintensität & Wasserglitzern'
  },
  sunMin: { hu: 'Finom fénypontok', en: 'Soft glints', ro: 'Puncte fine de lumină', de: 'Feine Lichtpunkte' },
  sunMax: {
    hu: 'Szikrázó vízfelszín & taraj csillogás',
    en: 'Dazzling sparkles & crest glints',
    ro: 'Apă scânteietoare',
    de: 'Funkelnde Wasseroberfläche'
  },
  moodLabel: {
    hu: 'Naplemente Színvilág & Hangulat',
    en: 'Sunset Lighting & Atmosphere',
    ro: 'Culorile Apusului & Atmosferă',
    de: 'Sonnenuntergangs-Farben & Stimmung'
  },
  autoMood: {
    hu: 'Napszak követése',
    en: 'Follow time of day',
    ro: 'Urmărește ora zilei',
    de: 'Tageszeit folgen'
  },
  presetsIntro: {
    hu: 'Válassz egy előre beállított tengeri hangulatot:',
    en: 'Choose a handcrafted coastal mood preset:',
    ro: 'Alege o atmosferă marină presetată:',
    de: 'Wähle eine voreingestellte Meeresstimmung:'
  },
  galleryIntro: {
    hu: 'Válassz a gyönyörű nagyfelbontású tengerparti tájképek közül:',
    en: 'Select from high-definition seascape captures:',
    ro: 'Alege dintre peisajele marine de înaltă rezoluție:',
    de: 'Wähle aus den hochauflösenden Meereslandschaften:'
  },
  meditationActive: {
    hu: 'Nyugtató meditáció folyamatban...',
    en: 'Meditation session in progress...',
    ro: 'Meditație în desfășurare...',
    de: 'Meditation läuft...'
  },
  timerIntro: {
    hu: 'Állítsd be a meditációs időtartamot:',
    en: 'Set your relaxation timer:',
    ro: 'Setează durata meditației:',
    de: 'Stelle die Meditationsdauer ein:'
  },
  minutes: { hu: 'perc', en: 'min', ro: 'min', de: 'Min.' },
  startSession: {
    hu: 'Meditáció Indítása',
    en: 'Start Session',
    ro: 'Începe Meditația',
    de: 'Meditation Starten'
  },
  stopTimer: {
    hu: 'Időzítő Leállítása',
    en: 'Stop Timer',
    ro: 'Oprește Cronometrul',
    de: 'Timer Stoppen'
  },

  // --- Az alábbi kulcsok nem voltak a kapott listában, saját fordítás (lektorálandó) ---
  dofBlur: { hu: 'Horizont elmosódás', en: 'DOF blur', ro: 'Estompare orizont', de: 'Horizontunschärfe' },
  windShort: { hu: 'Szél', en: 'Wind', ro: 'Vânt', de: 'Wind' },
  waveShort: { hu: 'Hullám', en: 'Wave', ro: 'Val', de: 'Welle' },
  exportTitle: {
    hu: 'Tengermoraj',
    en: 'Ocean Murmur',
    ro: 'Freamătul Mării',
    de: 'Meeresrauschen'
  },
  soundTypeLabel: {
    hu: 'Tengeri Hang Típusa',
    en: 'Ocean Sound Type',
    ro: 'Tipul Sunetului Marin',
    de: 'Meeresklang-Typ'
  },
  muteSound: {
    hu: 'Hang Némítása',
    en: 'Mute Sound',
    ro: 'Oprește Sunetul',
    de: 'Ton Stummschalten'
  }
} satisfies Record<string, LangMap>;

interface CloudLayer {
  id: number;
  top: string;
  speedFactor: number;
  opacity: number;
  scale: number;
}

type TimeOfDay = 'sunset' | 'golden' | 'twilight' | 'night';

interface Preset {
  name: LangMap;
  windSpeed: number;
  waveSpeed: number;
  waveVolume: number;
  timeOfDay: TimeOfDay;
  soundType: 'sandy' | 'rocky' | 'ocean' | 'rain';
  sunGlow?: number;
}

// A hangprofilok halmazát a hangmotor definiálja
type SoundType = OceanSoundType;

/**
 * Hangprofilok feliratai. Modulszinten, mert a vezérlőpult ÉS a standalone
 * export is ebből dolgozik — így az exportált HTML is a választott nyelven szól.
 */
const SOUND_PROFILE_META: { id: SoundType; label: LangMap; desc: LangMap; icon: LucideIcon }[] = [
  {
    id: 'sandy',
    label: { hu: 'Homokos Part', en: 'Sandy Shore', ro: 'Plajă cu Nisip', de: 'Sandstrand' },
    desc: { hu: 'Lágy morajlás', en: 'Gentle swell', ro: 'Freamăt blând', de: 'Sanftes Rauschen' },
    icon: Waves
  },
  {
    id: 'rocky',
    label: { hu: 'Sziklás Part', en: 'Rocky Shore', ro: 'Țărm Stâncos', de: 'Felsenküste' },
    desc: { hu: 'Erősebb tajték', en: 'Crashing splash', ro: 'Spumă puternică', de: 'Kräftige Gischt' },
    icon: Mountain
  },
  {
    id: 'ocean',
    label: { hu: 'Nyílt Óceán', en: 'Open Ocean', ro: 'Ocean Deschis', de: 'Offener Ozean' },
    desc: {
      hu: 'Mély, basszusos morajlás',
      en: 'Deep bass swell',
      ro: 'Freamăt profund',
      de: 'Tiefes Bass-Rauschen'
    },
    icon: Anchor
  },
  {
    id: 'rain',
    label: { hu: 'Eső a Tengeren', en: 'Rain at Sea', ro: 'Ploaie pe Mare', de: 'Regen auf See' },
    desc: { hu: 'Enyhe esőkopogás', en: 'Light rainfall', ro: 'Ropot ușor', de: 'Leises Prasseln' },
    icon: CloudRain
  }
];

const PRESETS: Preset[] = [
  {
    name: {
      hu: 'Nyugtató Aranyóra',
      en: 'Calming Golden Hour',
      ro: 'Oră de Aur Liniștitoare',
      de: 'Beruhigende Goldene Stunde'
    },
    windSpeed: 25,
    waveSpeed: 4.5,
    waveVolume: 0.6,
    timeOfDay: 'golden',
    soundType: 'sandy',
    sunGlow: 90
  },
  {
    name: {
      hu: 'Sziklás Part & Viharos Hullámok',
      en: 'Rocky Shore & Crashing Waves',
      ro: 'Țărm Stâncos & Valuri Furtunoase',
      de: 'Felsenküste & Stürmische Wellen'
    },
    windSpeed: 65,
    waveSpeed: 2.8,
    waveVolume: 0.85,
    timeOfDay: 'sunset',
    soundType: 'rocky',
    sunGlow: 75
  },
  {
    name: {
      hu: 'Csendes Eső a Tengeren',
      en: 'Tranquil Rain on Ocean',
      ro: 'Ploaie Liniștită pe Mare',
      de: 'Stiller Regen auf dem Meer'
    },
    windSpeed: 30,
    waveSpeed: 5.0,
    waveVolume: 0.7,
    timeOfDay: 'twilight',
    soundType: 'rain',
    sunGlow: 40
  },
  {
    name: {
      hu: 'Mély Nyílt Óceán',
      en: 'Deep Open Ocean Swell',
      ro: 'Ocean Adânc',
      de: 'Tiefe Ozeandünung'
    },
    windSpeed: 15,
    waveSpeed: 7.5,
    waveVolume: 0.5,
    timeOfDay: 'night',
    soundType: 'ocean',
    sunGlow: 25
  }
];

// sunX / sunY: a nap (vagy a legfényesebb vízfelület) helye az adott képen, százalékban.
// Ehhez igazodik a napkorong, a fénycsóva és a vízcsillanások pozíciója.
// sunStrength: mennyire látszik maga a nap az adott fotón (a lagúnán délben alig).
// waterTop / waterBottom: a víz függőleges sávja — a csillámösvény csak ide eshet.
// waterClip: a vízfelület kontúrja, hogy homokra / fűre / szigetre ne kerüljön csillanás.
const IMAGES = [
  {
    src: sunsetBeachImg,
    title: {
      hu: 'Aranynaplemente & Hullámzó Tengerpart',
      en: 'Golden Sunset & Rolling Shoreline',
      ro: 'Apus Auriu & Țărm cu Valuri',
      de: 'Goldener Sonnenuntergang'
    },
    // Chrome-ban rácson kimért napkorong-pozíció
    sunX: 39, sunY: 39, sunStrength: 1.0,
    // Mérve: horizont y41%, jobbra a sziklás fok y46%-ig, a partvonal átlósan
    // fut a jobb felsőtől a bal alsóig, bal alul a füves dűne zárja.
    waterTop: 41, waterBottom: 74,
    waterClip: 'polygon(0% 41%, 58% 41%, 62% 46%, 90% 46%, 88% 52%, 80% 57%, 70% 62%, 60% 68%, 50% 73%, 42% 78%, 34% 74%, 28% 69%, 20% 64%, 10% 59%, 0% 53%)'
  },
  {
    src: seascapeImg,
    title: {
      hu: 'Bíbor Alkonyat a Tenger felett',
      en: 'Purple Twilight over Ocean',
      ro: 'Amurg Purpuriu peste Ocean',
      de: 'Purpurne Dämmerung über dem Meer'
    },
    // Kimérve: a horizonton a legfényesebb folt és a tükröződés oszlopa
    sunX: 66, sunY: 38, sunStrength: 0.7,
    // Mérve: horizont y37%, balra pálmás part és sziklák, a partvonal átlósan
    // fut a bal felsőtől a jobb alsóig; a lagúna a jobb oldalt tölti ki az aljáig.
    waterTop: 39, waterBottom: 94,
    waterClip: 'polygon(10% 45%, 45% 41%, 100% 39%, 100% 100%, 66% 100%, 57% 91%, 48% 82%, 40% 74%, 32% 66%, 24% 57%, 16% 50%)'
  },
  {
    src: lagoonImg,
    title: {
      hu: 'Napsütéses Trópusi Lagúna',
      en: 'Sunny Tropical Lagoon',
      ro: 'Lagună Tropicală Însorită',
      de: 'Sonnige Tropische Lagune'
    },
    // Délidő, nincs látható napkorong — a legfényesebb sekély vízsáv közepe
    sunX: 60, sunY: 42, sunStrength: 0.25,
    // Mérve: horizont y30%, a bungalós sziget alja y36%, jobbra a fehér homokpad
    // átlósan y58%-ig. Alatta végig lagúna, a jobb alsó sarokban is.
    waterTop: 32, waterBottom: 96,
    waterClip: 'polygon(0% 32%, 8% 32%, 12% 35%, 38% 35%, 41% 37%, 79% 37%, 83% 43%, 89% 48%, 94% 53%, 100% 58%, 100% 100%, 0% 100%)'
  }
];

// --- Automatikus napszak ---

/** Helyi óra → napszak: 06-16 aranyóra, 16-19 naplemente, 19-22 alkony, 22-06 éjszaka. */
const moodForHour = (hour: number): TimeOfDay => {
  if (hour < 6) return 'night';
  if (hour < 16) return 'golden';
  if (hour < 19) return 'sunset';
  if (hour < 22) return 'twilight';
  return 'night';
};

/** Milyen sűrűn nézzük újra az órát, amíg a követés be van kapcsolva. */
const AUTO_MOOD_CHECK_MS = 10 * 60 * 1000;

// --- Beállítások megőrzése két munkamenet között ---

const SETTINGS_STORAGE_KEY = 'gallery-settings';
/** Csúszkahúzás közben ne írjunk minden lépésnél a storage-ba. */
const SETTINGS_SAVE_DEBOUNCE_MS = 300;

interface StoredSettings {
  soundType: SoundType;
  windSpeed: number;
  waveSpeed: number;
  sunGlow: number;
  audioVolume: number;
  timeOfDay: TimeOfDay;
  autoMood: boolean;
  imageIndex: number;
}

/** Amit a UI is alapból mutat — ide esünk vissza minden hiányzó vagy hibás mezőnél. */
const SETTINGS_DEFAULTS: StoredSettings = {
  soundType: 'sandy',
  windSpeed: 45,
  waveSpeed: 3.8,
  sunGlow: 85,
  audioVolume: 0.6,
  timeOfDay: 'golden',
  autoMood: true,
  imageIndex: 0
};

const TIME_OF_DAY_VALUES: readonly TimeOfDay[] = ['golden', 'sunset', 'twilight', 'night'];
const SOUND_TYPE_VALUES: readonly SoundType[] = SOUND_PROFILE_META.map((p) => p.id);

/** Számmező: csak véges szám jó, és a csúszka tartományába szorítjuk. */
const numberOr = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

/** Felsorolt mező: csak a whitelistán szereplő érték jó. */
const enumOr = <V extends string>(value: unknown, fallback: V, allowed: readonly V[]): V =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as V)
    : fallback;

/**
 * Mentett beállítások beolvasása és validálása. Bármilyen hiba (letiltott
 * storage, sérült JSON, kézzel átírt érték) esetén az alapértelmezés jön vissza,
 * mezőnként — egy rossz kulcs nem viszi el a többit.
 */
const loadStoredSettings = (): StoredSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return SETTINGS_DEFAULTS;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return SETTINGS_DEFAULTS;
    const s = parsed as Record<string, unknown>;

    return {
      soundType: enumOr(s.soundType, SETTINGS_DEFAULTS.soundType, SOUND_TYPE_VALUES),
      windSpeed: numberOr(s.windSpeed, SETTINGS_DEFAULTS.windSpeed, 5, 100),
      waveSpeed: numberOr(s.waveSpeed, SETTINGS_DEFAULTS.waveSpeed, 1.5, 8),
      sunGlow: numberOr(s.sunGlow, SETTINGS_DEFAULTS.sunGlow, 10, 100),
      audioVolume: numberOr(s.audioVolume, SETTINGS_DEFAULTS.audioVolume, 0, 1),
      timeOfDay: enumOr(s.timeOfDay, SETTINGS_DEFAULTS.timeOfDay, TIME_OF_DAY_VALUES),
      autoMood: typeof s.autoMood === 'boolean' ? s.autoMood : SETTINGS_DEFAULTS.autoMood,
      imageIndex: Math.round(
        numberOr(s.imageIndex, SETTINGS_DEFAULTS.imageIndex, 0, IMAGES.length - 1)
      )
    };
  } catch {
    // privát mód / letiltott storage / sérült JSON — alapértelmezéssel indulunk
    return SETTINGS_DEFAULTS;
  }
};

/** Egyszer, modulbetöltéskor olvassuk be: minden useState innen indul. */
const INITIAL_SETTINGS = loadStoredSettings();

// --- Folyamatos vízmozgás (SVG feTurbulence + feDisplacementMap) ---

/** A torzító zaj nyugalmi és csúcs-frekvenciája; a SMIL e kettő között oszcillál. */
const WATER_BASE_FREQ = '0.012 0.04';
const WATER_PEAK_FREQ = '0.018 0.055';
/** Oda-vissza oszcilláció az <animate values="..."> számára. */
const WATER_FREQ_VALUES = `${WATER_BASE_FREQ}; ${WATER_PEAK_FREQ}; ${WATER_BASE_FREQ}`;

/**
 * Displacement-erősség a hullámritmusból: sűrű, gyors morajlásnál elevenebb
 * fodrozódás (14), lassú, mély lélegzésnél lágyabb (6).
 */
const waterDisplacementScale = (waveSpeedSeconds: number): number => {
  const t = (waveSpeedSeconds - 1.5) / (8 - 1.5); // 0..1 a csúszka tartományán
  return Number((14 - t * 8).toFixed(1));
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Csökkentett mozgás esetén a vízmozgás-réteg egyáltalán nem renderelődik. */
const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia(REDUCED_MOTION_QUERY).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

// --- Elalvás-fade (az időzítő végén) ---

/** A hangerő ennyi idő alatt megy nullára az időzítő lejártakor. */
const SLEEP_FADE_MS = 10000;
/** Léptetés sűrűsége — JS-oldali rámpa, az audio-modult nem módosítjuk. */
const SLEEP_FADE_STEP_MS = 200;

/**
 * Determinisztikus ál-véletlen 0..1 között. Azért nem Math.random(), hogy a
 * csillámminta minden betöltéskor ugyanaz legyen (és ne ugráljon újrarendereléskor).
 */
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Csillámösvény: a naptól a néző felé szélesedő kúp, tele apró fénypontokkal.
// A korridor-pontok vízszintes helyét rendereléskor számoljuk a nap helyzetéből
// (`lateral` × félszélesség), mert a nap képenként máshol van.
const WATER_SPARKLES = Array.from({ length: 64 }).map((_, i) => {
  const isCorridor = pseudoRandom(i + 0.5) < 0.55; // kb. 55% az ösvényben
  const verticalT = pseudoRandom(i + 11.3); // 0..1: a tengersáv tetejétől az aljáig
  const lateral = pseudoRandom(i + 23.7) * 2 - 1; // -1..1 egyenletes oldalirányú szórás
  const scatterLeft = 8 + pseudoRandom(i + 41.1) * 84; // 8%..92% az ösvényen kívül
  const sizePx = 2 + pseudoRandom(i + 57.9) * 3; // 2px..5px
  const isBloom = i % 8 === 0; // minden nyolcadik nagyobb, halványabb, lágy udvarú folt
  const bloomSizePx = 7 + pseudoRandom(i + 131.7) * 2; // 7px..9px
  const isElongated = !isBloom && i % 3 === 0; // minden harmadik pont picit függőlegesen nyúlik
  const duration = 0.9 + pseudoRandom(i + 71.3) * 1.3; // 0.9s..2.2s
  const delay = pseudoRandom(i + 89.7) * 2.8; // 0s..2.8s, kevert eloszlás
  const baseScale = isCorridor
    ? 0.8 + pseudoRandom(i + 103.5) * 0.3
    : 0.55 + pseudoRandom(i + 113.1) * 0.25;
  return { id: i, isCorridor, verticalT, lateral, scatterLeft, sizePx, isBloom, bloomSizePx, isElongated, duration, delay, baseScale };
});

// Hosszan kifuttatott maszk: a blur-rétegek széle sehol nem ad éles vágásvonalat.
// Csak a középső 10% teljes erejű, onnan mindkét irányba lágyan nullázódik.
const HORIZON_MASK = 'linear-gradient(to bottom, transparent, black 45%, black 55%, transparent)';

// A csillámösvény erőssége napszakonként — éjjel nincs nap, ami csillogjon.
const AMBIENT_BY_TIME_OF_DAY = {
  golden: 1.0,
  sunset: 0.75,
  twilight: 0.45,
  night: 0.15
} as const;

// Borult ég (eső) gyakorlatilag megszünteti a csillámösvényt.
const RAIN_AMBIENT_FACTOR = 0.15;

// --- Üveg-panel (glass-panel) alapstílus ---
// A Tailwind backdrop-blur-* a -webkit- előtagot is legenerálja, ezért itt elég a
// segédosztály. Mobilon halkabb blur, md-től erősebb.
const GLASS_PANEL =
  'bg-slate-950/45 backdrop-blur-[11px] md:backdrop-blur-[15px] border border-white/10 rounded-2xl shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)]';

// Egységes aktív/kijelölt állapot: soha nem tömör amber kitöltés, csak tónus + keret + szöveg.
// FIGYELEM: panelen belüli elemre nem kerül backdrop-blur — beágyazva hatástalan és GPU-t eszik.
const GLASS_ACTIVE = 'bg-amber-400/15 border border-amber-400/45 text-amber-200';

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
  // Language state — mentett választás, különben a böngésző nyelve, különben magyar
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    // A dokumentum nyelve is kövesse: képernyőolvasó, elválasztás, helyesírás-ellenőrzés
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // privát mód: a nyelv csak a munkamenetre marad meg
    }
  }, [lang]);

  /** Szótárkulcs feloldása az aktuális nyelvre. */
  const t = (k: keyof typeof T) => T[k][lang];
  /** Adattömbök nyelvi mezőinek feloldása (title, name, label, desc). */
  const tr = (m: LangMap) => m[lang];

  // Visual Scene state
  const [currentImageIndex, setCurrentImageIndex] = useState(INITIAL_SETTINGS.imageIndex);
  const images = IMAGES;
  const { sunX, sunY, sunStrength, waterTop, waterBottom, waterClip } = images[currentImageIndex];

  // Atmosphere controls
  const [windSpeed, setWindSpeed] = useState<number>(INITIAL_SETTINGS.windSpeed); // 5 - 100 km/h
  const [waveSpeed, setWaveSpeed] = useState<number>(INITIAL_SETTINGS.waveSpeed); // 1.5s - 8s per wave period
  const [soundType, setSoundType] = useState<SoundType>(INITIAL_SETTINGS.soundType);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(INITIAL_SETTINGS.timeOfDay);
  const [sunGlow, setSunGlow] = useState<number>(INITIAL_SETTINGS.sunGlow);
  // Automatikus napszak: a helyi óra állítja a hangulatot, amíg kézzel nem választanak
  const [autoMood, setAutoMood] = useState<boolean>(INITIAL_SETTINGS.autoMood);

  // Vízmozgás: a torzítás erőssége a hullámritmusból, a réteg csak akkor él,
  // ha a felhasználó nem kért csökkentett mozgást.
  const prefersReducedMotion = usePrefersReducedMotion();
  const waterScale = waterDisplacementScale(waveSpeed);

  // Depth-of-field horizon blur calculated dynamically based on wind speed
  const horizonBlurPx = Math.max(0.2, (windSpeed / 100) * 6.0);
  const horizonHazeOpacity = (windSpeed / 100) * 0.22;

  // Csillámösvény-erősség: napszak × borult ég. A darabszámot és az opacitást is ez vezérli.
  const ambientFactor =
    AMBIENT_BY_TIME_OF_DAY[timeOfDay] * (soundType === 'rain' ? RAIN_AMBIENT_FACTOR : 1);

  // Az eső dőlése a széllel nő: ~4° szélcsendben, ~22° viharban.
  // A vízszintes elsodródás ugyanebből a szögből jön, hogy a csepp a saját
  // tengelye mentén essen (a teljes esési út kb. 1000px-nyi függőleges út).
  const rainTiltMagnitudeDeg = 4 + (windSpeed / 100) * 18;
  const rainTiltDeg = -rainTiltMagnitudeDeg;
  const rainDriftPx = Math.tan((rainTiltMagnitudeDeg * Math.PI) / 180) * 1000;

  // Audio state & Web Audio refs
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(INITIAL_SETTINGS.audioVolume);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // A teljes hanggráf egyetlen kezelője (src/audio/oceanAudio.js)
  const oceanAudioRef = useRef<OceanAudio | null>(null);
  // Pending suspend timer: lets the fade-out finish before we park the AudioContext
  const suspendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Az időzítő-effekt dep-listáját nem terhelhetjük az isPlayingAudio-val (újraindulna
  // a másodperc-számláló), ezért a lejátszási állapotot refben is vezetjük.
  const isPlayingAudioRef = useRef<boolean>(false);
  // Elalvás-fade léptető időzítője
  const sleepFadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Wake Lock sentinel — csak amíg a hang szól
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Interface state
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  // Panel visibility: saved choice wins, otherwise start closed on short (landscape) viewports
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gallery-panel-open');
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch {
      /* storage unavailable: fall through to the media query */
    }
    try {
      return !window.matchMedia('(max-height: 520px), (max-width: 767px)').matches;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('gallery-panel-open', isPanelOpen ? '1' : '0');
    } catch {
      /* storage unavailable: ignore */
    }
  }, [isPanelOpen]);
  const [activeTab, setActiveTab] = useState<'controls' | 'presets' | 'timer' | 'gallery'>('controls');
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

  // --- Wake Lock: amíg szól a hang, ne aludjon el a kijelző ---
  // Feature-detect + néma hibakezelés: ahol nincs (iOS Safari régebbi verziói,
  // nem biztonságos kontextus) vagy megtagadják (alacsony töltöttség), ott a
  // felhasználó semmit nem vesz észre.

  const releaseWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    void sentinel?.release().catch(() => {
      // már elengedve / a lap elment — nincs teendő
    });
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    if (wakeLockRef.current) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      // A böngésző lapváltáskor magától elengedi — a saját referenciánk is ürüljön,
      // különben a visszatéréskori újrakérés azt hinné, hogy még él.
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
      });
    } catch {
      // nem támogatott vagy megtagadva — csendben továbblépünk
    }
  }, []);

  // --- Hangvezérlés ---

  const cancelSleepFade = useCallback(() => {
    if (sleepFadeTimerRef.current !== null) {
      clearInterval(sleepFadeTimerRef.current);
      sleepFadeTimerRef.current = null;
    }
  }, []);

  const startAudio = useCallback(async () => {
    // A still-pending suspend would silently park the context right after we start it
    if (suspendTimeoutRef.current !== null) {
      clearTimeout(suspendTimeoutRef.current);
      suspendTimeoutRef.current = null;
    }
    cancelSleepFade();

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
    isPlayingAudioRef.current = true;
    setIsPlayingAudio(true);
    void requestWakeLock();
  }, [audioVolume, windSpeed, waveSpeed, soundType, cancelSleepFade, requestWakeLock]);

  const stopAudio = useCallback(() => {
    cancelSleepFade();

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

    isPlayingAudioRef.current = false;
    setIsPlayingAudio(false);
    releaseWakeLock();
  }, [cancelSleepFade, releaseWakeLock]);

  // Audio Toggle
  const toggleAudio = () => {
    if (!isPlayingAudio) {
      void startAudio();
    } else {
      stopAudio();
    }
  };

  /**
   * Elalvás-fade: a hangerőt SLEEP_FADE_MS alatt, SLEEP_FADE_STEP_MS-onként
   * lineárisan nullára viszi a hangmotor publikus setVolume-jával (az audio-modul
   * érintetlen), majd rendes stop következik. A tárolt hangerőt a végén
   * visszaállítjuk, hogy a következő indítás ne legyen néma.
   *
   * Konzolból is hívható ellenőrzéshez: `window.startSleepFade()`
   * @returns false, ha nincs mit halkítani (nem szól a hang)
   */
  const startSleepFade = useCallback((): boolean => {
    const ocean = oceanAudioRef.current;
    if (!ocean || !isPlayingAudioRef.current) return false;

    cancelSleepFade();

    const startVolume = audioVolume;
    const totalSteps = Math.round(SLEEP_FADE_MS / SLEEP_FADE_STEP_MS);
    let step = 0;

    sleepFadeTimerRef.current = setInterval(() => {
      step += 1;
      ocean.setVolume(startVolume * Math.max(0, 1 - step / totalSteps));

      if (step >= totalSteps) {
        cancelSleepFade();
        stopAudio();
        ocean.setVolume(startVolume);
      }
    }, SLEEP_FADE_STEP_MS);

    return true;
  }, [audioVolume, cancelSleepFade, stopAudio]);

  // Az időzítő-effekt a legfrissebb változatot refen keresztül éri el, hogy a
  // hangerő változása ne indítsa újra a másodperc-számlálót.
  const startSleepFadeRef = useRef(startSleepFade);
  useEffect(() => {
    startSleepFadeRef.current = startSleepFade;
  }, [startSleepFade]);

  // Konzolos ellenőrzéshez név szerint elérhető
  useEffect(() => {
    const w = window as Window & { startSleepFade?: () => boolean };
    w.startSleepFade = startSleepFade;
    return () => {
      delete w.startSleepFade;
    };
  }, [startSleepFade]);

  // Visszatéréskor újra kell kérni a wake lockot: a böngésző lapváltáskor elengedi
  useEffect(() => {
    if (!isPlayingAudio) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlayingAudio, requestWakeLock]);

  // Tear everything down on unmount: without this the oscillators and noise
  // sources keep running for the lifetime of the page.
  useEffect(() => {
    return () => {
      if (suspendTimeoutRef.current !== null) {
        clearTimeout(suspendTimeoutRef.current);
        suspendTimeoutRef.current = null;
      }
      if (sleepFadeTimerRef.current !== null) {
        clearInterval(sleepFadeTimerRef.current);
        sleepFadeTimerRef.current = null;
      }
      // A wake lockot a böngésző a lap eldobásakor is elengedi, de ne bízzuk rá
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      void sentinel?.release().catch(() => {
        // már elengedve — nincs teendő
      });
      isPlayingAudioRef.current = false;
      oceanAudioRef.current?.dispose();
      oceanAudioRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    };
  }, []);

  // Automatikus napszak: betöltéskor és 10 percenként a helyi órához igazít.
  // Kikapcsolva (kézi választás után) semmit nem csinál.
  useEffect(() => {
    if (!autoMood) return;
    const applyMoodForNow = () => setTimeOfDay(moodForHour(new Date().getHours()));
    applyMoodForNow();
    const interval = setInterval(applyMoodForNow, AUTO_MOOD_CHECK_MS);
    return () => clearInterval(interval);
  }, [autoMood]);

  // Beállítások mentése — debounce-olva, hogy a csúszkahúzás ne írjon minden lépésnél
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const settings: StoredSettings = {
          soundType,
          windSpeed,
          waveSpeed,
          sunGlow,
          audioVolume,
          timeOfDay,
          autoMood,
          imageIndex: currentImageIndex
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // privát mód / betelt kvóta — a beállítások csak a munkamenetre maradnak meg
      }
    }, SETTINGS_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [soundType, windSpeed, waveSpeed, sunGlow, audioVolume, timeOfDay, autoMood, currentImageIndex]);

  // Mindfulness Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSecondsLeft !== null && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);

      if (isPlayingAudioRef.current) {
        // Elalvás-mód: a moraj 10 mp alatt kihuny, csengő nem szólal meg
        startSleepFadeRef.current();
      } else if (audioCtxRef.current) {
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
    // A preset is kézi szándék: a kért hangulatot a napszak-követés nem írhatja
    // felül a következő ellenőrzéskor.
    setAutoMood(false);
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
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('exportTitle')}</title>
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
      mask-image: ${HORIZON_MASK};
      -webkit-mask-image: ${HORIZON_MASK};
    }
    .cloud { position: absolute; left: 0; width: 100%; pointer-events: none; }
    .cloud-blob {
      width: 600px; height: 120px; border-radius: 9999px;
      background: linear-gradient(90deg, transparent, rgba(254, 243, 199, 0.45), transparent);
      filter: blur(30px);
    }
    /* Üveg-panel: a -webkit- változat kézzel kötelező, itt nincs Tailwind */
    .controls {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(2, 6, 23, 0.45);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 16px;
      padding: 16px 24px; display: flex; flex-direction: column; gap: 12px;
      width: 92%; max-width: 520px; z-index: 10; box-shadow: 0 18px 50px -18px rgba(0, 0, 0, 0.75);
    }
    @media (max-width: 600px) {
      .controls {
        padding: 12px 16px;
        backdrop-filter: blur(11px);
        -webkit-backdrop-filter: blur(11px);
      }
    }
    .row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; }
    input[type=range] { width: 100%; accent-color: #fbbf24; cursor: pointer; }
    /* Panelen belül nincs backdrop-filter — beágyazva hatástalan, csak áttetsző háttér + keret */
    select, button {
      background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.45);
      color: #fde68a;
      padding: 10px 14px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 13px;
    }
    select { background: rgba(15, 23, 42, 0.55); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.15); }
    /* A vízmozgás-réteg: a fotó másolata, csak a vízre vágva, torzítóval */
    .water-layer {
      position: absolute; inset: 0; pointer-events: none;
      filter: url(#water-motion);
    }

    /* Az alábbi animációk az src/index.css @layer utilities blokkjából származnak */
${OCEAN_ANIMATIONS_CSS}
  </style>
</head>
<body>
  <svg width="0" height="0" aria-hidden="true" style="position:absolute">
    <defs>
      <filter id="water-motion" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="${WATER_BASE_FREQ}" numOctaves="2" seed="7" result="noise">
          <animate id="waterFreq" attributeName="baseFrequency" dur="${(waveSpeed * 2).toFixed(1)}s" values="${WATER_FREQ_VALUES}" repeatCount="indefinite"/>
        </feTurbulence>
        <feDisplacementMap id="waterDisp" in="SourceGraphic" in2="noise" scale="${waterScale}" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
  </svg>

  <div class="scene" id="scene">
    <img src="${base64Image}" class="bg-img animate-ocean-swell" id="bgImg" style="--wave-period: ${waveSpeed}s">
    <img src="${base64Image}" class="bg-img animate-ocean-swell water-layer" id="waterImg" alt="" aria-hidden="true"
         style="--wave-period: ${waveSpeed}s; clip-path: ${waterClip}; -webkit-clip-path: ${waterClip}">
    <div class="horizon-blur" id="horizonBlurLayer"></div>
    <div class="cloud animate-cloud-r" style="top: 10%; --cloud-period: ${1200 / windSpeed}s"><div class="cloud-blob"></div></div>
    <div class="cloud animate-cloud-r" style="top: 22%; --cloud-period: ${1800 / windSpeed}s"><div class="cloud-blob"></div></div>
  </div>

  <div class="controls">
    <div class="row">
      <span>${t('soundTypeLabel')}:</span>
      <select id="soundTypeSel">
${SOUND_PROFILE_META.map((p) => `        <option value="${p.id}" ${soundType === p.id ? 'selected' : ''}>${tr(p.label)}</option>`).join('\n')}
      </select>
      <button id="soundBtn">${t('playSound')} 🔊</button>
    </div>
    <div>
      <div class="row"><span>${t('windLabel')}:</span><span id="windVal">${windSpeed} km/h</span></div>
      <input type="range" id="windSlider" min="5" max="100" value="${windSpeed}">
    </div>
    <div>
      <div class="row"><span>${t('waveLabel')}:</span><span id="waveVal">${waveSpeed}s</span></div>
      <input type="range" id="waveSlider" min="1.5" max="8" step="0.1" value="${waveSpeed}">
    </div>
    <div>
      <div class="row"><span>${t('sunLabel')}:</span><span id="sunVal">${sunGlow}%</span></div>
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
    const waterImg = document.getElementById('waterImg');
    const waterFreq = document.getElementById('waterFreq');
    const waterDisp = document.getElementById('waterDisp');

    /** Ugyanaz a leképezés, mint a React appban: gyors ritmus = elevenebb fodrozódás. */
    const waterScaleFor = (waveSeconds) => Number((14 - ((waveSeconds - 1.5) / 6.5) * 8).toFixed(1));

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
      soundBtn.textContent = isPlaying ? ${JSON.stringify(t('muteSound') + ' 🔇')} : ${JSON.stringify(t('playSound') + ' 🔊')};
    });

    soundTypeSel.addEventListener('change', (e) => {
      if (ocean) ocean.setSoundType(e.target.value);
    });

    windSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('windVal').textContent = val + ' km/h';
      document.querySelectorAll('.cloud').forEach(c => c.style.setProperty('--cloud-period', (1200 / val) + 's'));
      const blurPx = Math.max(0.2, (val / 100) * 6.0);
      document.getElementById('horizonBlurLayer').style.setProperty('--horizon-blur', blurPx + 'px');
      if (ocean) ocean.setWindSpeed(val);
    });

    waveSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('waveVal').textContent = val + 's';
      document.getElementById('bgImg').style.setProperty('--wave-period', val + 's');
      waterImg.style.setProperty('--wave-period', val + 's');
      // A dur átírása önmagában nem indítja újra a SMIL-t — a beginElement() igen
      waterFreq.setAttribute('dur', (val * 2).toFixed(1) + 's');
      waterDisp.setAttribute('scale', String(waterScaleFor(val)));
      if (typeof waterFreq.beginElement === 'function') waterFreq.beginElement();
      if (ocean) ocean.setWaveSpeed(val);
    });

    // Csökkentett mozgás: a torzító réteget el is hagyjuk
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      waterImg.remove();
    }

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

  // Bottom-fade scroll hint: shown while the panel has more content below the fold.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const updateScrollHint = useCallback(() => {
    const el = panelRef.current;
    setCanScrollMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  useEffect(() => {
    updateScrollHint();
    const el = panelRef.current;
    window.addEventListener('resize', updateScrollHint);
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(updateScrollHint) : null;
    if (ro && el) {
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
    }
    return () => {
      window.removeEventListener('resize', updateScrollHint);
      ro?.disconnect();
    };
  }, [updateScrollHint, activeTab, isPlayingAudio, lang, isZenMode, isPanelOpen]);

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-slate-950 text-slate-100 select-none">
      
      {/* BACKGROUND SEASCAPE IMAGE & ANIMATED WAVE LAYERS */}
      {/* overflow-clip, nem -hidden: a sodródó felhők túllógnak a boxon, így a
          jelenet görgethetővé válna, és egy gombfókusz elcsúsztatná az egész
          overlay-réteget (blur-sávok, nap, csillanások) a fotóhoz képest. */}
      <div className="absolute inset-0 overflow-clip">
        {/* Base Seascape Image with Ocean Swell Animation */}
        <img
          src={images[currentImageIndex].src}
          alt="Tengerparti Naplemente"
          className="w-full h-full object-cover object-center scale-105 animate-ocean-swell transition-all duration-1000 ease-in-out"
          style={{ '--wave-period': `${waveSpeed}s` } as React.CSSProperties}
        />

        {/* FOLYAMATOS VÍZMOZGÁS — magát a fotó vizét torzítjuk, nem rárakott sávokkal */}
        {!prefersReducedMotion && (
          <>
            {/* Rejtett filter-definíció. A baseFrequency SMIL-lel leng oda-vissza,
                a periódus a hullámritmus kétszerese — a csúszka a tempót adja. */}
            <svg width="0" height="0" aria-hidden="true" className="absolute w-0 h-0 pointer-events-none">
              <defs>
                {/* sRGB: linearRGB-ben a másolat színe elcsúszna az alatta lévő
                    fotóhoz képest, és a vágás peremén varrat látszana. */}
                <filter
                  id="water-motion"
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence
                    type="turbulence"
                    baseFrequency={WATER_BASE_FREQ}
                    numOctaves="2"
                    seed="7"
                    result="noise"
                  >
                    {/* A puszta dur-csere nem indítja újra a SMIL-t, ezért a
                        csúszka változásakor a key újramountolja az elemet. */}
                    <animate
                      key={waveSpeed}
                      attributeName="baseFrequency"
                      dur={`${(waveSpeed * 2).toFixed(1)}s`}
                      values={WATER_FREQ_VALUES}
                      repeatCount="indefinite"
                    />
                  </feTurbulence>
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale={waterScale}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              </defs>
            </svg>

            {/* A fotó másolata a vízre vágva. SZÁNDÉKOSAN nincs saját z-indexe:
                így közvetlenül az eredeti fölé, de a színszűrő, a nap és a
                horizont-blur (z-5) ALÁ kerül — a part, az ég és a sziget érintetlen. */}
            <img
              src={images[currentImageIndex].src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 animate-ocean-swell pointer-events-none transition-all duration-1000 ease-in-out"
              style={{
                '--wave-period': `${waveSpeed}s`,
                clipPath: waterClip,
                WebkitClipPath: waterClip,
                filter: 'url(#water-motion)'
              } as React.CSSProperties}
            />
          </>
        )}

        {/* DYNAMIC HORIZON DEPTH-OF-FIELD BLUR & ATMOSPHERIC SEA SPRAY MIST LAYER */}
        {/* Három egymást átfedő réteg fokozódó blurral: egyetlen sáv látható
            vágásvonalat adott, mert a maszk 20%-nál már teljes erőn volt. */}
        <div
          className="absolute top-[24%] inset-x-0 h-[16%] pointer-events-none transition-all duration-300 ease-out z-[5]"
          style={{
            backdropFilter: `blur(${(horizonBlurPx * 0.25).toFixed(2)}px)`,
            WebkitBackdropFilter: `blur(${(horizonBlurPx * 0.25).toFixed(2)}px)`,
            maskImage: HORIZON_MASK,
            WebkitMaskImage: HORIZON_MASK
          }}
        />
        <div
          className="absolute top-[32%] inset-x-0 h-[20%] pointer-events-none transition-all duration-300 ease-out z-[5]"
          style={{
            backdropFilter: `blur(${(horizonBlurPx * 0.55).toFixed(2)}px)`,
            WebkitBackdropFilter: `blur(${(horizonBlurPx * 0.55).toFixed(2)}px)`,
            maskImage: HORIZON_MASK,
            WebkitMaskImage: HORIZON_MASK
          }}
        >
          {/* Sea Spray / Heat Mist Band overlay that intensifies with high wind speed */}
          <div
            className="w-full h-full bg-gradient-to-b from-amber-100/10 via-amber-200/20 to-sky-100/10 transition-opacity duration-300"
            style={{ opacity: horizonHazeOpacity }}
          />
        </div>
        <div
          className="absolute top-[42%] inset-x-0 h-[22%] pointer-events-none transition-all duration-300 ease-out z-[5]"
          style={{
            backdropFilter: `blur(${horizonBlurPx.toFixed(2)}px)`,
            WebkitBackdropFilter: `blur(${horizonBlurPx.toFixed(2)}px)`,
            maskImage: HORIZON_MASK,
            WebkitMaskImage: HORIZON_MASK
          }}
        />

        {/* Dynamic Sunset / Twilight Color Filter */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${getTimeOfDayFilter()}`} />

        {/* SUN GLOW & REFLECTION */}
        <div
          className="absolute w-56 h-56 rounded-full pointer-events-none animate-sun-glow transition-all duration-700"
          style={{
            // A sun-pulsate keyframe felülírná a translate-es középre húzást,
            // ezért a w-56/h-56 felét (7rem) közvetlenül a pozícióból vonjuk le
            left: `calc(${sunX}% - 7rem)`,
            top: `calc(${sunY}% - 7rem)`,
            // screen + blur: a réteg világosítja a fotót, nem lefesti
            mixBlendMode: 'screen',
            filter: 'blur(24px)',
            background: timeOfDay === 'night'
              ? 'radial-gradient(circle, rgba(224,242,254,0.2) 0%, rgba(186,230,253,0.075) 45%, transparent 70%)'
              : `radial-gradient(circle, rgba(255,214,150,${(sunGlow / 260) * sunStrength}) 0%, rgba(251,146,60,${(sunGlow / 420) * sunStrength}) 40%, transparent 68%)`
          }}
        />

        {/* RAIN DROPS OVERLAY WHEN 'RAIN' SOUND TYPE IS ACTIVE */}
        {soundType === 'rain' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-60">
            {Array.from({ length: 70 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-[1px] bg-gradient-to-b from-transparent via-sky-200/45 to-transparent animate-rain-drop"
                style={{
                  top: 0,
                  // A kiindulás balra túlnyúlik, mert a csepp esés közben jobbra sodródik
                  left: `${-25 + ((i * 7.3) % 125)}%`,
                  height: `${14 + (i % 8) * 4}px`,
                  '--rain-tilt': `${rainTiltDeg}deg`,
                  '--rain-drift': `${rainDriftPx}px`,
                  '--rain-duration': `${0.6 + ((i * 0.11) % 0.8)}s`,
                  '--rain-delay': `${(i * 0.29) % 2}s`
                } as React.CSSProperties}
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

        {/* SUNLIGHT REFLECTION CORRIDOR ON WATER SURFACE — a nap alá igazítva */}
        <div
          className="absolute w-[28%] bottom-0 pointer-events-none transition-all duration-500"
          style={{
            left: `${sunX - 14}%`,
            top: `${sunY}%`,
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
        {/* A konténer z-[6]-ja önmagában is stacking contextet nyit, ami elszigetelné
            a gyerekek keverését — ezért a csoport EGÉSZE is additívan keveredik a fotóval. */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-[6] transition-opacity duration-700"
          style={{
            mixBlendMode: 'plus-lighter',
            // A vízfelület kontúrja: homokra / fűre / szigetre nem eshet csillanás
            clipPath: waterClip,
            WebkitClipPath: waterClip,
            // Napszakváltáskor a darabszám ugrik — a konténer fade-je elfedi
            opacity: ambientFactor
          }}
        >
          {WATER_SPARKLES.slice(0, Math.max(4, Math.floor((sunGlow / 100) * ambientFactor * WATER_SPARKLES.length))).map((sparkle) => {
            const isCorridorSparkle = sparkle.isCorridor;
            const isBloomSparkle = sparkle.isBloom;
            // A kúp fent a napnál keskeny (±3%), lefelé ±14%-ig szélesedik
            const corridorHalfWidth = 3 + sparkle.verticalT * 11;
            const leftPercent = isCorridorSparkle
              ? sunX + sparkle.lateral * corridorHalfWidth
              : sparkle.scatterLeft;
            // A csúcsméret sosem eshet a nyugalmi 0.9-es skála alá
            const sparkleScale = Math.max(0.95, sparkle.baseScale * (0.75 + (sunGlow / 100) * 0.25)).toFixed(2);
            // Opacitás-padló: közepes napnál is látszik. A sunStrength SZÁNDÉKOSAN nem
            // szorozza — a lagúnán nincs látható napkorong, de csillámösvény van.
            // Az ambientFactor sem: azt a konténer opacitása adja (egyszer, nem négyzetesen).
            const maxOpacity = Math.min(
              1,
              (0.35 + (sunGlow / 100) * 0.6) * (isCorridorSparkle ? 1 : 0.7) * (isBloomSparkle ? 0.6 : 1)
            );
            const pointSizePx = isBloomSparkle ? sparkle.bloomSizePx : sparkle.sizePx;
            return (
              <div
                key={sparkle.id}
                className="absolute animate-sparkle-point flex items-center justify-center"
                style={{
                  left: `${leftPercent}%`,
                  // A víz sávján belül: a horizontnál kezdődik, a vízen ér véget
                  top: `${waterTop + sparkle.verticalT * (waterBottom - waterTop)}%`,
                  animationDelay: `${sparkle.delay}s`,
                  mixBlendMode: 'plus-lighter',
                  '--sparkle-duration': `${sparkle.duration}s`,
                  '--sparkle-scale': sparkleScale,
                  '--sparkle-max-opacity': maxOpacity,
                } as React.CSSProperties}
              >
                {/* Fénypont: telített mag, lágy kifutás; minden nyolcadik nagyobb bloom-folt */}
                <div
                  style={{
                    width: sparkle.isElongated ? '1px' : `${pointSizePx.toFixed(1)}px`,
                    height: sparkle.isElongated ? '3px' : `${pointSizePx.toFixed(1)}px`,
                    borderRadius: sparkle.isElongated ? '40%' : '9999px',
                    background: isCorridorSparkle
                      ? 'radial-gradient(circle, rgba(255,252,240,1) 0%, rgba(255,230,160,0.85) 40%, transparent 75%)'
                      : 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 40%, transparent 75%)',
                    boxShadow: isBloomSparkle
                      ? (isCorridorSparkle ? '0 0 14px rgba(255,230,160,0.55)' : '0 0 12px rgba(255,255,255,0.45)')
                      : (isCorridorSparkle ? '0 0 4px rgba(254,240,138,0.7)' : '0 0 3px rgba(255,255,255,0.5)'),
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ZEN MODE EXIT BUTTON */}
        {isZenMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsZenMode(false)}
              className={`min-h-11 min-w-11 px-2.5 py-1 rounded-lg ${GLASS_ACTIVE} font-bold hover:bg-amber-400/25 transition-colors`}
            >
              <Minimize className="w-3.5 h-3.5 inline mr-1" />
              {t('exit')}
            </button>
          </div>
        )}
      </div>

      {/* PANEL TOGGLE — the only control on a clean screen */}
      {!isZenMode && (
        <button
          onClick={() => setIsPanelOpen((v) => !v)}
          aria-expanded={isPanelOpen}
          aria-controls="control-panel"
          aria-label={isPanelOpen ? t('panelHide') : t('panelShow')}
          title={isPanelOpen ? t('panelHide') : t('panelShow')}
          className={`fixed top-3 right-3 md:top-4 md:right-4 z-30 min-h-11 min-w-11 flex items-center justify-center rounded-xl ${GLASS_PANEL} text-slate-200 hover:text-amber-300 transition-colors pointer-events-auto`}
        >
          {isPanelOpen ? (
            <>
              <PanelRightClose className="hidden md:block w-5 h-5" />
              <PanelBottomClose className="md:hidden w-5 h-5" />
            </>
          ) : (
            <>
              <PanelRightOpen className="hidden md:block w-5 h-5" />
              <PanelBottomOpen className="md:hidden w-5 h-5" />
            </>
          )}
          {isPlayingAudio && (
            <span aria-hidden="true" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
      )}

      {/* CONTROL HUD */}
      {!isZenMode && (
        <div
          id="control-panel"
          ref={panelRef}
          onScroll={updateScrollHint}
          className={`${isPanelOpen ? 'absolute bottom-2 left-2 right-2 max-h-[min(70dvh,calc(100dvh-4.5rem))] md:top-20 md:bottom-auto md:max-h-[calc(100dvh-6rem)] md:right-4 md:left-auto md:w-[420px] md:flex md:flex-col overflow-y-auto overflow-x-hidden overscroll-contain z-20 pointer-events-auto' : 'hidden'}`}
          // Diszkrét görgetősáv, hogy a magasság-korlát ne rondítson bele az üveghatásba
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(251,191,36,0.35) transparent' }}
        >

          {/* TOP SECTION — title, download, zen, sound, volume, language */}
          <div className={`p-3 mb-3 flex flex-col gap-2 md:shrink-0 ${GLASS_PANEL}`}>
            <div className="flex items-center justify-between gap-2">
              <h1 className="min-w-0 truncate text-lg font-bold tracking-tight bg-gradient-to-r from-amber-200 via-orange-100 to-amber-300 bg-clip-text text-transparent">
                {t('title')}
              </h1>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={downloadStandaloneHtml}
                  aria-label={t('downloadTitle')}
                  title={t('downloadTitle')}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-all"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsZenMode(true)}
                  aria-label={t('zenView')}
                  title={t('zenView')}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-amber-300 hover:bg-slate-800 transition-all"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className={`shrink-0 min-h-11 justify-center px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                  isPlayingAudio
                    ? `${GLASS_ACTIVE} shadow-amber-400/15 hover:bg-amber-400/25`
                    : 'bg-slate-900/80 text-slate-200 border border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                {isPlayingAudio ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                <span>{isPlayingAudio ? t('soundOn') : t('playSound')}</span>
              </button>
              <input
                type="range"
                aria-label={t('volumeLabel')}
                min="0"
                max="1"
                step="0.01"
                value={audioVolume}
                onChange={(e) => setAudioVolume(Number(e.target.value))}
                className="range-touch range-amber w-full min-w-0 h-11 cursor-pointer"
              />
              <span className="text-xs text-slate-300 w-8 shrink-0 whitespace-nowrap text-right font-medium">{Math.round(audioVolume * 100)}%</span>
            </div>

            <div role="group" aria-label={t('languageLabel')} className="grid grid-cols-4 gap-1">
              {LANGS.map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`min-h-11 px-2 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    lang === code
                      ? GLASS_ACTIVE
                      : 'border border-slate-700/60 bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* TABS — mobilon vízszintesen görgethető, hogy a Timer fül se vágódjon le */}
          <div role="tablist" className={`flex flex-nowrap items-center gap-1 whitespace-nowrap overflow-x-auto hide-scrollbar p-1.5 mb-3 md:shrink-0 ${GLASS_PANEL}`}>
            <button
              role="tab"
              aria-selected={activeTab === 'controls'}
              onClick={() => setActiveTab('controls')}
              title={t('tabControls')}
              className={`min-h-11 min-w-11 py-1.5 px-2.5 rounded-xl text-xs leading-tight font-semibold flex items-center justify-center gap-1 transition-all ${activeTab === 'controls' ? 'shrink-0 sm:flex-1 sm:min-w-fit' : 'shrink-0 sm:flex-none'} ${
                activeTab === 'controls' 
                  ? GLASS_ACTIVE
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span className={activeTab === 'controls' ? 'whitespace-nowrap' : 'sr-only'}>{t('tabControls')}</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'presets'}
              onClick={() => setActiveTab('presets')}
              title={t('tabPresets')}
              className={`min-h-11 min-w-11 py-1.5 px-2.5 rounded-xl text-xs leading-tight font-semibold flex items-center justify-center gap-1 transition-all ${activeTab === 'presets' ? 'shrink-0 sm:flex-1 sm:min-w-fit' : 'shrink-0 sm:flex-none'} ${
                activeTab === 'presets' 
                  ? GLASS_ACTIVE
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className={activeTab === 'presets' ? 'whitespace-nowrap' : 'sr-only'}>{t('tabPresets')}</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'gallery'}
              onClick={() => setActiveTab('gallery')}
              title={t('tabGallery')}
              className={`min-h-11 min-w-11 py-1.5 px-2.5 rounded-xl text-xs leading-tight font-semibold flex items-center justify-center gap-1 transition-all ${activeTab === 'gallery' ? 'shrink-0 sm:flex-1 sm:min-w-fit' : 'shrink-0 sm:flex-none'} ${
                activeTab === 'gallery' 
                  ? GLASS_ACTIVE
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Image className="w-4 h-4 shrink-0" />
              <span className={activeTab === 'gallery' ? 'whitespace-nowrap' : 'sr-only'}>{t('tabGallery')}</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'timer'}
              onClick={() => setActiveTab('timer')}
              title={t('tabTimer')}
              className={`min-h-11 min-w-11 py-1.5 px-2.5 rounded-xl text-xs leading-tight font-semibold flex items-center justify-center gap-1 transition-all ${activeTab === 'timer' ? 'shrink-0 sm:flex-1 sm:min-w-fit' : 'shrink-0 sm:flex-none'} ${
                activeTab === 'timer' 
                  ? GLASS_ACTIVE
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className={activeTab === 'timer' ? 'whitespace-nowrap' : 'sr-only'}>{t('tabTimer')}</span>
            </button>
          </div>

          {/* TAB CONTENT — wrapper carries the bottom fade scroll hint */}
          <div className="relative">
          <div
            className={`p-3 md:p-3.5 text-slate-200 ${GLASS_PANEL}`}
          >
            
            {/* TAB 1: CONTROLS & SOUND PROFILE */}
            {activeTab === 'controls' && (
              <div className="space-y-2.5">
                
                {/* TENGERI HANG TÍPUS VÁLASZTÓ (SOUND TYPE SELECTION) */}
                <div>
                  <label className="block text-xs font-medium text-amber-300 mb-1 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('soundSection')}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOUND_PROFILE_META.map((type) => {
                      const IconComp = type.icon;
                      const isSelected = soundType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setSoundType(type.id as SoundType)}
                          className={`min-h-11 p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                            isSelected
                              ? `${GLASS_ACTIVE} shadow-lg shadow-amber-400/10`
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-amber-200 leading-tight">
                              {tr(type.label)}
                            </span>
                            <IconComp className={`w-3 h-3 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                          </div>
                          {/* Mobilon csak a profil neve fér el kényelmesen */}
                          <span className="hidden sm:block text-xs text-slate-400 mt-0.5">
                            {tr(type.desc)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wind Speed Slider with Dynamic Depth-of-Field Horizon Blur Indicator */}
                <div>
                  <div className="flex justify-between items-center gap-2 min-w-0 text-xs font-medium mb-1 text-slate-300">
                    <span className="flex items-center gap-1.5 min-w-0 text-amber-300">
                      <Wind className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {t('windLabel')}
                    </span>
                    <span className="text-amber-400 font-bold whitespace-nowrap shrink-0">{windSpeed} km/h</span>
                  </div>
                  {/* Diagnosztikai kijelző — saját sorban, hogy ne szűkítse a felirat sorát */}
                  <span className="hidden sm:block text-xs text-amber-300/80 font-mono opacity-70 mb-1">
                    {`${t('dofBlur')}: ${horizonBlurPx.toFixed(1)}px`}
                  </span>
                  <input
                    type="range"
                    aria-label={t('windLabel')}
                    min="5"
                    max="100"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(Number(e.target.value))}
                    className="range-touch range-amber w-full h-11 cursor-pointer"
                  />
                  <div className="hidden sm:flex justify-between text-xs text-slate-400 opacity-70 mt-0.5">
                    <span>{t('windMin')}</span>
                    <span>{t('windMax')}</span>
                  </div>
                </div>

                {/* Wave Speed Slider */}
                <div>
                  <div className="flex justify-between items-center gap-2 min-w-0 text-xs font-medium mb-1 text-slate-300">
                    <span className="flex items-center gap-1.5 min-w-0 text-sky-300">
                      <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      {t('waveLabel')}
                    </span>
                    <span className="text-sky-400 font-bold whitespace-nowrap shrink-0">{waveSpeed}s</span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('waveLabel')}
                    min="1.5"
                    max="8"
                    step="0.1"
                    value={waveSpeed}
                    onChange={(e) => setWaveSpeed(Number(e.target.value))}
                    className="range-touch range-sky w-full h-11 cursor-pointer"
                  />
                  <div className="hidden sm:flex justify-between text-xs text-slate-400 opacity-70 mt-0.5">
                    <span>{t('waveMin')}</span>
                    <span>{t('waveMax')}</span>
                  </div>
                </div>

                {/* Sunshine Intensity & Water Sparkle Slider */}
                <div>
                  <div className="flex justify-between items-center gap-2 min-w-0 text-xs font-medium mb-1 text-slate-300">
                    <span className="flex items-center gap-1.5 min-w-0 text-amber-300">
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {t('sunLabel')}
                    </span>
                    <span className="text-amber-400 font-bold whitespace-nowrap shrink-0">{sunGlow}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('sunLabel')}
                    min="10"
                    max="100"
                    value={sunGlow}
                    onChange={(e) => setSunGlow(Number(e.target.value))}
                    className="range-touch range-amber w-full h-11 cursor-pointer"
                  />
                  <div className="hidden sm:flex justify-between text-xs text-slate-400 opacity-70 mt-0.5">
                    <span>{t('sunMin')}</span>
                    <span>{t('sunMax')}</span>
                  </div>
                </div>

                {/* Sunset Color Scheme Selector */}
                <div>
                  <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
                    <span className="min-w-0 text-xs font-medium text-slate-300">
                      {t('moodLabel')}
                    </span>
                    {/* Napszak-követés kapcsoló — kézi választás automatikusan kikapcsolja */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoMood}
                      onClick={() => setAutoMood((prev) => !prev)}
                      className={`shrink-0 min-h-11 min-w-11 justify-center flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all ${
                        autoMood
                          ? GLASS_ACTIVE
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{t('autoMood')}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'golden',
                        label: { hu: 'Aranyóra', en: 'Golden Hour', ro: 'Ora de Aur', de: 'Goldene Stunde' },
                        color: 'from-amber-500 to-orange-600'
                      },
                      {
                        id: 'sunset',
                        label: { hu: 'Vörös Naplemente', en: 'Red Sunset', ro: 'Apus Roșu', de: 'Roter Sonnenuntergang' },
                        color: 'from-rose-600 to-amber-600'
                      },
                      {
                        id: 'twilight',
                        label: { hu: 'Bíbor Alkony', en: 'Twilight', ro: 'Amurg Purpuriu', de: 'Purpurdämmerung' },
                        color: 'from-purple-600 to-indigo-700'
                      },
                      {
                        id: 'night',
                        label: { hu: 'Csendes Éjszaka', en: 'Quiet Night', ro: 'Noapte Liniștită', de: 'Stille Nacht' },
                        color: 'from-slate-800 to-blue-950'
                      }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          // Kézi választás: a napszak-követés kikapcsol
                          setAutoMood(false);
                          setTimeOfDay(mode.id as TimeOfDay);
                        }}
                        className={`min-h-11 p-1.5 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition-all ${
                          timeOfDay === mode.id
                            ? `${GLASS_ACTIVE} font-bold`
                            : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-full h-1 rounded-full bg-gradient-to-r ${mode.color}`} />
                        <span>{tr(mode.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-300 mb-2">
                  {t('presetsIntro')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className="min-h-11 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition-all flex items-start justify-between group"
                    >
                      <div>
                        <h3 className="text-xs font-bold text-amber-200 group-hover:text-amber-300">
                          {tr(preset.name)}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {`${t('windShort')}: ${preset.windSpeed} km/h • ${t('waveShort')}: ${preset.waveSpeed}s`}
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
              <div className="space-y-2">
                <p className="text-xs text-slate-300 mb-2">
                  {t('galleryIntro')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative min-h-11 min-w-11 rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                        currentImageIndex === idx
                          ? 'border-amber-400/45 ring-2 ring-amber-400/30 scale-[1.02]'
                          : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                      }`}
                    >
                      <img src={img.src} alt={tr(img.title)} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent p-1.5 flex items-end">
                        <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                          {tr(img.title)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MINDFULNESS TIMER */}
            {activeTab === 'timer' && (
              <div className="space-y-3 text-center">
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-3xl font-mono font-bold text-amber-300 tracking-wider">
                    {timerSecondsLeft !== null ? formatTimerTime(timerSecondsLeft) : `${timerMinutes}:00`}
                  </span>
                  <p className="text-xs text-slate-300 mt-1">
                    {isTimerRunning 
                      ? t('meditationActive')
                      : t('timerIntro')}
                  </p>
                </div>

                {!isTimerRunning ? (
                  <div className="space-y-2">
                    <div className="flex justify-center gap-2">
                      {[5, 10, 15, 20].map((m) => (
                        <button
                          key={m}
                          onClick={() => setTimerMinutes(m)}
                          className={`min-h-11 min-w-11 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            timerMinutes === m
                              ? GLASS_ACTIVE
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {m} {t('minutes')}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={startTimer}
                      className={`w-full min-h-11 py-2.5 rounded-xl ${GLASS_ACTIVE} font-bold text-xs shadow-lg shadow-amber-400/15 hover:bg-amber-400/25 transition-all flex items-center justify-center gap-2`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{t('startSession')}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="w-full min-h-11 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    <span>{t('stopTimer')}</span>
                  </button>
                )}
              </div>
            )}

          </div>
          </div>
          {canScrollMore && (
            <div
              aria-hidden="true"
              className="pointer-events-none sticky bottom-0 -mt-8 h-8 shrink-0 rounded-b-2xl bg-gradient-to-t from-slate-950/80 to-transparent"
            />
          )}
        </div>
      )}

    </div>
  );
}
