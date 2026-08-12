# Claude Code Prompt Sequence: Pressure Log

Run these in order, one session or several. Each prompt assumes the
previous ones are done and committed. Keep commits small; run
`npm run check` before each commit (the hooks will force it anyway).

Before prompt 1: create the repo on GitHub (suggested name:
pressure-log), clone it, and copy in CLAUDE.md. Also copy your real
Ruuvi CSV export into the repo root temporarily so Claude Code can
read it while building the parser (it is gitignored in prompt 2).

---

## Prompt 1: Scaffold

```
Read CLAUDE.md in full before doing anything.

Scaffold this project to match the conventions of my existing repo
https://github.com/khesse-757/neon-river. Fetch and read that repo's
package.json, tsconfig.json, vite.config.ts, vitest.config.ts,
eslint.config.js, and .github/workflows/ci.yml before writing our
versions; ours should match its patterns (same script names including
"check", Node 20 in CI, strict TypeScript, ESLint 9 flat config,
Husky + lint-staged with the same lint-staged config).

Also fetch .github/workflows/release.yml from
https://github.com/khesse-757/kahdev.me and copy it into this repo
unchanged, and copy bump-version.sh and the VERSION file pattern from
neon-river. Set VERSION to 0.1.0.

Create the full directory skeleton from the Project Structure section
of CLAUDE.md with stub files, a minimal index.html and main.ts that
render an empty dark shell, and the dark theme CSS variables in
styles/main.css modeled on the Ruuvi app look described in CLAUDE.md.

Install uPlot as the only runtime dependency.

Do not build features yet. Finish by running npm run check and fixing
anything it flags. Reminders: no em dashes, no emojis, small modules.
```

## Prompt 2: Data layer

```
Build the data layer: src/data/parseCsv.ts, resample.ts,
rateOfChange.ts, tendency.ts, units.ts, and src/utils/types.ts and
constants.ts, exactly as specified in CLAUDE.md (CSV Format, Data
Pipeline, Constants Reference, Testing Priorities).

There is a real export in the repo root named RuuviTag_*.csv. Read its
first 50 lines to confirm the header and date format, then create
tests/fixtures/sample.csv as a trimmed copy: keep the header, the
first 5 rows (these include pre-sync rows with empty sequence
numbers), and about 200 rows total. Add RuuviTag_*.csv to .gitignore
so full exports never get committed; the fixture is committed.

Write the tests listed under Testing Priorities before or alongside
each module. All functions pure and synchronous. No external CSV or
date libraries.

Then add src/workers/parse.worker.ts that runs parseCsv off the main
thread and posts progress, and wire Vite's worker handling for it.

Finish with npm run check green.
```

## Prompt 3: Import and chart

```
Build the import flow and the chart view.

ImportPanel: drag and drop zone plus a file picker button that works
on mobile Safari and Chrome. On file select, parse via the worker with
a progress indicator, then store the dataset in IndexedDB via
storage/datasetStore.ts. On app start, load the persisted dataset if
one exists and skip straight to the chart.

PressureChart: uPlot line chart of resampled pressure, styled to the
dark Ruuvi look from main.css. RangeChips for 1d/2d/5d/10d/All.
StatsRow showing Min, Max, Average, Latest for the visible range.
Unit toggle hPa/inHg persisted via prefsStore.

Test on desktop, then run npm run dev -- --host and check it on a
phone on the same network. The chart must feel smooth on the phone
with a full 4 day dataset.
```

## Prompt 4: Rate of change panel

```
Build RatePanel per CLAUDE.md: the trailing window table (1h, 3h, 6h,
12h, 24h) with delta, per hour rate, and tendency label, computed from
data/rateOfChange.ts and data/tendency.ts.

Add scrubber mode: tapping or clicking a point on the chart recomputes
the panel ending at that timestamp, with a clear indicator showing
which moment is selected and a way to snap back to Latest.

Show coverage honestly: if the loaded data does not span a window,
display that instead of a number.
```

## Prompt 5: Notes

```
Build NotesPanel and storage/notesStore.ts per CLAUDE.md: add a note
with editable timestamp, text, optional 1 to 5 feeling rating;
localStorage persistence; newest first list where each note shows the
pressure and 3h tendency at its timestamp when data covers it; JSON
export and import.

Render note markers on the chart at their timestamps. Tapping a marker
scrolls to or highlights the note.
```

## Prompt 6: Snapshot card

```
Build SnapshotCard per CLAUDE.md: a clean phone sized card with
current pressure, tendency arrow and label, 1h/3h/6h deltas,
timestamp, and the most recent in-range note. No navigation chrome in
this view. Add a Save as PNG button that renders the card to a canvas
and downloads it; the card must also look right in a plain native
screenshot.

This card is the thing that gets shared, so polish it: alignment,
spacing, and typography matter more here than anywhere else in the
app.
```

## Prompt 7: CI, deploy, domain

```
Verify .github/workflows contains ci.yml and deploy.yml matching
neon-river's structure and release.yml from kahdev.me. Add
public/CNAME containing pressure.kahdev.me. Confirm vite.config.ts
needs no base path change since we serve from a custom domain root.

Update README.md: what the app is, the CSV export steps from the Ruuvi
app, local development, and the same Versioning and Releases section
style as kahdev.me's README. Update ARCHITECTURE.md with the data
pipeline diagram and the reasoning for uPlot and the worker.

Then walk me through, without doing it for me: enabling GitHub Pages
(Source: GitHub Actions) on the repo, and adding the Cloudflare CNAME
record (pressure -> khesse-757.github.io, DNS only, matching my other
records).
```

## Prompt 8: Release

```
Run npm run check and npm run build, fix anything flagged. Then run
./bump-version.sh and select minor to go to 0.2.0, commit as
"chore: bump version to 0.2.0", and push. Confirm the release
workflow created the tag and release, and the deploy workflow
published the site.
```
