Setup

- Install deps: `npm install`
- Dev: `npm run dev`

API

- POST `/api/sessions` → { sessionId }
- GET `/api/sessions` → list
- GET `/api/sessions/:id` → includes players with totals
- POST `/api/sessions/:id/players` { name, initialBuyIn }
- POST `/api/sessions/:id/buyins` { playerId, amount }
- POST `/api/sessions/:id/credits` { providerId, receiverId, amount }
- POST `/api/sessions/:id/cashout` { playerId, finalChipCount }

