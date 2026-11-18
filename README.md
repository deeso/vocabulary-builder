# Vocabulary Builder

A mobile app for building vocabulary across multiple languages — with etymology,
interesting facts, and cross-language word relationships — plus a spaced-repetition
learning engine. Offline-first, with an optional multiplayer layer planned for later.

## Architecture at a glance

The project has two halves that are developed independently:

```
                 ┌─────────────────────────────┐
                 │   pipeline/  (Python)        │   ← runs on your machine / CI
                 │   open corpus + LLM enrich   │
                 │   → builds content.db        │
                 └──────────────┬──────────────┘
                                │ ships content.db in the app bundle
                                ▼
                 ┌─────────────────────────────┐
                 │   app/  (Expo / React Native)│   ← runs on the phone
                 │   offline SQLite + FSRS SRS  │
                 │   flashcards, word detail…    │
                 └─────────────────────────────┘
```

- **`pipeline/`** — a Python content pipeline (Phase 0). It ingests open-source
  definitions, enriches each word with etymology / fun facts / relationships using
  the Claude API, verifies the results, and bakes everything into a read-only
  **SQLite** database (`content.db`) that ships inside the app. The LLM work happens
  here, at build time — never on the user's device. This keeps the app fully offline
  and free of per-user API cost.
- **`app/`** — the Expo / React Native app (Phase 1+). It reads the shipped
  `content.db`, keeps user progress in a separate writable database, and runs an
  FSRS spaced-repetition engine. *(Created once Node is installed — see below.)*
- **`docs/`** — architecture notes and the roadmap.

## Getting started

### 1. Content pipeline (works right now — no API key needed)

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run the whole pipeline in MOCK mode (no network, no API key):
python -m vocab_pipeline.run --mock

# …or with real Claude enrichment (needs ANTHROPIC_API_KEY):
export ANTHROPIC_API_KEY=sk-ant-...
python -m vocab_pipeline.run
```

This produces `pipeline/build/content.db`. Inspect it with any SQLite viewer
(the recommended VS Code extensions include one).

### 2. The app

**Live (installable PWA):** https://deeso.github.io/vocabulary-builder/. Open it on your phone and
choose *Add to Home Screen*. It works offline after the first visit.

**Run it locally in your browser** (Node.js 24+):

```bash
./start-local.sh
```

That installs dependencies the first time, builds, and serves the app at http://localhost:4173/.
Add `--lan` to open it from phones or tablets on the same Wi-Fi. The script prints the address.
On localhost the app can also be installed from the browser and works offline.

For development:

```bash
cd app
npm install
npm run web          # dev server with hot reload
npm run build:web    # production PWA build for GitHub Pages → app/dist
```

Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.
See [app/README.md](app/README.md) for features, content format and commands.

> The pipeline isn't built yet, so content is hand-seeded JSON in `app/src/content/`,
> using the schema the pipeline will emit. A web build can't use the bundled SQLite DB
> (GitHub Pages can't send the headers wasm SQLite needs), so JSON is the shipping format for now.

## Roadmap

| Phase | Goal |
|-------|------|
| **0** | Content pipeline → `content.db` (this repo, runnable now) |
| **1** | Offline Expo MVP: browse + flashcards + FSRS ✅ (plus synonym/antonym challenge) |
| **2** | Etymology / facts / cross-language relations; multiple languages |
| **3** | Stats, audio pronunciation, themes, deck customization |
| **4** | Multiplayer (duels, leaderboards) behind a feature flag |
