# Tengeri Képgaléria & Látvány

Interaktív tengeri hangulat-app: animált hullámok, felhők, szélcsíkok és
procedurálisan generált óceánhang (Web Audio API — nincs hangfájl, a böngésző
állítja elő zajból és szűrőkből). Meditációs időzítő, zen mód és önálló
HTML-export is van benne.

## Futtatás

**Előfeltétel:** Node.js 18+

```bash
npm install
npm run dev
```

A `http://localhost:3000` címen nyílik meg.

## Build

```bash
npm run build     # dist/ mappába épít
npm run preview   # a buildet szolgálja ki helyben
npm run lint      # TypeScript típusellenőrzés
```

## Megjegyzés

Az app **nem** használ Gemini API-t és nem igényel API-kulcsot — a Google AI
Studio sablonjából örökölt `GEMINI_API_KEY` / `express` / `dotenv` maradványok
el lettek távolítva.
