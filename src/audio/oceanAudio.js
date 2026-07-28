/**
 * Procedurális óceán-hangmotor (Web Audio API).
 *
 * Ez a fájl SZÁNDÉKOSAN sima ES-modul JavaScript, nem TypeScript: a React app
 * modulként importálja, az exportált önálló HTML pedig `?raw` formában, szó
 * szerint illeszti be egy <script type="module"> blokkba. Így mindkét oldal
 * pontosan ugyanazt a hanggráfot építi fel — egyetlen forrása van az igazságnak.
 *
 * A típusokat a mellette lévő oceanAudio.d.ts írja le a TypeScript-oldalnak.
 */

/**
 * Hangprofilonkénti szűrő- és gain-értékek.
 * Ez a tábla az egyetlen hely, ahol a profilok hangzása definiálva van.
 */
export const SOUND_PROFILES = {
  sandy: { waveFilterFreq: 280, lfoGain: 0.35, rainGain: 0, rockyGain: 0 },
  rocky: { waveFilterFreq: 580, lfoGain: 0.5, rainGain: 0, rockyGain: 0.3 },
  ocean: { waveFilterFreq: 170, lfoGain: 0.25, rainGain: 0, rockyGain: 0 },
  rain: { waveFilterFreq: 240, lfoGain: 0.3, rainGain: 0.22, rockyGain: 0 }
};

const DEFAULT_SETTINGS = {
  volume: 0.6,
  windSpeed: 45,
  waveSpeed: 3.8,
  soundType: 'sandy'
};

// Be-/kifadolás hossza másodpercben (lineáris rámpa a master gainen)
const FADE_SECONDS = 0.25;
// setTargetAtTime időállandók: csúszkákhoz gyorsabb, profilváltáshoz lágyabb
const SLIDER_TIME_CONSTANT = 0.1;
const PROFILE_TIME_CONSTANT = 0.2;

/** A szélcsúszka (km/h) leképezése a szélzaj gain-jére. */
function windGainFor(windSpeedKmh) {
  return (windSpeedKmh / 100) * 0.25;
}

/** A hullámritmus (másodperc/hullám) leképezése az LFO frekvenciájára. */
function lfoFrequencyFor(waveSpeedSeconds) {
  return 1 / waveSpeedSeconds;
}

/** Rózsazaj (Voss-McCartney közelítés) a hullámmoraj alapjának. */
function fillPinkNoise(output) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < output.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11;
    b6 = white * 0.115926;
  }
}

/** Fehérzaj adott amplitúdóval (szél, eső, sziklás permet alapja). */
function fillWhiteNoise(output, amplitude) {
  for (let i = 0; i < output.length; i++) {
    output[i] = (Math.random() * 2 - 1) * amplitude;
  }
}

