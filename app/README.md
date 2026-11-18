# Vocabulary Builder — app

Expo / React Native app (SDK 58, Expo Router). It ships to the web as an installable,
offline-capable PWA on GitHub Pages, and the same code can be built for iOS/Android with EAS.

## Features

- **Challenge**: find *all* the synonyms or antonyms of a word in a mixed pool that
  includes the opposite set and near-miss decoys. Every word has a definition. You can turn
  definitions on as hints, and after each check every option is explained, decoys with a
  "why not?" note.
- **Today / Study**: spaced-repetition flashcards (FSRS-7 via `ts-fsrs`) across English,
  Spanish, French, German and Italian.
- **Words**: a browsable dictionary with etymology, fun facts and cross-language links
  (cognates, borrowings, false friends…).
- **Progress**: review history, per-language progress, study settings and Appearance
  (System / Light / Dark). Today also has a one-tap light/dark toggle.
- Pronunciation through the device's speech engine (`expo-speech`). Progress is stored
  locally on the device (AsyncStorage → `localStorage` on web).

## Commands

```bash
npm install
npm run local          # build + serve locally at http://localhost:4173/ (dist-local/)
npm run local:lan      # same, also reachable from other devices on your network
npm run web            # dev server (hot reload)
npm run build:web      # validate content → export → add PWA manifest + service worker
npm run serve:web      # serve dist/ like GitHub Pages: http://localhost:4173/vocabulary-builder/
npm run check:content  # validate src/content/*.json
npm run typecheck && npm run lint
npm run icons          # regenerate icons from scripts/make-icons.mjs
```

## Local web app

`npm run local` (or `./start-local.sh` from the repo root) builds into `dist-local/` with the
site root as base path, so the app lives at `/` instead of `/vocabulary-builder/`. It only
rebuilds when sources change. Flags: `--lan` (share on your network), `--rebuild`, `--port N`.
By default it listens on 127.0.0.1 only. With `--lan`, anyone on your network can open it.
Offline mode and "Install app" need a secure origin, so they work on `localhost` but not over
plain-http LAN addresses. Progress is stored per browser and per address.

## Content

- `src/content/words.json` holds dictionary and flashcard entries (schema in `src/content/types.ts`).
- `src/content/challenges.json` holds synonym/antonym rounds. Each word needs ≥3 synonyms,
  ≥3 antonyms and ≥2 decoys, and every decoy needs a `note` explaining why it doesn't fit.

`npm run check:content` enforces all of this, and runs in CI before every deploy.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds `dist/` and publishes it
to GitHub Pages. The site's sub-path comes from `experiments.baseUrl` in `app.json`, which must
match the repository name. `scripts/postexport.mjs` also writes `404.html` (so deep links work
on Pages) and `sw.js`, which precaches the whole app for offline use and reloads open pages
when a new version is deployed.
