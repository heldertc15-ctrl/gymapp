# Momentum

Momentum is a merged study tracker and gym log built with Next.js.

## Features

- Study dashboard with timer, daily goal, streaks, weekly chart, and year heatmap
- Study history and settings
- Gym split templates for Push, Pull, and Legs
- Live workout logging with sets, reps, weight, PRs, and recent workout history
- Gym JSON import/export for moving local data between devices

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## GitHub Pages Build

This repo can still publish through the `docs` folder for the existing GitHub Pages project URL.

```powershell
$env:GITHUB_PAGES='true'
npm run build:pages
Remove-Item Env:\GITHUB_PAGES
```

The static export is copied into `docs`.
