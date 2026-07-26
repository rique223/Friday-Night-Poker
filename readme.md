# Friday Night Poker

Bookkeeping for a home poker game. One person runs the app from a laptop; everyone else
sees it from a phone or tablet on the same network.

It exists because the group plays Omaha with a single chip case that usually runs out
before the night does. Players with spare chips lend them to players who bust, the lender
gets a **credit**, and at the end of the night the app works out exactly who pays what —
without anyone having to pay their buy-in when they sit down.

## How the maths works

Everything is tracked against the table, not between players, so nobody ends up owing
another player directly.

| Term        | Meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| Buy-in      | Chips taken from the bank. Counts **against** you.                  |
| Credit      | Chips you lent to another player. Counts **for** you.               |
| Net balance | `sum(credits given) − sum(buy-ins)`. Negative until you lend chips. |
| Payout      | `final chip count + net balance` at cash-out.                       |

A **positive payout** is what the house hands the player. A **negative payout** is what
the player owes the house. Chips received as a credit are recorded in the receiver's
buy-in log, so a player who is holding borrowed chips can't cash out ahead of what they
actually owe.

Money is stored, transported and computed as **integer cents** throughout — no float
arithmetic ever touches a balance. Timestamps are ISO-8601 UTC.

## Stack

- **client** — React 19, TypeScript, Vite 7, Tailwind v4, TanStack Query, React Router 7
- **server** — Express 5, TypeScript, SQLite (WAL), JWT in an httpOnly cookie
- **shared** — zod schemas that define the API contract for both sides, plus a generated
  OpenAPI document

Yarn workspaces, one lockfile.

## Getting started

```bash
yarn install

cp server/.env.example server/.env
# JWT_SECRET is the only required value:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

yarn create-user           # prompts for email + password, hidden
yarn dev                   # client on :5173, API on :4000
```

There is no sign-up. Accounts are created only with `yarn create-user`, because this is a
private tool for one poker group.

The database lives at `server/data/poker.sqlite` and is created on first run. Pending
migrations are applied automatically at boot; `yarn workspace server migrate` runs them
without starting the server and prints what has been applied.

## Production (single process)

`yarn build` compiles the shared package and the client. In production the Express app
serves `client/dist` itself, so there is one process, one origin, and the session cookie
needs no cross-origin handling.

```bash
yarn build
NODE_ENV=production yarn start
```

`JWT_SECRET` must be at least 32 characters when `NODE_ENV=production`; below that the
server refuses to start. In development it only warns.

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `yarn dev`          | Client and API together, with reload              |
| `yarn build`        | Build shared + client for production              |
| `yarn start`        | Run the compiled server                           |
| `yarn lint`         | ESLint across all workspaces                      |
| `yarn type-check`   | `tsc` across all workspaces                       |
| `yarn format`       | Prettier write                                    |
| `yarn format:check` | Prettier check                                    |
| `yarn create-user`  | Create a login                                    |
| `yarn openapi`      | Regenerate `shared/openapi.json` from the schemas |

A `pre-commit` hook runs Prettier and ESLint on staged files. `yarn install` points git at
it; `git commit --no-verify` skips it.

## API

Every route lives under `/api` and requires the session cookie except `/api/health`,
`/api/openapi.json` and `/api/auth/login`.

| Method   | Path                                    |                                         |
| -------- | --------------------------------------- | --------------------------------------- |
| `GET`    | `/api/health`                           | Liveness + database check               |
| `POST`   | `/api/auth/login`                       | Sets the session cookie                 |
| `POST`   | `/api/auth/logout`                      |                                         |
| `GET`    | `/api/auth/me`                          |                                         |
| `GET`    | `/api/sessions`                         | Grouped, paginated **by group**         |
| `POST`   | `/api/sessions`                         |                                         |
| `GET`    | `/api/sessions/:id`                     | Session with players and movements      |
| `PATCH`  | `/api/sessions/:id`                     | `{ status: open \| ended \| archived }` |
| `POST`   | `/api/sessions/:id/players`             |                                         |
| `DELETE` | `/api/sessions/:id/players/:playerId`   | Only before the player has movements    |
| `POST`   | `/api/sessions/:id/buy-ins`             |                                         |
| `PATCH`  | `/api/sessions/:id/buy-ins/:entryId`    | Correct a mistyped amount               |
| `DELETE` | `/api/sessions/:id/buy-ins/:entryId`    |                                         |
| `POST`   | `/api/sessions/:id/credits`             |                                         |
| `PATCH`  | `/api/sessions/:id/credits/:creditId`   | Moves both halves together              |
| `DELETE` | `/api/sessions/:id/credits/:creditId`   |                                         |
| `POST`   | `/api/sessions/:id/cash-outs`           | Returns the payout                      |
| `DELETE` | `/api/sessions/:id/cash-outs/:playerId` | Undo a cash-out                         |

The authoritative description is `shared/openapi.json`, generated from the zod schemas and
also served live at `GET /api/openapi.json` — it cannot drift from what the server
validates.

Responses are `{ success: true, data }` or
`{ success: false, error: { code, message, details? } }`. `code` is a stable enum the
client maps to translated messages, so error text is never the server's English prose.

### Session lifecycle

`open → ended → archived`, and archiving is reversible.

- A session can only be **ended** once every player has cashed out.
- A session can only be **archived** once it has ended.
- An archived session is read-only until it is restored.

## Notes

- **Grouping** happens on the server, and pages are pages _of groups_, so a week is never
  split across two pages. The client sends its UTC offset so a game that runs past
  midnight groups into the night the players experienced.
- **Currency** is a display preference (BRL/USD/EUR), not a conversion. The group plays in
  one currency; the selector only changes the symbol and formatting.
- **Languages**: pt-BR (default), en, es. Strings live in `client/src/i18n/locales/`, and
  the key type is derived from `pt.json`, so a missing key in another locale is a compile
  error.

## Not built yet

Deliberately out of scope for now, listed so nobody goes looking:

- Chip reconciliation and session totals — the group plays with partly virtual chips
- A settlement view (who pays whom) — everything settles against the table instead
- Player identity across sessions, lifetime stats, leaderboards
- Multi-device concurrent editing — one operator does the bookkeeping
- Automated tests and CI
- PWA / offline support
- Backups beyond whatever the host machine does

## License

MIT.
