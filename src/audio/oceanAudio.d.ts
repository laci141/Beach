/**
 * Típusdefiníciók az oceanAudio.js sima ES-modulhoz.
 * A megvalósítás szándékosan JavaScript, mert a standalone HTML export
 * `?raw` formában, szó szerint futtatja a böngészőben.
 */

export type OceanSoundType = 'sandy' | 'rocky' | 'ocean' | 'rain';

export interface OceanSoundProfile {
  /** A hullámmoraj aluláteresztő szűrőjének vágási frekvenciája (Hz). */
  waveFilterFreq: number;
  /** A hullámdagadást moduláló LFO kitérése. */
  lfoGain: number;
  /** Az esőréteg hangereje. */
  rainGain: number;
  /** A sziklás parti permet hangereje. */
  rockyGain: number;
}

export declare const SOUND_PROFILES: Record<OceanSoundType, OceanSoundProfile>;

export interface OceanAudioOptions {
  /** Kezdeti hangerő 0 és 1 között. */
  volume?: number;
  /** Kezdeti szélsebesség km/h-ban (5-100). */
  windSpeed?: number;
  /** Kezdeti hullámritmus másodpercben (1.5-8). */
  waveSpeed?: number;
  /** Kezdeti hangprofil. */
  soundType?: OceanSoundType;
}

export interface OceanAudio {
  /** Be-fadolás az aktuális hangerőre. */
  start(): void;
  /** Ki-fadolás nulláig; a gráf életben marad, újraindítható. */
  stop(): void;
  /** Források leállítása és lecsatolása; utána az objektum nem használható. */
  dispose(): void;
  setVolume(volume: number): void;
  setWindSpeed(windSpeedKmh: number): void;
  setWaveSpeed(waveSpeedSeconds: number): void;
  setSoundType(soundType: OceanSoundType): void;
}

/**
 * Felépíti az óceán-hanggráfot a megadott AudioContexten.
 * Az AudioContext életciklusa (resume / suspend / close) a hívóé marad.
 */
export declare function createOceanAudio(
  ctx: AudioContext,
  options?: OceanAudioOptions
): OceanAudio;
