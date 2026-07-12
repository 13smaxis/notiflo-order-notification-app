# Notiflo Order Notification App

NotiFlo is a Vite + React + TypeScript order notification app with a local demo mode in the frontend and a separate Node/Express backend for WhatsApp and SMS notifications.

## Project Structure

```text
notiflo-order-notification-app/
├── backend/                 # Express API and notification pollers
├── public/                  # PWA assets and service worker
├── src/                     # React app, UI components, hooks, and pages
├── components.json          # shadcn/ui configuration
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry point
├── package.json             # Frontend scripts and dependencies
├── postcss.config.js        # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig*.json           # TypeScript configuration
└── vite.config.ts           # Vite build configuration
```

## Frontend

The frontend uses a local demo database backed by `localStorage` with seeded orders, so the UI can run without the backend while keeping the same order flow.

### Demo mode

- In development, demo mode is enabled by default.
- To force local mode, set `VITE_USE_LOCAL_DB=true`.
- To use the remote backend, build without the flag or set `VITE_USE_LOCAL_DB=false`.

### Demo login

- Email: any email
- Password: `demo2024`

### Frontend scripts

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Backend

The backend lives in [backend/README.md](backend/README.md) and now exposes an Express server with:

- `GET /health`
- `GET /notifications/pending`
- `POST /notifications/process-whatsapp`
- `POST /notifications/process-sms`

It also runs WhatsApp and SMS pollers on a 30-second interval when started.

## Notes

- The app is designed to work in demo mode without any backend configuration.
- For remote notification delivery, configure the backend environment variables documented in [backend/README.md](backend/README.md).
