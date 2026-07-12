# Backend

This folder contains the NotiFlo notification backend, built with Express, Supabase, and Twilio.

## Structure

```text
backend/
├── package.json
├── package-lock.json
├── .env                # local secrets/config (not committed)
├── .gitignore
├── README.md
├── server.js
└── services/
	├── notifications.js   # scaffold / placeholder
	├── sms.js
	├── supabase.js        # scaffold / placeholder
	└── whatsapp.js
```

## What it does

- Starts an Express server with JSON parsing enabled.
- Checks Supabase connectivity through a `/health` endpoint.
- Lists pending notifications from Supabase.
- Processes WhatsApp notifications and SMS fallback notifications.
- Runs background pollers every 30 seconds for WhatsApp and SMS.

## API endpoints

- `GET /health` - server and Supabase health check
- `GET /notifications/pending` - list pending notifications
- `POST /notifications/process-whatsapp` - process pending WhatsApp notifications
- `POST /notifications/process-sms` - process pending SMS notifications

## Environment variables

Create a local `.env` file with the backend secrets used by `server.js`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WHATSAPP_NUMBER`
- `PORT` (optional, defaults to `3000`)

## Scripts

- Install: `npm install`
- Start: `npm start`
- Dev watch: `npm run dev`

## Notes

- The backend is ESM-based (`"type": "module"`).
- The current implementation expects the Supabase tables used by the notification pollers to already exist.
- `services/notifications.js` and `services/supabase.js` are currently placeholders.