/** Végtelenített zajforrás létrehozása és elindítása. */
function createLoopingNoiseSource(ctx, bufferSize, fill) {
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  fill(buffer.getChannelData(0));

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/**
 * Felépíti a teljes óceán-hanggráfot a megadott AudioContexten.
 *
 * Az AudioContext életciklusa (resume / suspend / close) a hívóé marad —
 * ez az objektum csak a gráfot birtokolja.
 *
 * @param {AudioContext} ctx
 * @param {{volume?: number, windSpeed?: number, waveSpeed?: number, soundType?: string}} [options]
 */
export function createOceanAudio(ctx, options = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...options };
  const profile = SOUND_PROFILES[settings.soundType] || SOUND_PROFILES.sandy;
  const startedAt = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 4;

  let isPlaying = false;
  let isDisposed = false;

  // --- Master gain: némán indul, a start() fadeli be ---
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, startedAt);
  masterGain.connect(ctx.destination);

  // --- 1. Hullámmoraj (rózsazaj + modulált aluláteresztő szűrő) ---
  const waveSource = createLoopingNoiseSource(ctx, bufferSize, fillPinkNoise);

  const waveFilter = ctx.createBiquadFilter();
  waveFilter.type = 'lowpass';
  waveFilter.frequency.setValueAtTime(profile.waveFilterFreq, startedAt);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.2, startedAt);

  waveSource.connect(waveFilter);
  waveFilter.connect(waveGain);
  waveGain.connect(masterGain);
  waveSource.start();

  // Ritmikus LFO a hullámok dagadásához
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(lfoFrequencyFor(settings.waveSpeed), startedAt);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(profile.lfoGain, startedAt);

  lfo.connect(lfoGain);
  lfoGain.connect(waveGain.gain);
  lfo.start();

  // --- 2. Szél ---
  const windSource = createLoopingNoiseSource(ctx, bufferSize, (data) => fillWhiteNoise(data, 0.08));

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(320, startedAt);
  windFilter.Q.setValueAtTime(2.5, startedAt);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(windGainFor(settings.windSpeed), startedAt);

  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(masterGain);
  windSource.start();

  // --- 3. Esőcseppek ---
  const rainSource = createLoopingNoiseSource(ctx, bufferSize, (data) => fillWhiteNoise(data, 0.06));

  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'highpass';
  rainFilter.frequency.setValueAtTime(3200, startedAt);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(profile.rainGain, startedAt);

  rainSource.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(masterGain);
  rainSource.start();

  // --- 4. Sziklás part: hullámtörés permete ---
  const rockySource = createLoopingNoiseSource(ctx, bufferSize, (data) => fillWhiteNoise(data, 0.07));

  const rockyFilter = ctx.createBiquadFilter();
  rockyFilter.type = 'bandpass';
  rockyFilter.frequency.setValueAtTime(850, startedAt);
  rockyFilter.Q.setValueAtTime(1.8, startedAt);

  const rockyGain = ctx.createGain();
  rockyGain.gain.setValueAtTime(profile.rockyGain, startedAt);

  rockySource.connect(rockyFilter);
  rockyFilter.connect(rockyGain);
  rockyGain.connect(masterGain);
  rockySource.start();

  const sources = [waveSource, windSource, rainSource, rockySource];
  const nodes = [
    masterGain, waveFilter, waveGain, lfo, lfoGain,
    windFilter, windGain, rainFilter, rainGain, rockyFilter, rockyGain
  ];

  return {
    /** Fokozatos be-fadolás az aktuális hangerőre. */
    start() {
      if (isDisposed) return;
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(settings.volume, now + FADE_SECONDS);
      isPlaying = true;
    },

    /** Fokozatos ki-fadolás nulláig. A gráf tovább él, újraindítható. */
    stop() {
      if (isDisposed) return;
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      isPlaying = false;
    },

    setVolume(volume) {
      if (isDisposed) return;
      settings.volume = volume;
      // Némított állapotban csak jegyezzük: a következő start() erre fadel be.
      if (isPlaying) {
        masterGain.gain.setTargetAtTime(volume, ctx.currentTime, SLIDER_TIME_CONSTANT);
      }
    },

    setWindSpeed(windSpeedKmh) {
      if (isDisposed) return;
      settings.windSpeed = windSpeedKmh;
      windGain.gain.setTargetAtTime(windGainFor(windSpeedKmh), ctx.currentTime, SLIDER_TIME_CONSTANT);
    },

    setWaveSpeed(waveSpeedSeconds) {
      if (isDisposed) return;
      settings.waveSpeed = waveSpeedSeconds;
      lfo.frequency.setTargetAtTime(lfoFrequencyFor(waveSpeedSeconds), ctx.currentTime, SLIDER_TIME_CONSTANT);
    },

    setSoundType(soundType) {
      if (isDisposed) return;
      const next = SOUND_PROFILES[soundType];
      if (!next) return;
      settings.soundType = soundType;

      const now = ctx.currentTime;
      waveFilter.frequency.setTargetAtTime(next.waveFilterFreq, now, PROFILE_TIME_CONSTANT);
      lfoGain.gain.setTargetAtTime(next.lfoGain, now, PROFILE_TIME_CONSTANT);
      rainGain.gain.setTargetAtTime(next.rainGain, now, PROFILE_TIME_CONSTANT);
      rockyGain.gain.setTargetAtTime(next.rockyGain, now, PROFILE_TIME_CONSTANT);
    },

    /** Minden forrás leállítása és lecsatolása. Utána az objektum nem használható. */
    dispose() {
      if (isDisposed) return;
      isDisposed = true;
      isPlaying = false;

      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // már leállt
        }
        source.disconnect();
      }
      try {
        lfo.stop();
      } catch {
        // már leállt
      }
      for (const node of nodes) {
        node.disconnect();
      }
    }
  };
}
