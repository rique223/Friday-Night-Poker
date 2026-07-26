# server

The Express + SQLite API. See the [root readme](../readme.md) for the domain rules, the
endpoint table and how to run everything together — this file covers only what is specific
to the server package.

## Layout

```
src/
  config.ts            env loading + validation; imported before anything reads process.env
  app.ts               middleware, routes, static SPA in production
  index.ts             boot, listen, graceful shutdown
  db/
    index.ts           connection, pragmas, migration runner, withTransaction
    migrations.ts      numbered migrations, recorded in schema_migrations
  middleware/          auth, validation, origin guard, error handler, cache control
  routes/              route tables; validation schemas attach here
  controllers/         request/response only, no business logic
  services/            all domain logic and SQL
  scripts/             createUser, migrate
```

## Conventions

- **Money is integer cents** everywhere. Nothing does float arithmetic on a balance.
- **Timestamps are ISO-8601 UTC** with a `Z`, fixed width, so lexicographic ordering is
  chronological and `ORDER BY created_at` can use an index.
- **Balances are derived, never incremented.** `net_balance` and `payout` are recomputed
  from a player's movement logs on every write, which is what makes correcting or undoing
  a movement safe.
- **Errors are `AppError(code, status, message)`.** The `code` is the contract; the client
  translates it. Never write user-facing prose in a service.
- **Validation lives in `@fnp/shared`.** Routes attach a zod schema through the `validate`
  middleware, and handlers read `validated(req)` — controllers never inspect raw input.
- Express 5 forwards rejected promises to the error middleware, so handlers need no
  `try`/`catch` wrapper.

## Environment

Copy `.env.example` to `.env`. `JWT_SECRET` is the only required value; everything else has
a sensible default. Invalid or missing values fail at boot with a readable message rather
than at the first request.

`ENABLE_DEV_ROUTES=true` exposes `DELETE /api/dev/reset`, which **deletes every session and
player**. It requires authentication and is ignored entirely when `NODE_ENV=production`.

`DATA_DIR` overrides where `poker.sqlite` lives — useful for rehearsing a migration against
a copy of the real database before running it for real.

## Migrations

Add a new numbered entry to the `migrations` array in `src/db/migrations.ts`. Each runs
once, in order, inside a transaction, and is recorded in `schema_migrations`. Never edit a
migration that has already been applied — add another one.

`initDb()` applies pending migrations on every boot, so `yarn dev` and `yarn start` are
always up to date. `yarn migrate` does it without starting the server.
