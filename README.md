# SRT Subtitle Translator

A modern, high-performance, cross-platform desktop application for translating subtitle files (`.srt`, `.vtt`, `.ass`) into multiple languages using state-of-the-art AI Translation APIs (Gemini, OpenAI, DeepL, and more). Built with **Tauri v2**, **React**, **TypeScript**, and **SQLite**.

---

## Key Features

1. **Multi-Format Subtitle Support**:
   - Parse and write `.srt` (SubRip), `.vtt` (WebVTT), and `.ass` (Advanced SubStation Alpha) files.
   - Handles text encodings including `UTF-8`, `UTF-8 BOM`, and legacy `ANSI (Windows-1252)` automatically.
   - Load and batch-manage multiple subtitle files at once.
2. **AI-Driven Subtitle-Aware Translation**:
   - Provider-based modular architecture supporting **Gemini AI**, **OpenAI**, **DeepL API**, **LibreTranslate**, and **Custom OpenAI-compatible Endpoints** (such as local Ollama/LM Studio servers).
   - Preserves timestamps, subtitle indices, formatting tags (`<i>`, `<b>`, `<u>`), and complex styling tags (like ASS overrides) exactly.
3. **Advanced Translation Modes**:
   - *Standard*: Fast and accurate line-by-line translation.
   - *Context-Aware*: Translates adjacent blocks together, preserving dialogue cohesion, subject reference, and pronoun continuity.
   - *Movie Mode*: Adapts expressions for cinematic dialogue flow, emotional tone, and natural spoken speed.
   - *Anime Mode*: Automatically preserves honorifics (e.g. *-kun*, *-san*, *-chan*, *senpai*) and cultural terms.
4. **Local Translation Memory (SQLite Cache)**:
   - Uses a embedded SQLite database cache to save translations.
   - Prevents duplicate translations and reduces API costs significantly on repeated subtitle translation runs.
5. **Quality Assurance (QA) Engine**:
   - Automated timeline validation: flags out-of-order blocks, negative durations, empty text content, and timeline overlaps.
   - Format integrity verification: alerts users if HTML formatting tags are left unbalanced.
6. **Premium Split-Screen Editor**:
   - Interactive side-by-side split screen showing original and translated subtitles.
   - Direct inline text editing with live sync and search filtering.
7. **Keyboard Shortcuts & UI Aesthetics**:
   - Fluid sidebar layout with responsive Dark/Light themes.
   - System-wide keyboard shortcuts for opening files (`Ctrl+O`), starting translations (`Ctrl+Enter`), and navigating tabs.

---

## Technical Architecture

- **Desktop Shell**: [Tauri v2](https://tauri.app/) (Rust backend for database & OS file IO)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Embedded Database**: [SQLite](https://www.sqlite.org/) via Rust `rusqlite` (bundled engine)
- **Testing Framework**: [Vitest](https://vitest.dev/)

---

## Project Structure

```text
srt-subtitle-translator/
├── src/                      # Frontend Source (React + TS)
│   ├── app/
│   │   └── store.ts          # Zustand App Store (Files, Settings, Translation orchestrator)
│   ├── components/           # Reusable UI components
│   ├── pages/                # Navigable Views (Home, Translator, Preview/Editor, Stats, Settings)
│   ├── services/
│   │   ├── subtitle/
│   │   │   ├── parser.ts     # SRT, VTT, ASS subtitle parsers
│   │   │   ├── writer.ts     # Multi-format serializer
│   │   │   ├── validator.ts  # QA Validation engine (Chronology, Overlaps, Tags)
│   │   │   └── translator.ts # Queue, batching, rate-limiting & cost estimations
│   │   └── translators/      # API integrations (Gemini, OpenAI, DeepL, LibreTranslate)
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts
│   ├── types/
│   │   └── index.ts          # TS Model Definitions
│   └── tests/
│       └── subtitle.test.ts  # Vitest suite
├── src-tauri/                # Desktop Backend Source (Rust)
│   ├── src/
│   │   ├── db.rs             # SQLite wrapper (rusqlite table initialization, caching & statistics)
│   │   ├── fs_utils.rs       # Secure file reading & text encoding detection
│   │   └── lib.rs            # Tauri setup, command registration & DB state management
│   ├── Cargo.toml            # Rust cargo manifest
│   └── tauri.conf.json       # Tauri system configuration
├── package.json              # NPM manifest
├── vite.config.ts            # Vite compile settings
└── build.sh                  # Shell packaging helper
```

---

## Database Schema (SQLite)

The application initializes an SQLite database (`subtitles_translator.db`) inside the operating system's standard application data directory.

### 1. Table `translation_cache`
Stores unique mappings of translated segments to reuse translations, acting as the local translation memory.

```sql
CREATE TABLE translation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    provider TEXT NOT NULL,
    mode TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_translation_lookup 
ON translation_cache (source_lang, target_lang, provider, mode, source_text);
```

### 2. Table `translation_history`
Tracks statistics and logs of completed subtitle translations.

```sql
CREATE TABLE translation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    total_chars INTEGER NOT NULL,
    total_lines INTEGER NOT NULL,
    cost_est REAL NOT NULL,
    speed_lpm REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Getting Started

### Prerequisites

1. **Node.js**: v18.0 or newer
2. **Rust & Cargo**: v1.75 or newer
3. **Linux System Libraries** (required for Tauri rendering window on Linux):
   - **Fedora / RedHat**:
     ```bash
     sudo dnf install -y webkit2gtk4.1-devel libsoup3-devel javascriptcoregtk4.1-devel
     ```
   - **Ubuntu / Debian**:
     ```bash
     sudo apt-get install -y libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
     ```

### Installation

Clone the repository and install npm packages:
```bash
git clone <repository-url>
cd srt-subtitle-translator
npm install
```

### Run in Development Mode

Launches the application hot-reloading window:
```bash
npm run tauri dev
```

### Running Tests

Execute Vitest test suite checking parser, writer, and QA modules:
```bash
npm run test
```

### Build & Package Production Binary

Generate production-ready native installable binaries (AppImage/deb/rpm on Linux, .app/dmg on macOS, .exe on Windows):

- **Using Helper Script (Linux/Fedora)**:
  ```bash
  ./build.sh
  ```
- **Using Standard CLI**:
  ```bash
  npm run tauri build
  ```
The packaged assets will be exported to: `src-tauri/target/release/bundle/`.
