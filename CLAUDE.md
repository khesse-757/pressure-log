# CLAUDE.md - Pressure Log

> A barometric pressure tracker for RuuviTag CSV exports.
> Parse the CSV, chart the pressure, compute rate of change over
> selectable windows, and pair readings with personal notes so trends
> can be aligned with how the user feels.

---

## Style Rules (read first)

- No em dashes anywhere: code, comments, docs, UI copy, commit messages
- No emojis anywhere
- Small, modular files. One responsibility per module. Prefer many
  small files over one large file
- TypeScript strict mode. No `any` unless justified with a comment
- Pure functions for all math and parsing so they are trivially testable
- Follow the existing conventions of khesse-757/neon-river wherever
  this document does not say otherwise

---

## Quick Reference

```bash
npm install            # Install dependencies
npm run dev            # Start dev server (http://localhost:5173)
npm run dev -- --host  # Dev server reachable from phone on LAN
npm run build          # Production build
npm run preview        # Preview production build
npm run test           # Run tests (watch mode)
npm run test:run       # Run tests once
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run typecheck      # TypeScript check
npm run check          # Run all checks (pre-commit)
./bump-version.sh      # Interactive version bump
```

---

## Product Vision

The primary user opens the Ruuvi app, exports a CSV, opens this site on
her phone, loads the CSV, and immediately sees:

1. The pressure chart over a selectable time range
2. Rate of change statistics for standard windows
3. A plain language tendency label (falling fast, falling, steady,
   rising, rising fast)
4. Her notes overlaid on the chart at the times she wrote them

She then screenshots a snapshot card that combines the current numbers
with her latest note. The whole flow should take under a minute on a
phone.

Look and feel: professional, dark, calm. Visually similar to the native
Ruuvi app (dark teal background, mint green accent, thin line charts,
small stat rows above each chart reading Min / Max / Average / Latest).
Mobile first. Desktop is a wider version of the same layout, not a
different app.

---

## Core Features

### 1. CSV Import

- Drag and drop on desktop, file picker button on mobile
- Parses the RuuviTag export format (see CSV Format below)
- Tolerant of pre-sync rows with empty measurement sequence numbers
- Tolerant of comma decimal separators (some locales export `1013,25`)
- Rejects files that do not look like a Ruuvi export with a clear,
  friendly error message
- The parsed dataset is persisted to IndexedDB so reopening the page
  shows the last loaded data without re-importing

### 2. Chart

- uPlot line chart of air pressure over time
- Unit toggle: hPa / inHg (persisted preference)
- Range selector chips like the Ruuvi app: 1 day, 2 days, 5 days,
  10 days, All
- Stat row above the chart: Min, Max, Average, Latest for the visible
  range
- Note markers rendered on the chart at their timestamps
- Data is resampled before charting (see Data Pipeline)

### 3. Rate of Change (the core feature)

- A stats panel showing pressure delta over trailing windows ending at
  the latest reading: 1h, 3h, 6h, 12h, 24h
- Each row shows: window, delta (signed, in current unit), rate per
  hour, and a tendency label
- Tendency thresholds (on the 3h window, standard meteorological
  practice) with defaults:
  - falling fast: <= -2.0 hPa per 3h
  - falling:      <= -0.5 hPa per 3h
  - steady:       between -0.5 and +0.5
  - rising:       >= +0.5 hPa per 3h
  - rising fast:  >= +2.0 hPa per 3h
- Thresholds live in constants.ts, not hardcoded in components
- A scrubber mode: tap or click a point on the chart to see the same
  windows computed ending at that moment, so past episodes can be
  reviewed ("how fast was it falling Tuesday night?")

### 4. Notes

- Add a note: timestamp (defaults to now, editable), free text, and an
  optional feeling rating from 1 to 5
- Stored in localStorage as JSON (single user, single device is fine
  for v1)
- Listed in a Notes panel, newest first, each showing the pressure and
  3h tendency at that timestamp when data covers it
- Export notes as JSON, import notes from JSON (so she can back up or
  move devices)

