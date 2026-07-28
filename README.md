# Beach — Interactive Ocean Ambience

A calm-down web app: animated seascapes with **procedurally generated ocean sound**.
There are no audio files in this project — every wave, gust and raindrop you hear is
synthesised in the browser from filtered noise using the Web Audio API.

Built as a single-page React app. Everything runs client-side; there is no backend,
no API key and no tracking.

---

## Features

**Living scenes.** Three high-resolution seascapes with a slow breathing zoom, drifting
clouds, a sun glow anchored to the actual sun position in each photo, and a sparkle path
that follows the water surface.

**Procedural audio.** Four sound profiles — Sandy Shore, Rocky Shore, Open Ocean and
Rain at Sea. Switching between them re-tunes the filter graph continuously, so there are
no clicks or gaps.

**Live controls.** Wind speed drives both the sound and the atmospheric horizon blur.
Wave rhythm sets the swell period of the audio LFO. Sun intensity controls how much the
water glitters. Every slider affects the running audio graph in real time.

**Four moods.** Golden Hour, Red Sunset, Twilight and Quiet Night change the colour
grading of the scene and the intensity of the water sparkles.

**Meditation timer.** Set a duration and get a soft sine chime when it ends.

**Zen mode.** Hides the whole interface. Click anywhere on the sea to send out ripples.

**Standalone export.** One button downloads a single self-contained `.html` file with the
image embedded as base64 and the full audio engine inlined. It works offline, with no
server and no dependencies — just open it in a browser.

**Bilingual.** Hungarian and English interface.

---

## How the audio works

There are no samples. The engine builds a small synthesis graph on the fly:

- A **white noise buffer** is generated once and looped as the raw material.
- A **low-pass filter** shapes it into surf. Its cutoff frequency defines the character
  of the shore — 170 Hz reads as a deep open ocean, 580 Hz as gravel and spray.
- A **low-frequency oscillator** modulates the gain, which produces the rise and fall of
  the waves. Its frequency is the reciprocal of the wave-rhythm slider.
- Separate **band-pass and high-pass branches** add wind and rain layers, mixed in with
  their own gain nodes.
- Parameter changes use `setTargetAtTime`, so every adjustment glides instead of jumping.

The whole engine lives in a single framework-agnostic module, `src/audio/oceanAudio.js`.
The React app imports it normally; the standalone HTML export imports the same file with
Vite's `?raw` suffix and inlines its source. One implementation, two runtimes — the
exported file can never drift from the app.

---

## Tech stack

| | |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Audio | Web Audio API (no libraries) |

No backend, no database, no environment variables.

---

## Run locally

**Requirements:** Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Build

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
npm run lint      # TypeScript type check
```

---

## Project structure

```
src/
  App.tsx                 the whole UI and scene composition
  index.css               Tailwind entry + all keyframe animations
  audio/
    oceanAudio.js         the synthesis engine (plain ES module)
    oceanAudio.d.ts       type definitions for the TypeScript side
  assets/images/          three WebP seascapes
index.html
vite.config.ts
```

The keyframe animations are defined once in `index.css` and reused by the standalone
export, which extracts the `@layer utilities` block at build time.

---

## Notes

The scenes rely on per-image tuning data stored alongside each photo: the sun position,
the vertical band of water, and a `clip-path` polygon describing the water surface so
that sparkles never land on sand, grass or sky. If you swap in your own photos, those
values need adjusting.

---

## License

MIT — see [LICENSE](LICENSE).
