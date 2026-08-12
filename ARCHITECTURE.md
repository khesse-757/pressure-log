# Architecture

## Data pipeline

```
File -> parseCsv() -> RawReading[] -> resample() -> Series -> chart
                                          |
                                          +-> rateOfChange() -> stats
```

- `parseCsv` (src/data/parseCsv.ts): streaming line parser, no
  external CSV library. Scans the file with an index instead of
  splitting the whole text, matches the Ruuvi header names exactly
  (unicode degree signs included), tolerates pre-sync rows with empty
  sequence numbers and comma decimal separators, and returns typed
  readings plus a list of skipped line numbers with reasons. Files
  that are not Ruuvi exports are rejected with a friendly error.
- `resample` (src/data/resample.ts): buckets raw readings into fixed
  intervals (default 5 minutes, mean aggregation). A 4 day export of
  about 109,000 rows becomes roughly 1,100 points. The chart and all
  statistics consume resampled data; raw readings are kept in
  IndexedDB for re-bucketing.
- `rateOfChange` (src/data/rateOfChange.ts): finds the readings
  nearest the window edges by binary search and returns delta, per
  hour rate, and the span actually covered. When the data does not
  span the full window it says so instead of extrapolating.
- `tendency` (src/data/tendency.ts): maps a 3 hour delta to one of
  five plain language labels using thresholds from
  src/utils/constants.ts.

All of these are pure, synchronous functions with unit tests in
tests/data/.

## Why a Web Worker for parsing

A real export is around 109,000 rows and parses in roughly 200 ms.
That is fast, but on a phone it is long enough to freeze scrolling and
animation if it runs on the main thread. `src/workers/parse.worker.ts`
runs `parseCsv` off thread and posts progress messages, so the import
UI stays responsive and can show a progress bar. The worker is plain
message passing around the same pure function, so nothing about
parsing itself depends on the worker.

## Why uPlot

The raw dataset is 100k+ points and the resampled series is redrawn on
every range and unit change. uPlot is a canvas renderer purpose built
for large time series, is about 45 KB, and has no dependencies. It is
the only runtime dependency; everything else (CSV parsing, resampling,
statistics, storage) is hand written and tested, because that is where
the learning value is. Chart overlays (scrub cursor, note markers) are
plain positioned DOM elements inside uPlot's overlay div, so uPlot
stays unmodified.

## Layers

- `src/data/`: pure parsing, resampling, statistics, and view models
- `src/storage/`: IndexedDB for readings, localStorage for notes and
  preferences
- `src/workers/`: off-thread CSV parsing
- `src/ui/`: thin DOM components; logic stays in `data/`
- `src/utils/`: constants, formatting, shared types

The `Series` type in src/utils/types.ts is the API boundary for the
planned phase 2 live collector: anything that can produce a `Series`
can feed the chart and statistics unchanged.