### 5. Snapshot Card

- A dedicated, screenshot friendly card view sized for a phone screen
- Shows: current pressure, tendency arrow and label, the 1h/3h/6h
  deltas, timestamp, and the most recent note if one exists within the
  visible range
- A button renders the card to a PNG for download using a canvas based
  export, with native screenshot as the fallback path
- No navigation chrome on this view so screenshots are clean

---

## CSV Format (verified against a real export)

Filename pattern: `RuuviTag_XXXX_YYYYMMDDTHHMMSS-ZZZZ.csv`

Columns (20):

```
Date                      2026-08-08 11:51:53   local time, no zone
Temperature (°C|°F|K)     three columns
Rel. humidity (%)
Abs. humidity (g/m³)
Dew point (°C|°F|K)       three columns
Air pressure (hPa)        primary source column
Air pressure (Pa)         integer
Air pressure (mmHg)
Air pressure (inHg)
Movements
Battery (V)
Acc. X|Y|Z (g)            three columns
Signal strength (RSSI)
Meas. seq. number         may be empty on early rows
```

Facts about real exports that the parser and tests must handle:

- Sample interval is about 3 seconds; a 4 day export is ~109,000 rows
- The first rows may predate a full sync and have empty sequence numbers
- Header names include unicode degree signs and superscripts; match
  them exactly, do not normalize away
- Only Date and the pressure columns are required for v1; parse the
  rest opportunistically into the dataset for future features (the
  Ruuvi app also charts temperature and humidity, and a later version
  of this app may too)

---

## Data Pipeline

```
File -> parseCsv() -> RawReading[] -> resample() -> Series -> chart
                                          |
                                          +-> rateOfChange() -> stats
```

- `parseCsv`: streaming line parser, no external CSV library. Returns
  typed readings plus a list of skipped line numbers with reasons
- `resample`: buckets raw readings into fixed intervals (default 5
  minutes, mean aggregation). 109k rows become ~1,150 points. Chart and
  stats always consume resampled data; raw data is kept for re-bucketing
  when the user changes range
- `rateOfChange(series, windowHours, endTime)`: pure function. Finds
  the reading nearest endTime and the reading nearest endTime minus
  window, returns delta, per hour rate, and coverage (if the data does
  not span the full window, say so rather than extrapolating)
- All three are pure, synchronous, and fully unit tested. Parsing a
  109k row file must not block the UI: run it in a Web Worker

---

## Tech Stack

| Tool          | Purpose                          | Version |
| ------------- | -------------------------------- | ------- |
| TypeScript    | Language (strict mode)           | ^5.7    |
| Vite          | Build tool                       | ^6.0    |
| Vitest        | Testing                          | ^2.1    |
| ESLint        | Linting (flat config)            | ^9.0    |
| Prettier      | Formatting                       | ^3.4    |
| Husky         | Git hooks                        | ^9.1    |
| lint-staged   | Pre-commit checks                | ^15.2   |
| uPlot         | Time series chart (canvas)       | ^1.6    |

uPlot is the only runtime dependency. Rationale: the raw dataset is
100k+ points and uPlot is a ~45KB canvas renderer purpose built for
large time series. Everything else (CSV parsing, resampling, stats,
storage) is hand written and tested, because that is where the learning
value is. Do not add other runtime dependencies without discussion.

---

## Project Structure

