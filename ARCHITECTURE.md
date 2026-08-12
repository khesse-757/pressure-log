# Architecture

## Data pipeline

```
File -> parseCsv() -> RawReading[] -> resample() -> Series -> chart
                                          |
                                          +-> rateOfChange() -> stats
```

- `parseCsv`: streaming line parser, no external CSV library. Returns
  typed readings plus a list of skipped line numbers with reasons.
- `resample`: buckets raw readings into fixed intervals (default 5
  minutes, mean aggregation). Chart and stats always consume resampled
  data; raw data is kept for re-bucketing when the range changes.
- `rateOfChange(series, windowHours, endTime)`: pure function returning
  delta, per hour rate, and coverage.

All three are pure, synchronous, and unit tested. Parsing runs in a Web
Worker so large files do not block the UI.

## Layers

- `src/data/`: pure parsing, resampling, and statistics
- `src/storage/`: IndexedDB (readings), localStorage (notes, prefs)
- `src/workers/`: off-thread CSV parsing
- `src/ui/`: thin DOM components; logic stays in `data/`
- `src/utils/`: constants, formatting, shared types

The `Series` type in `src/utils/types.ts` is the future API boundary
for the planned live collector (phase 2).
