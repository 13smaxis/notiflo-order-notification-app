# Moses Butchery App (Vite + React + TS)

## Demo Mode (Local DB)

The app now supports a local demo database backed by `localStorage` with seeded orders. This allows running the app without any backend.

- In development, demo mode is enabled by default. To force it explicitly, set:

```
VITE_USE_LOCAL_DB=true
```

- To use the remote backend in production, build without the flag or set `VITE_USE_LOCAL_DB=false`.

### Demo login
- Email: any email (e.g. demo@example.com)
- Password: `moses2024`

### Scripts
- Install: `npm install --legacy-peer-deps`
- Dev: `npm run dev`

The board will show seeded orders across Queue, Grill, Ready, and Collected. Add, move, search, and delete are all persisted locally.