```
pressure-log/
├── public/
│   └── CNAME                     # Custom domain (set during deploy phase)
├── src/
│   ├── main.ts                   # Entry point, app wiring
│   ├── data/
│   │   ├── parseCsv.ts           # Ruuvi CSV -> RawReading[]
│   │   ├── resample.ts           # RawReading[] -> Series
│   │   ├── rateOfChange.ts       # Series -> window stats
│   │   ├── tendency.ts           # rate -> tendency label
│   │   └── units.ts              # hPa <-> inHg conversion
│   ├── storage/
│   │   ├── datasetStore.ts       # IndexedDB persistence for readings
│   │   ├── notesStore.ts         # localStorage persistence for notes
│   │   └── prefsStore.ts         # unit + range preferences
│   ├── workers/
│   │   └── parse.worker.ts       # off-thread CSV parsing
│   ├── ui/
│   │   ├── App.ts                # layout shell, view switching
│   │   ├── ImportPanel.ts        # drop zone + file picker
│   │   ├── PressureChart.ts      # uPlot wrapper + note markers
│   │   ├── RangeChips.ts         # 1d/2d/5d/10d/All selector
│   │   ├── StatsRow.ts           # min/max/avg/latest
│   │   ├── RatePanel.ts          # rate of change table + scrubber
│   │   ├── NotesPanel.ts         # note list + add form
│   │   └── SnapshotCard.ts       # screenshot view + PNG export
│   ├── utils/
│   │   ├── constants.ts          # thresholds, bucket sizes, ranges
│   │   ├── format.ts             # number and date formatting
│   │   └── types.ts              # shared interfaces
│   └── styles/
│       └── main.css              # dark theme, CSS variables
├── tests/
│   ├── data/                     # parseCsv, resample, rateOfChange,
│   │                             # tendency, units tests
│   ├── storage/                  # notesStore round trip tests
│   └── fixtures/
│       └── sample.csv            # trimmed real export (~200 rows)
├── .github/workflows/
│   ├── ci.yml                    # lint, typecheck, test, build
│   ├── deploy.yml                # GitHub Pages deploy
│   └── release.yml               # auto tag + release on VERSION change
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── VERSION
├── bump-version.sh
├── CLAUDE.md                     # This file
├── ARCHITECTURE.md
├── README.md
└── LICENSE                       # MIT
```

---

## Constants Reference

```typescript
// src/utils/constants.ts

export const RESAMPLE_MINUTES = 5;

export const RANGES_DAYS = [1, 2, 5, 10] as const; // plus "All"

export const RATE_WINDOWS_HOURS = [1, 3, 6, 12, 24] as const;

// Tendency thresholds in hPa per 3 hours
export const TENDENCY = {
  FALLING_FAST: -2.0,
  FALLING: -0.5,
  RISING: 0.5,
  RISING_FAST: 2.0,
};
```

---

## Conventions Carried Over From neon-river

- `npm run check` runs lint, typecheck, and test:run and must pass
  before every commit (enforced by Husky + lint-staged)
- `VERSION` file is the single source of truth for the version;
  `./bump-version.sh` updates VERSION, package.json, package-lock.json
- ci.yml and deploy.yml mirror neon-river's structure (Node 20, npm ci,
  check job gates the build job, deploy uploads dist/ with
  actions/deploy-pages@v4)
- release.yml is carried over from khesse-757/kahdev.me: when VERSION
  changes on main and the tag does not exist, it creates the tag and a
  GitHub release with a generated changelog. With release.yml present,
  the manual `git tag` step printed by bump-version.sh is unnecessary;
  just commit and push
- Custom domain: public/CNAME in this repo plus one Cloudflare CNAME
  record pointing the subdomain at khesse-757.github.io, DNS only

---

## Testing Priorities

Highest value tests, in order:

1. `parseCsv`: real header row, pre-sync rows, comma decimals, garbage
   lines, empty file, wrong file
2. `rateOfChange`: exact window, partial coverage, gaps in data,
   endTime before data starts
3. `resample`: bucket boundaries, uneven sampling, single reading
4. `tendency`: threshold boundaries exactly at the constant values
5. `units`: round trip hPa to inHg to hPa within tolerance
6. Notes store: save, load, export, import round trip

UI is kept thin so it needs few tests; logic lives in `data/` and is
covered there.

---

## Non-Goals for v1

- No live Bluetooth (a Raspberry Pi collector is the planned phase 2;
  the data layer's Series type is the future API boundary)
- No accounts, no server, no cloud sync
- No temperature or humidity charts (parse the columns, do not build UI)
- No medical claims of any kind in UI copy; the app correlates numbers
  with self reported notes, nothing more

---

_Current version: 0.1.0_
