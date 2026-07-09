# Backend

This folder is the backend scaffold for the Notiflo order notification app.

At the moment, the backend is not implemented yet:

## Backend Structure

```text
backend/
├── package.json
├── package-lock.json
├── README.md
├── server.js
└── services/
	├── notifications.js
	├── supabase.js
	└── whatsapp.js
```

## Current State

- `server.js` is empty.
- `services/supabase.js` is empty.
- `services/notifications.js` is empty.
- `services/whatsapp.js` is present as a placeholder for WhatsApp integration.
- `package.json` declares the backend dependencies, but there is no start script yet.

## What is here

- `server.js` - intended Express entry point
- `services/` - placeholder for Supabase, notification, and WhatsApp integration
- `package.json` - backend dependencies and metadata
- `package-lock.json` - locked dependency versions

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add any backend secrets to a local `.env` file.

3. Implement the server entry point and service modules before trying to run the backend.

## Notes

- The backend currently depends on `express`, `dotenv`, `@supabase/supabase-js`, and `twilio`.
- Because the server has not been wired up yet, there are no API routes, background jobs, or run commands to document yet.
- If you want, this README can be expanded later with environment variables, API routes, and deployment steps once the backend is implemented.