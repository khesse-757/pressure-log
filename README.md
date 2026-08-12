# Pressure Log

A barometric pressure tracker for RuuviTag CSV exports. Load a CSV from
the Ruuvi app and see the pressure chart, how fast the pressure is
rising or falling over standard windows, and your own notes lined up
against the readings, so trends can be matched with how you feel.
Everything runs in the browser and stays on your device: no accounts,
no server, no cloud.

## Live Site

[https://pressure.kahdev.me](https://pressure.kahdev.me)

## Getting your data out of the Ruuvi app

1. Open the Ruuvi Station app on your phone.
2. Tap your sensor to open its card.
3. Open the history chart, then tap the export icon (or the three dot
   menu and choose Export history).
4. The app produces a CSV file named like
   `RuuviTag_XXXX_20260812T110126-0400.csv`. Share or save it
   somewhere you can reach from your browser, such as Files on iPhone.
5. Open Pressure Log, tap Choose CSV file (or drag the file in on a
   computer), and the chart appears. The dataset is saved locally, so
   the next visit goes straight to the chart.

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repo (SSH)
git clone git@github.com:khesse-757/pressure-log.git
cd pressure-log

# Or clone via HTTPS
git clone https://github.com/khesse-757/pressure-log.git
cd pressure-log

# Install dependencies
npm install

# Start local server
npm run dev

# Open http://localhost:5173
# For phone testing on the same network:
npm run dev -- --host
```

### Scripts

| Command             | Purpose                   |
| ------------------- | ------------------------- |
| `npm run dev`       | Start dev server          |
| `npm run build`     | Production build          |
| `npm run test`      | Run tests in watch mode   |
| `npm run test:run`  | Run tests once            |
| `npm run lint`      | ESLint check              |
| `npm run typecheck` | TypeScript check          |
| `npm run check`     | Lint, typecheck, and test |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data pipeline design and
[CLAUDE.md](CLAUDE.md) for the full product spec and conventions.

## Versioning and Releases

This repository uses automated versioning with GitHub Actions. To
create a new release:

```bash
# Use the helper script (recommended)
./bump-version.sh

# Or manually edit VERSION file
echo "0.2.0" > VERSION

# Commit and push
git add VERSION package.json package-lock.json
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

The GitHub Action will automatically create a tag and release with a
generated changelog when VERSION changes on main.

## License

MIT
