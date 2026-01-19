# Chamdor Meat Supply App (Vite + React + TS)

## Project Structure

```
charmdor-meat-supply-app/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # SEO robots file
│   └── sw.js                  # Service worker for PWA
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...            # Other UI primitives
│   │   ├── AddOrderModal.tsx  # Modal for creating new orders
│   │   ├── AppLayout.tsx      # Main app layout with header
│   │   ├── Header.tsx         # Header component
│   │   ├── KanbanBoard.tsx    # Main kanban board view
│   │   ├── LoginModal.tsx     # Authentication modal
│   │   ├── OrderCard.tsx      # Order card with timer
│   │   ├── SearchModal.tsx    # Search orders modal
│   │   └── theme-provider.tsx # Dark/light theme provider
│   ├── contexts/
│   │   └── AppContext.tsx     # Global app state context
│   ├── hooks/
│   │   ├── use-mobile.tsx     # Mobile detection hook
│   │   ├── use-toast.ts       # Toast notifications hook
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useOrders.ts       # Orders data hook
│   │   ├── useOrdersAdapter.ts # Orders adapter (local/remote)
│   │   └── useOrdersLocal.ts  # Local storage orders hook
│   ├── lib/
│   │   ├── local-db.ts        # Local database operations
│   │   ├── supabase.ts        # Supabase client config
│   │   └── utils.ts           # Utility functions
│   ├── pages/
│   │   ├── Index.tsx          # Home page
│   │   └── NotFound.tsx       # 404 page
│   ├── types/
│   │   └── order.ts           # TypeScript types & interfaces
│   ├── App.css                # App-level styles
│   ├── App.tsx                # Root app component
│   ├── index.css              # Global styles
│   └── main.tsx               # App entry point
├── components.json            # shadcn/ui configuration
├── eslint.config.js           # ESLint configuration
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.app.json          # App TypeScript config
├── tsconfig.node.json         # Node TypeScript config
└── vite.config.ts             # Vite build configuration
```

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
