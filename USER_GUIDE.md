# SRT Subtitle Translator - User Guide

Welcome to the **SRT Subtitle Translator**! This guide walks you through setting up, configuring, translating, previewing, and exporting subtitles.

---

## 1. Quick Start Setup

When you open the application for the first time, you must configure your API keys.

1. Navigate to the **Settings** page via the sidebar (or press `Alt + K`).
2. Select your preferred translation engine and enter your API credentials:
   - **Google Gemini**: Obtain a key from Google AI Studio. (Gemini 1.5 Flash is highly recommended for speed and low cost).
   - **OpenAI**: Enter your secret token. (GPT-4o-mini is optimized for high-quality, cost-efficient translations).
   - **DeepL**: Enter your API Auth Key. The app supports both Free (`:fx` suffix) and Pro keys.
   - **LibreTranslate**: Set up a local or public endpoint.
   - **Custom OpenAI-Compatible**: Allows routing to Ollama/LM Studio running locally on your computer (e.g. `http://localhost:11434/v1` for Ollama).
3. Choose your default theme (**Dark** or **Light**) and target language.
4. Save your changes (they are stored securely in local app preferences).

---

## 2. Step-by-Step Translation Walkthrough

### Step 1: Load Subtitles
1. Go to the **Dashboard** page (`Alt + H`).
2. Click **Select Subtitle Files** to open a file dialog, or drag-and-drop subtitle files.
3. The app automatically detects the file format (`.srt`, `.vtt`, or `.ass`) and its encoding (like UTF-8, UTF-8 BOM, or ANSI/Windows-1252 for older European subtitles).

### Step 2: Configure Translation Settings
1. Click **Translate** next to your loaded file, or go to the **Translator** page (`Alt + T`).
2. Select the file you wish to translate from the dropdown.
3. Select the **Source Language** (or leave it on *Auto Detect*).
4. Select the **Target Language** (e.g., Vietnamese, Spanish, French, etc.).
5. Choose your AI provider and set the translation mode.

### Step 3: Choose the Ideal Translation Mode
- **Standard Mode**: Processes line-by-line. Best for quick drafts or single-sentence dialogue.
- **Context-Aware Mode**: Groups batches of lines together (e.g., 20 lines). The AI reads the entire block at once, ensuring that subject references (he, she, they, it) and flow are consistent.
- **Movie Mode**: Instructs the AI to focus on dialogue pacing, conversational tones, and speaker intent instead of word-for-word translation.
- **Anime Mode**: Preserves Japanese honorifics (like *-kun*, *-san*, *-chan*, *senpai*, *-sama*) and cultural terms. Keeps anime character speaking styles distinct.

### Step 4: Run & Monitor
1. Click **Start Translation** (or press `Ctrl + Enter`).
2. Check the real-time metrics:
   - **Progress Bar**: Current completion percentage.
   - **Lines Finished**: Number of completed dialogue blocks.
   - **Speed (Lines/Min)**: Real-time throughput.
   - **Estimated Cost (USD)**: Calculated API spend based on processed characters.

---

## 3. Previewing, Quality Assurance, and Editing

Once a translation finishes, navigate to **Preview & Editor** (`Alt + E`).

### Side-by-Side Editor
- The screen splits into **Original Subtitle** (left) and **Translated Subtitle** (right) blocks.
- Click on any text box to edit the content directly. If you modify a line, it is saved instantly in memory.

### Quality Assurance (QA) Engine
The application automatically checks for common subtitle bugs:
- **Chronology Error**: The end time is earlier than the start time.
- **Overlap**: A subtitle block starts before the previous one ends (causing overlapping text on screen).
- **Empty Text**: The block has timestamps but no dialogue.
- **Unbalanced Tags**: An HTML tag like `<i>` or `<b>` is opened but never closed.
- Blocks containing issues will be highlighted in **orange/yellow** with an explanatory warning message below the text box.

---

## 4. Exporting Translated Files

1. On the **Preview & Editor** page, click the **Export Translated File** button.
2. Select the output parameters in the popup modal:
   - **Export Format**: Save as `.srt`, `.vtt`, or `.ass`.
   - **Export Mode**:
     - *Translated Text Only*: Standard output containing only the translations.
     - *Bilingual*: Vertically stacks the original text and the translated text in the same subtitle entry.
     - *Original Text Only*: Export original content.
3. Click **Save File**, choose your file location, and select Save.

---

## 5. Performance and Cost-Saving Tips

- **Enable Local Cache**: Keep the *Local Translation Memory Cache* enabled in settings. If you re-translate the same subtitle file, the app pulls identical strings from SQLite instantly, resulting in 0 API cost.
- **Manage Cache**: You can view the size of your SQLite cache database and clear it on the **History & Memory** page (`Alt + S`).
- **Batch Size adjustment**: Larger batch sizes (e.g., 30-40 lines) decrease API roundtrip delays but increase the prompt token overhead. A batch size of **20** is the optimal sweet spot for speed and context retention.
- **Rate Limit Delay**: If you run into API rate limit errors (like HTTP 429), increase the *Rate Limit Delay* in settings (e.g. to `2000` ms) to introduce a pause between batches.

---

## 6. Keyboard Shortcuts Reference

| Shortcut | Action |
| --- | --- |
| `Ctrl + O` | Open file selector dialog |
| `Ctrl + Enter` | Start active file translation |
| `Ctrl + T` | Toggle Dark / Light theme |
| `Alt + H` | Navigate to Dashboard (Home) |
| `Alt + T` | Navigate to Translator |
| `Alt + E` | Navigate to Preview & Editor |
| `Alt + S` | Navigate to History & Memory (Stats) |
| `Alt + K` | Navigate to Settings |
