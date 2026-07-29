# Tengermoraj — Interactive Ocean Ambience

**Live: <https://beach-542.pages.dev>**

A calm-down web app: animated seascapes with **procedurally generated ocean sound**.
There are no audio files in this project — every wave, gust and raindrop you hear is
synthesised in the browser from filtered noise using the Web Audio API.

Built as a single-page React app. Everything runs client-side; there is no backend,
no API key and no tracking.

---

## Features

**Living water.** The sea surface ripples continuously through an animated SVG
turbulence filter applied to a clipped copy of the photo, so the water moves while the
sand, sky and foliage stay sharp. The wave-rhythm slider sets its tempo.

**Living scenes.** Three high-resolution seascapes with a slow breathing zoom, drifting
clouds, a three-layer depth-of-field haze on the horizon, a sun glow anchored to the
actual sun position in each photo, and a sparkle path that follows the water surface.

**Procedural audio.** Four sound profiles — Sandy Shore, Rocky Shore, Open Ocean and
Rain at Sea. Switching between them re-tunes the filter graph continuously, so there are
no clicks or gaps.

**Live controls.** Wind speed drives both the sound and the atmospheric horizon blur.
Wave rhythm sets the swell period of the audio LFO and the tempo of the water motion.
Sun intensity controls how much the water glitters. Every slider affects the running
audio graph in real time.

**Four moods.** Golden Hour, Red Sunset, Twilight and Quiet Night change the colour
grading of the scene and the intensity of the water sparkles. They can follow the local
clock automatically, or be set by hand.

**Meditation and sleep timer.** Set a duration and get a soft sine chime when it ends —
or, if audio is playing, a ten-second fade to silence instead, for falling asleep to.

**Screen stays awake.** While sound is playing the Wake Lock API keeps the display on,
so the session is not cut short by the screen timeout.

**Remembers everything.** Language, sound profile, slider positions, mood and the
selected image are restored on the next visit.

**Installable.** A web app manifest makes it installable to the home screen on mobile,
where it opens full-screen with its own icon.

**Zen mode.** Hides the whole interface so only the scene remains.

**Standalone export.** One button downloads a single self-contained `.html` file with the
image embedded as base64 and the full audio engine inlined. It works offline, with no
server and no dependencies — just open it in a browser.

**Four languages.** Hungarian, English, Romanian and German interface, with the choice
remembered between visits.

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
| Hosting | Cloudflare Pages |

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
public/
  icon.svg                app icon
  manifest.webmanifest    PWA manifest
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
the vertical band of water, and a `clip-path` polygon describing the water surface. That
polygon does double duty — it keeps the sparkles off sand, grass and sky, and it masks
the animated displacement layer so only the sea ripples. If you swap in your own photos,
those values need adjusting.

There is deliberately no service worker: the app is small enough to load quickly, and
skipping it avoids stale-cache surprises after a deploy.

---

## License

MIT — see [LICENSE](LICENSE).
