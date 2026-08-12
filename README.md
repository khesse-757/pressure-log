# Pressure Log

A barometric pressure tracker for RuuviTag CSV exports. Parse the CSV,
chart the pressure, compute rate of change over selectable windows, and
pair readings with personal notes so trends can be aligned with how the
user feels.

## Getting started

```bash
npm install
npm run dev
```

See CLAUDE.md for the full product spec and conventions, and
ARCHITECTURE.md for the data pipeline design.

## Scripts

| Command             | Purpose                   |
| ------------------- | ------------------------- |
| `npm run dev`       | Start dev server          |
| `npm run build`     | Production build          |
| `npm run test`      | Run tests in watch mode   |
| `npm run test:run`  | Run tests once            |
| `npm run lint`      | ESLint check              |
| `npm run typecheck` | TypeScript check          |
| `npm run check`     | Lint, typecheck, and test |

## License

MIT
