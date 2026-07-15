# NotiFlo Order Notification App

NotiFlo is a Vite + React + TypeScript order notification app with a Supabase-backed frontend and a separate Node/Express backend for notification processing.

## Project Structure

```text
notiflo-order-notification-app/
├── backend/
│   ├── package.json
│   ├── server.js
│   └── services/
│       ├── notifications.js
│       ├── sms.js
│       ├── supabase.js
│       └── whatsapp.js
├── docs/
├── postman/
│   ├── collections/
│   │   └── NotiFlo-API/
│   │       ├── Auth/
│   │       ├── Health/
│   │       ├── Notifications/
│   │       └── Stores/
│   ├── environments/
│   ├── flows/
│   ├── globals/
│   ├── mocks/
│   └── specs/
├── public/
│   ├── favicon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json
│   ├── robots.txt
│   └── sw.js
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── AddEmployeeModal.tsx
│   │   ├── AddOrderModal.tsx
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── LoginModal.tsx
│   │   ├── OrderCard.tsx
│   │   ├── SearchModal.tsx
│   │   └── theme-provider.tsx
│   ├── contexts/
│   │   └── AppContext.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useAuth.ts
│   │   ├── useOrders.ts
│   │   ├── useOrdersAdapter.ts
│   │   └── useOrdersLocal.ts
│   ├── lib/
│   │   ├── local-db.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── types/
│   │   └── order.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Frontend

The frontend is a React Router app with a dashboard layout, modal-driven order management, and shared state for authentication and store selection.

The Supabase client is configured in [src/lib/supabase.ts](src/lib/supabase.ts) and reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, with fallback values already present in the code.

The repository also keeps a local order-store implementation in [src/lib/local-db.ts](src/lib/local-db.ts) for seeded data and offline experiments.

### Frontend scripts

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Backend

The backend lives in [backend/README.md](backend/README.md) and runs an Express server with health, notification, and authenticated store endpoints.

Current routes in [backend/server.js](backend/server.js):

- `GET /health`
- `GET /notifications/pending`
- `POST /notifications/process-whatsapp`
- `POST /notifications/process-sms`
- `POST /api/add-store`

The server also starts WhatsApp and SMS pollers on a 30-second interval.

## Postman

The [postman/](postman/) folder contains collection requests and environment assets for Auth, Health, Notifications, and Stores workflows.

## Notes

- For backend configuration and runtime variables, see [backend/README.md](backend/README.md).
- The PWA assets live in [public/](public/).
