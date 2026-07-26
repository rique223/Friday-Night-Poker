# QUESTIONS.md — Full codebase review

> **Reviewer:** Claude (acting as tech lead / code reviewer)
> **Date:** 2026-07-25
> **Scope reviewed:** every file in `client/` and `server/`, root tooling, git history, the live `server/data/poker.sqlite` schema + contents.
> **Verification performed:** `tsc --noEmit` (passes), `eslint` on client (122 errors / 24 warnings) and server (clean), `prettier --check` (8 files fail), read-only SQLite inspection, Node date-parsing repro.

---

## How to use this file

Each item is an **independent question**. Answer inline under **`Answer:`**. Useful shorthands:

- `INTENDED` — this is deliberate, leave it alone (please say _why_, so I don't "fix" it later)
- `BUG — fix it` — confirmed defect, fix as suggested (or describe your preferred fix)
- `DO IT` — apply the suggested improvement
- `LATER` / `WON'T DO` — acknowledged, deprioritised
- Or just write free-form instructions.

Once you've filled this in, prompt me again and I'll execute against your answers.

**Severity legend:** 🔴 Bug or security issue · 🟠 Architecture / design · 🟡 Improvement / polish · 🔵 I need your intent

---

## What this project appears to be (my current understanding — please correct me)

Friday Night Poker is a **single-tenant, home-game bookkeeping app**. One or more authenticated users (created only via a CLI script — there is no sign-up) create a _session_ (one poker night). Players are added to the session with an initial buy-in. During the night you register additional buy-ins, and "credits" — one player lending chips to another. At the end, each player _cashes out_ with a final chip count, and the app computes a `payout`. Sessions can be _ended_ (once every player has cashed out) and _archived_ (soft-deleted). There's an archive browser, week/month/year grouping, pt/en/es translations, BRL/USD/EUR formatting, and a light/dark theme.

Stack: React 19 + Vite + TS + Tailwind v4 + Framer Motion on the front; Express 5 + SQLite (via `sqlite`/`sqlite3`) + JWT-in-httpOnly-cookie on the back. No tests, no CI, no build/deploy pipeline.

**Q0 · Is that description accurate?** In particular: is this meant to stay a private tool for your own poker group, or do you intend it to become multi-tenant (many groups, each with their own sessions and users)? Almost every architectural answer below depends on this.

**Answer:** Yes

>

---

# Section 1 — Domain model & business rules

These are the questions I most need answered, because they determine whether several things below are bugs or intended.

### Q1 · What does `netBalance` actually mean? 🔵

**Where:** `server/services/sessionService.js:113-127, 153-174, 176-226`, DB column `players.net_balance`

**What I see:** a buy-in of 500 stores `net_balance = -500` (confirmed in your live DB — 5 players, all at `-500` after one 500 buy-in). Giving a credit _adds_ to the provider's balance; receiving one _subtracts_. So `net_balance` = "money the house owes this player, before chips are counted" (always ≤ 0 until credits are involved).

**Why it matters:** the UI labels it `Saldo` / `NetBalance` and shows it to players. A player who bought in R$500 sees **-R$500** as their "balance" all night, which reads like a loss. Also, the naming drives whether the maths below is right.

**Question:** is the sign convention intentional? Should the UI instead show "Total invested" (positive) and only show a signed number after cash-out?

**Answer:** This is intended, the context of this app is that I play omaha with friends of my father and we only have one chip case that usually will run out of chips before the night ends so what we do is Players that have excess chips will lend players that run out of chips and the lender will receive a credit that needs to be taken in consideration at the end of the night and during all-ins/buy-ins, if a player has credits he can't all-in with only what he has in the table and if he has credits he doesn't need to do a buy-in once he runs of chips in the table;

>

---

### Q2 · What does `payout` mean — profit, or cash handed over? 🔵

**Where:** `server/services/sessionService.js:241` — `payout = finalChipCount + netBalance`

**What I see:** player buys in 500 (`net_balance = -500`), ends with 800 chips → `payout = 300`. That's **net profit**, not the cash you hand them (which would be 800, assuming 1 chip = 1 currency unit).

**Why it matters:** the UI shows `Pagamento: R$300` next to `Fichas finais: 800`. If someone reads "payout" as "hand this person R$300" the settlement is wrong by the buy-in amount.

**Question:** is `payout` = net profit/loss (rename it to `net`/`result`?), or should it be the cash-out amount? Should the UI show both?

**Answer:** You're assuming that everybody pays their buy-ins when they sit but more often than not they don't so at the end of the night we end paying the difference, if they are positive ((FinalChipCount + Credits) - Buy-in total) > 0 we pay them their profit otherwise they have to pay the house what they lost. One of the ideas of this app is to make payment on sit unnecessary as the correct payment amounts will always be accurate;

>

---

### Q3 · Is 1 chip == 1 currency unit? 🔵

**Where:** `finalChipCount` and `amount` are mixed additively in `cashOut`.

**What I see:** no chip-to-money ratio anywhere. `finalChipCount + netBalance` assumes 1:1.

**Question:** always 1:1, or should a session store a chip value / buy-in denomination?

**Answer:** Yes, for the first version of this app it should be 1 to 1

>

---

### Q4 · Credits received are written into the receiver's **buy-in log** — intended? 🟠🔵

**Where:** `server/services/sessionService.js:212-219`

**What I see:** when A gives B a credit of 100, it is appended to A's `credits_log`, but on B's side it is appended to **`buy_ins_log`**. So B's `totalBuyIns` includes money that never came from the house — it came from A.

**Why it matters:** `totalBuyIns` stops meaning "chips bought from the bank". You can no longer reconcile the night ("total chips issued vs total chips returned"), and you can't see who owes whom.

**Question:** intended shortcut, or should a credit be its own first-class movement (a `credits` table with `from_player`, `to_player`, `amount`) that is _excluded_ from buy-in totals?

**Answer:** This is intended, we don't want to reconcile the table because we are playing with virtual money in part since physical chips may run out;

>

---

### Q5 · Nothing computes the end-of-night settlement 🟠🔵

**What I see:** you track per-player results but never produce "who pays whom, how much" — which is the actual output of a poker night, especially once credits create player-to-player debts.

**Question:** do you want a settlement view (minimal-transaction debt resolution) at session end? Is that the natural next feature, or do you settle verbally at the table?

**Answer:** We simply want to pay everybody fairly that's why we centralize everything in the table instead of making people own other people. A settlement view is not needed right now;

>

---

### Q6 · No chip reconciliation / no session totals 🟡🔵

**What I see:** nothing checks that `Σ finalChipCount == Σ chips issued`, and no session-level totals (total buy-ins, total on the table, house balance) are shown anywhere.

**Why it matters:** the single most common real-world error in a poker night is a miscounted stack. A running "chips issued vs chips counted" delta would catch it immediately.

**Question:** do you want session totals + a reconciliation warning when the session ends?

**Answer:** Not right now since "physical chips" may run out

>

---

### Q7 · No way to correct a mistake 🟠🔵

**What I see:** there is no endpoint or UI to edit/delete a buy-in, edit/delete a credit, remove a player added by accident, or undo a cash-out. Every write is append-only with no compensating action.

**Why it matters:** typos happen constantly during a live game ("5000" instead of "500"). Right now the only recovery is editing SQLite by hand.

**Question:** do you want edit/undo? Preference between hard edit (mutate the log) vs. compensating entries (append a reversal, keep the audit trail)?

**Answer:** Yes, this looks like a good new feature;

>

---

### Q8 · `created_by` is free text, not a user 🟠🔵

**Where:** `sessions.created_by TEXT`, `server/controllers/sessionController.js:4`

**What I see:** the session creator is whatever string is typed into the "Your name" box, even though the request is authenticated and `req.user` is right there.

**Why it matters:** you can't answer "which sessions are mine", the field is used as the _search key_ for the session list, and two people typing "henrique"/"Henrique" produce different groupings.

**Question:** should `created_by` become `created_by_user_id` (FK to `users`, taken from the JWT), with the free-text name kept as an optional display label?

**Answer:** Nope, leave this feature as is

>

---

### Q9 · Players have no identity across sessions 🟠🔵

**What I see:** `players.name` is a per-session string. The same human across 20 Friday nights is 20 unrelated rows.

**Why it matters:** blocks every interesting feature — lifetime P&L, leaderboard, "add the usual crew", stats.

**Question:** do you want a `people` table with `session_players` linking to it? Or is per-session free text deliberate for speed of entry?

**Answer:** It's deliberate to be as simple as possible, we don't need those fancy features right now;

>

---

### Q10 · `is_active` vs `deleted_at` semantics overlap 🟠🔵

**What I see:** a session has _ended_ (`is_active = 0`) and _archived_ (`deleted_at IS NOT NULL`), and they're independent — you can archive a live session with players still in it (`archiveSession` performs no checks at all, `sessionService.js:102-111`).

**Question:** what's the intended lifecycle? My assumption: `open → ended → archived`, with archiving only permitted on ended sessions. Confirm or correct.

**Answer:** You'r assumption is correct;

>

---

### Q11 · Archiving is one click, irreversible from the UI, with no confirmation 🔴🔵

**Where:** `client/src/components/SessionBrowser.tsx:162-173`, `client/src/components/KebabMenu.tsx`

**What I see:** the kebab menu's only item is `Excluir (Arquivar)` — one click, no `confirm()`, no toast on success, and **there is no unarchive endpoint or UI**. The session vanishes from the list permanently (only visible in the archive, read-only).

**Why it matters:** compare with ending a session, which _does_ prompt (`useSession.ts:91`). Destructive-but-silent is the wrong way round.

**Question:** add a confirmation + an "unarchive" action? Or is the archive intentionally one-way?

**Answer:** That's a good suggestion

>

---

# Section 2 — Security

### Q12 · 🔴 CRITICAL: `DELETE /api/dev/reset` is unauthenticated and wipes the database

**Where:** `server/app.js:51` → `server/routes/devRoutes.js:9` → `server/lib/db.js:79-86`

**What I see:** `app.use('/api/dev', devRoutes)` is mounted **without `requireAuth`** and **without any `NODE_ENV` guard**. It drops the `sessions` and `players` tables and recreates them. Combined with `cors({ origin: true })` (`app.js:26`), which reflects _any_ origin and permits `DELETE` on preflight, **any website you visit while the server is running can silently destroy every session and player you have.** No cookie is needed because the route requires no auth.

**Why it matters:** this is a drive-by data-destruction hole. It's also the single fastest way to lose a night's bookkeeping.

**Suggested fix:** delete the route entirely, or gate it behind `requireAuth` **and** `process.env.NODE_ENV !== 'production'` **and** an explicit `ENABLE_DEV_ROUTES=true` env flag.

**Answer:** Good suggestion

>

---

### Q13 · 🔴 Login is case-sensitive on email, but user creation lowercases it

**Where:** `server/services/userService.js:8` (`createUser` normalises to lowercase+trim) vs `:22` (`verifyUser` queries with the raw input); `authController.js:9` passes `email` untouched.

**What I see:** a user created as `Henrique@Gmail.com` is stored as `henrique@gmail.com`. Logging in by typing `Henrique@Gmail.com` (which browsers/phones will autocapitalise) fails with "Invalid credentials" forever.

**Suggested fix:** normalise in `verifyUser` too (and ideally in one shared `normalizeEmail()`), or store a `email_normalized` column.

**Answer:** Good idea

>

---

### Q14 · Missing `JWT_SECRET` fails at runtime, not at boot 🔴

**Where:** `server/middleware/auth.js:9`, `server/index.js:14-19`

**What I see:** your `server/.env` contains only `JWT_SECRET` (no `PORT`, no `NODE_ENV`, contrary to `readme.md`). If it were missing, the server boots happily and every login 500s with `secretOrPrivateKey must have a value`, leaked verbatim to the client (see Q18).

**Suggested fix:** validate required env at startup and exit with a clear message. Also reject a short/default secret in production.

**Answer:** Good idea

>

---

### Q15 · `dotenv.config()` runs _after_ all module imports 🟡

**Where:** `server/index.js:4-10`

**What I see:** ES module imports are hoisted, so `./app.js` and `./lib/db.js` are fully evaluated **before** `dotenv.config()` executes. It works today only because nothing reads `process.env` at module scope. It will break silently the first time someone writes `const X = process.env.Y` at the top of a module.

**Suggested fix:** `import 'dotenv/config'` as the first import, or a dedicated `config.js` that loads + validates env and is imported everywhere.

**Answer:** Good idea

>

---

### Q16 · `cors({ origin: true })` reflects every origin 🔴

**Where:** `server/app.js:26`

**What I see:** any origin is allowed. Credentials aren't enabled, so cookies aren't sent cross-origin (and `SameSite=Lax` helps), but this still exposes every unauthenticated endpoint (`/api/health`, and today `/api/dev/reset`) to any site.

**Question:** in production the client is served from the same origin via a reverse proxy, right? If so CORS can be an explicit allowlist from env (`CORS_ORIGIN`), or dropped entirely. Confirm your deployment topology.

**Answer:** It's not deployed yet, my idea is to deploy in a manner that I can run it in my PC at home and then only access it through the mWeb version of it in a cellphone, tablet or even a laptop at my father friends house;

>

---

### Q17 · No CSRF strategy beyond `SameSite=Lax` 🟠

**Where:** `server/middleware/auth.js:16-22`

**What I see:** auth is a cookie, so every state-changing endpoint is implicitly CSRF-eligible. `SameSite=Lax` blocks cross-site POSTs, which covers the realistic cases — but there is no defence in depth (no `__Host-` prefix, no origin check, no CSRF token).

**Question:** is `SameSite=Lax` + same-origin deployment your accepted answer, or do you want `SameSite=Strict`, a `__Host-session` cookie name, and an `Origin`/`Sec-Fetch-Site` check on mutations?

**Answer:** Just make it as simple as possible while also being secure;

>

---

### Q18 · The error handler leaks internal error messages to clients 🔴

**Where:** `server/middleware/errorHandler.js:1-9`

**What I see:** for a 500, `err.message` (SQLite errors, JWT internals, stack-adjacent detail) is returned in the JSON body.

**Suggested fix:** return a generic message + a correlation id for `status >= 500`; keep the detail in the server log only.

**Answer:** No need for this;

>

---

### Q19 · No authorization model at all — `role` is decorative 🟠🔴

**Where:** `role` is signed into the JWT (`auth.js:8`) and echoed by `/api/auth/me`, but **no route ever checks it**.

**What I see:** every authenticated user can read, mutate, end, and archive **every** session in the database, including sessions created by other users. There is no ownership check anywhere.

**Question:** given Q0/Q8 — is "any logged-in user can do anything" intended (single trusted group), or do you want per-user ownership + an admin role?

**Answer:** As I said before, this just needs to be simple as it is not intended for public use, that's why it doesn't have a sign-up

>

---

### Q20 · No token revocation, and `/me` trusts a token for a deleted user 🟡

**Where:** `server/controllers/authController.js:21-24`

**What I see:** `me` returns claims straight from the JWT without touching the DB. A user deleted from `users` stays fully authenticated for up to 2 days. `logout` only clears the cookie client-side — the token remains valid if it was captured.

**Question:** acceptable for a home-game app, or do you want a short access token + refresh, or a server-side session/`token_version` column?

**Answer:** That's fine

>

---

### Q21 · Login is vulnerable to user enumeration by timing 🟡

**Where:** `server/services/userService.js:26` — returns immediately when the user doesn't exist, skipping bcrypt entirely.

**What I see:** "unknown email" responds in ~1ms, "known email, wrong password" in ~100ms. Trivially distinguishable.

**Suggested fix:** compare against a dummy hash when the user is missing.

**Answer:** Good idea

>

---

### Q22 · Rate-limit key uses `req.ip` directly — express-rate-limit v8 flags this 🟡

**Where:** `server/app.js:36`

**What I see:** you're on `express-rate-limit@8.6.0`, which validates custom `keyGenerator`s that embed a raw IP (`ERR_ERL_KEY_GEN_IPV6`) because IPv6 clients get a fresh /128 per request and can trivially bypass the limit. The library's `ipKeyGenerator()` helper exists for exactly this.

**Suggested fix:** `keyGenerator: (req) => \`${ipKeyGenerator(req.ip)}:${email}\``.

**Answer:** Good idea

>

---

### Q23 · `trust proxy: 1` is unconditional 🟡

**Where:** `server/app.js:15`

**What I see:** in local dev (no proxy in front), a client can spoof `X-Forwarded-For` and get a fresh rate-limit bucket per request. It's correct only when exactly one trusted proxy is in front.

**Question:** should this be env-driven (`TRUST_PROXY`), off by default in dev?

**Answer:** Don't care about this, just make it simple

>

---

### Q24 · No security headers, no body-size limits, no password policy 🟡

**What I see:** no `helmet` (no CSP, HSTS, `X-Content-Type-Options`, etc.); `express.json()` uses the default 100 kb with no explicit cap; no length caps on `name`/`createdBy` (a 90 kb player name is accepted); no password strength rules in `createUser`.

**Question:** add `helmet`, `express.json({ limit: '32kb' })`, and field-length validation (see Q31)?

**Answer:** Again, just be simple

>

---

### Q25 · `createUser.js` takes the password as a CLI argument 🟡

**Where:** `server/scripts/createUser.js:3, 10-13`

**What I see:** the password lands in shell history and `ps` output. The script also has no `.catch` — a duplicate email produces an unhandled rejection with a raw SQLite error, and `role` defaults to `'admin'` here but `'user'` in `userService.createUser`.

**Suggested fix:** prompt for the password (hidden), add `.catch` with a friendly message, align the default role, and validate the email format.

**Answer:** Good idea

>

---

# Section 3 — Data model & persistence

### Q26 · 🔴 Foreign keys are declared but **not enforced**

**Where:** `server/lib/db.js:36` declares `FOREIGN KEY(session_id) REFERENCES sessions(id)`, but SQLite defaults `PRAGMA foreign_keys = OFF` and you never turn it on.

**What I see:** the constraint is decorative. Orphan `players` rows referencing a non-existent session are accepted silently.

**Suggested fix:** `PRAGMA foreign_keys = ON;` on every connection (it's per-connection, not persisted), plus `ON DELETE CASCADE` where you want it.

**Answer:** Good idea

>

---

### Q27 · Buy-ins and credits are JSON blobs in TEXT columns 🟠

**Where:** `players.buy_ins_log`, `players.credits_log`

**What I see:** every append is a read-parse-push-stringify-write of the whole array. You cannot query, aggregate, sort, or index any movement; totals are recomputed in JS on every read (`sessionService.js:63-76`); the row grows unboundedly over a long night; and concurrent appends silently lose data (Q35).

**Suggested fix:** normalise into a `transactions` table (`id, session_id, player_id, type ∈ {buy_in, credit_out, credit_in, cash_out}, counterparty_player_id, amount_cents, created_at`) and derive balances with `SUM()`. This one change fixes Q4, Q6, Q7, Q27, Q35 and most of Section 4 at once.

**Question:** are you open to this refactor (with a migration for the existing single session), or do you want to keep the JSON logs?

**Answer:** No need for this

>

---

### Q28 · Money is stored as `INTEGER` but nothing enforces it 🔴

**Where:** `players.net_balance INTEGER`, `final_chip_count INTEGER`, `payout INTEGER`; controller validation only checks `typeof amount === 'number'`.

**What I see:** SQLite is dynamically typed, so `12.5` is happily stored in an `INTEGER` column as a REAL. The client's number inputs have `min="1"` but no `step`, so decimals get through. You then do float arithmetic on money (`payout = finalChipCount + netBalance`), which will eventually produce `299.99999999999994`.

**Suggested fix:** decide the unit and enforce it — either integer _cents_ everywhere (my recommendation) or `Number.isInteger()` validation on input + `step="1"` in the UI.

**Question:** do you ever need cents (R$2.50 blinds), or is everything whole units?

**Answer:** Use the cents approach

>

---

### Q29 · 🔴 Timestamps are stored as naïve UTC and parsed as **local time** by the browser

**Where:** `datetime('now')` in `sessionService.js:20` etc. produces `"2026-07-25 15:16:28"` (UTC, space-separated, no `Z`). The client does `new Date(s.createdAt)` (`SessionBrowser.tsx:44, 54, 152`).

**What I see (verified on this machine, TZ = UTC-3):**

```
new Date('2026-07-25 15:16:28').toISOString() === '2026-07-25T18:16:28.000Z'
```

V8 parses the space-separated form as **local** time. So every session timestamp you display is shifted by your UTC offset — a session created at 12:16 local shows as **15:16**. This also corrupts the week/month/year grouping near boundaries, and the client-side `sort` by `createdAt`.

Note the inconsistency: `buy_ins_log` timestamps _are_ proper ISO-with-`Z` (`new Date().toISOString()`), so two timestamp formats coexist in the same DB.

**Suggested fix:** store ISO-8601 UTC with `Z` (`strftime('%Y-%m-%dT%H:%M:%SZ','now')`) or Unix epoch integers, consistently, and add a migration for existing rows.

**Answer:** Good idea

>

---

### Q30 · Migrations are one hand-written `PRAGMA table_info` check 🟠

**Where:** `server/lib/db.js:64-67`

**What I see:** a single ad-hoc check for the `deleted_at` column — which is also already in `createSchema`, so it's dead code for fresh DBs. There is no migration table, no ordering, no down-migrations, no record of what's been applied.

**Question:** adopt a lightweight migration runner (`node-pg-migrate`-style, or a simple numbered `migrations/*.sql` + a `schema_migrations` table)? This becomes mandatory if you accept Q27/Q28/Q29.

**Answer:** Good idea

>

---

### Q31 · No input validation layer — hand-rolled `typeof` checks in controllers 🟠

**Where:** `server/controllers/sessionController.js:53-56, 71-75, 83-92, 100-104`

**What I see:** validation is duplicated `typeof` chains, and it's incomplete:

- `addPlayer` accepts `initialBuyIn: 0` or **negative** (only checks `typeof === 'number'`) and any-length `name`
- `cashOut` accepts a **negative** `finalChipCount` (client checks, server doesn't)
- `createSession` never validates `createdBy` (type or length)
- `registerCredit` doesn't reject `providerId === receiverId` (see Q37)
- `page`/`pageSize`/`q` are unvalidated (see Q32)

**Suggested fix:** one schema layer (`zod`) with a `validate(schema)` middleware; the README already _claims_ "input validation and sanitization".

**Answer:** Good idea

>

---

### Q32 · Pagination params are unvalidated — `?pageSize=abc` 500s and leaks a SQLite error 🔴

**Where:** `server/controllers/sessionController.js:10-17, 40-47`; `sessionService.js:26-47`

**What I see (verified against your DB):** `Number('abc')` → `NaN` → bound into `LIMIT ? OFFSET ?` → the driver raises `SQLITE_MISMATCH: datatype mismatch`. That becomes a 500 whose body contains the raw SQLite message (Q18). A trivially malformed query string produces a server error instead of a 400.

Separately, there is no upper bound on a _valid_ `pageSize`: `?pageSize=1000000` is accepted and returns the whole table.

**Suggested fix:** coerce + clamp (`page ≥ 1`, `1 ≤ pageSize ≤ 100`), reject `NaN` with a 400.

**Answer:** Good idea

>

---

### Q33 · Search `q` is injected raw into `LIKE` — wildcards not escaped 🟡

**Where:** `server/services/sessionService.js:29, 34, 43`

**What I see:** parameterised (so no SQL injection), but `%` and `_` from the user are treated as wildcards. Searching for `_` matches everything. Combined with Q32 this is a cheap way to force a full scan.

**Suggested fix:** escape `%`, `_`, `\` and add `ESCAPE '\'`.

**Answer:** Good idea

>

---

### Q34 · Missing/redundant indexes; `ORDER BY datetime(created_at)` defeats indexing 🟡

**Where:** `server/lib/db.js:38, 47`; `sessionService.js:35`

**What I see:**

- No index on `sessions(deleted_at, created_at)` — the list query filters and sorts on exactly those.
- `ORDER BY datetime(created_at)` wraps the column in a function, so no index could be used even if one existed.
- `idx_users_email` is **redundant** — `email TEXT NOT NULL UNIQUE` already creates `sqlite_autoindex_users_1` (confirmed in your DB).
- Every list request runs 2 queries (rows + `COUNT(1)`), both full scans.

**Suggested fix:** store sortable timestamps (Q29) so `ORDER BY created_at DESC` works, add the composite index, drop the redundant one.

**Answer:** Good idea

>

---

# Section 4 — Concurrency & transactional correctness

Context: this is a **shared, multi-device app used live at a table** — several people may be registering buy-ins from their phones at the same moment. That makes this section more than theoretical.

### Q35 · 🔴 Every write is a non-atomic read-modify-write → lost updates

**Where:** `registerBuyIn` (`sessionService.js:153-174`), `cashOut` (`:228-249`)

**What I see:** SELECT the row → mutate JSON + balance in JS → UPDATE. Two concurrent buy-ins for the same player interleave and **one silently disappears** (both read the same log, both write their own version, last writer wins). No transaction, no row lock, no optimistic-concurrency check.

**Suggested fix:** wrap in `BEGIN IMMEDIATE`/`COMMIT`, or (much better) normalise to append-only rows (Q27) so appends never conflict.

**Answer:** There will not be concurrency, this app will run from a single client

>

---

### Q36 · 🔴 `BEGIN`/`COMMIT` on a single shared connection is unsafe

**Where:** `server/services/sessionService.js:179-225` (the only transaction in the codebase); `lib/db.js:10` (one module-level `dbInstance`)

**What I see:** the whole app shares one sqlite connection. SQLite has no nested transactions, so if a credit is in flight when a second request issues `BEGIN`, the second call errors ("cannot start a transaction within a transaction") **or** its writes get swept into the first transaction — and a `ROLLBACK` from either aborts _both_. `assertSessionActive` also runs _outside_ the transaction (`:178`).

**Suggested fix:** a `withTransaction(fn)` helper that serialises transactions (mutex) or uses a small connection pool; also set `PRAGMA busy_timeout` (currently unset, so any lock contention fails instantly rather than waiting).

**Answer:** Again, no concurrency

>

---

### Q37 · 🔴 A credit from a player to themselves corrupts their row

**Where:** `sessionService.js:176-226`; only the _client_ blocks it (`CreditForm.tsx:47-49`)

**What I see:** with `providerId === receiverId`, both SELECTs read the same pre-update row, then two UPDATEs run against it. The second (`net_balance = receiver.netBalance - amount`) uses the **stale** balance and clobbers the first. Result: `net_balance` decreased by `amount`, plus a phantom entry in _both_ logs. Direct API call = corrupted data.

**Suggested fix:** reject `providerId === receiverId` server-side (and cover it once Q27 lands).

**Answer:** Good idea

>

---

### Q38 · 🔴 A player can be cashed out twice

**Where:** `sessionService.js:228-249`

**What I see:** `cashOut` never checks `is_active`. Calling it twice overwrites `final_chip_count` and `payout` with a _newly computed_ value from an unchanged `net_balance` — so the second call silently rewrites the result. The UI hides the button after cash-out, but the API doesn't care.

**Suggested fix:** reject when the player is already inactive (409).

**Answer:** Good idea

>

---

### Q39 · Archived sessions remain fully writable 🔴

**Where:** `assertSessionActive` (`sessionService.js:3-15`) checks only `is_active`; `getSession` (`:49-55`) doesn't filter `deleted_at` either.

**What I see:** you can add players, register buy-ins/credits and cash out on a **soft-deleted** session via the API, and `GET /api/sessions/:id` happily returns it.

**Question:** should archived == frozen (read-only)? I'd say yes.

**Answer:** Good idea

>

---

### Q40 · TOCTOU between `assertSessionActive` and the actual write 🟡

**Where:** all mutating service functions

**What I see:** the "is the session still open?" check and the write are separate statements with no transaction between them — a session ended in between still accepts the write.

**Suggested fix:** falls out of Q35/Q36 if writes become transactional.

**Answer:** No concurrency

>

---

### Q41 · No realtime/refresh strategy for a multi-device table 🟠🔵

**What I see:** each client fetches on mount and after its own mutations only. If three phones are open, two of them show stale data indefinitely. No polling, no SSE, no websockets, no `visibilitychange` refetch.

**Question:** is single-operator (one person does all the bookkeeping) the intended model? If not, what's the appetite — simple polling every N seconds, or SSE/websockets?

**Answer:** There will be no concurrency, this app will be operated from a single client

>

---

# Section 5 — Backend API design

### Q42 · README and code disagree about almost every endpoint 🔴

**Where:** `readme.md` "API Endpoints", `server/README.md`, vs `server/routes/sessionRoutes.js`

| Documented                           | Actual                                 |
| ------------------------------------ | -------------------------------------- |
| `PUT /api/sessions/:id/end`          | `POST /api/sessions/:id/end`           |
| `DELETE /api/sessions/:id` (archive) | `POST /api/sessions/:id/archive`       |
| `POST /api/sessions/:id/buyins`      | `POST /api/sessions/:id/buy-in`        |
| `POST /api/sessions/:id/credits`     | `POST /api/sessions/:id/credit`        |
| `POST /api/sessions/:id/cashout`     | `POST /api/sessions/:id/cash-out`      |
| —                                    | `GET /api/health` (undocumented)       |
| —                                    | `DELETE /api/dev/reset` (undocumented) |

Both READMEs are wrong, and they're wrong _differently_.

**Question:** fix the docs to match the code, or change the routes to match the docs (i.e. proper REST verbs)? See Q43.

**Answer:** Good idea

>

---

### Q43 · The API isn't RESTful and the naming is inconsistent 🟠

**What I see:** sub-resource creation is done with ad-hoc verb-ish POST paths (`/buy-in`, `/credit`, `/cash-out`, `/end`, `/archive`), kebab-case in routes but camelCase in payloads, and `archived` is a _path_ (`/sessions/archived`) rather than a filter (`/sessions?archived=true`) — which also means `GET /sessions/archived` shadows `GET /sessions/:sessionId` and only works because it's registered first (`sessionRoutes.js:9` before `:11`).

**Question:** do you want a pass to normalise this (`POST /sessions/:id/buy-ins`, `GET /sessions?status=archived`, `PATCH /sessions/:id`)? It's a breaking change for the client, which you own, so it's cheap now and expensive later.

**Answer:** Good idea

>

---

### Q44 · `GET /api/sessions/:id/players` is dead 🟡

**Where:** `sessionRoutes.js:15` + `listPlayers` in service/controller — duplicated logic identical to the player-mapping inside `getSession`.

**What I see:** the client never calls it (it uses `getSession`). So there's a whole duplicated code path with no consumer.

**Question:** delete it, or is it there for an upcoming feature?

**Answer:** Delete it

>

---

### Q45 · Two different error styles in the controllers 🟡

**What I see:** `authController` returns `res.status(400).json(...)` directly; `sessionController` throws `Error` objects with a `.status` property; the services throw the same way. Both end up shaped the same, but there's no error taxonomy (no codes the client can branch on — only English strings).

**Suggested fix:** one `AppError(code, status, message)` class and machine-readable `code` in the response so the client can localise messages (see Q71).

**Answer:** Good idea

>

---

### Q46 · `wrapAsync` is redundant on Express 5 🟡

**Where:** `server/middleware/errorHandler.js:15-19`, applied to all 13 routes

**What I see:** Express 5 forwards rejected promises from handlers to the error middleware natively. The wrapper is noise on every route.

**Question:** remove it? (Keep it if you'd rather not depend on that Express 5 behaviour — say so and I'll leave it.)

**Answer:** Good idea

>

---

### Q47 · Response envelope is inconsistent and pagination metadata is missing 🟡

**What I see:** `{success, data}` everywhere except `archiveSession`/`logout`, which return `{success: true}` with no `data`. The client type `PaginatedResponse` declares optional `page`/`pageSize`, but the server returns only `{items, total}` — so the client tracks the page number itself and can never detect a mismatch.

**Suggested fix:** always return `{items, total, page, pageSize}`.

**Answer:** Good idea

>

---

### Q48 · `getSession` doesn't return `createdBy` 🟡

**Where:** `sessionService.js:51-54` selects only `id, is_active, created_at`

**What I see:** the client's `Session` type has `createdBy`, and `SessionDetail extends Session`, so the detail page believes it has a creator but always gets `undefined`. Nothing displays it — probably why it went unnoticed.

**Question:** should the detail page show who created the session (and when)?

**Answer:** Yes

>

---

### Q49 · No structured logging, no request ids 🟡

**What I see:** the only logging is `console.error(err)` for 5xx and one `console.log` at boot. No access log, no request correlation, nothing to debug a "it broke last Friday" report.

**Question:** add `pino` + `pino-http` with request ids?

**Answer:** Not necessary

>

---

### Q50 · No graceful shutdown; `start()` has no `.catch` 🟡

**Where:** `server/index.js:14-20`

**What I see:** if `initDb()` rejects, you get an unhandled rejection and (Node ≥15) a hard crash with a confusing stack. No `SIGTERM`/`SIGINT` handler, no `db.close()`, no `server.close()` — so in-flight requests are killed and WAL isn't checkpointed on deploy.

**Suggested fix:** `start().catch(err => { console.error(err); process.exit(1); })` + signal handlers.

**Answer:** Good idea

>

---

### Q51 · `/api/health` doesn't check anything 🟡

**Where:** `server/app.js:47-49` — returns `{ok: true}` unconditionally, even if the database is unreachable.

**Question:** make it run `SELECT 1` and report DB status (and version/uptime)?

**Answer:** Good idea

>

---

# Section 6 — Frontend: correctness bugs

### Q52 · 🔴 A failed login shows the user **nothing**

**Where:** `client/src/hooks/useForm.ts:58-64` (`catch (error) { throw error }`), `client/src/pages/LoginPage.tsx:23-27`, `client/src/contexts/AuthContext.tsx:34-37`

**What I see:** wrong password → server 401 → `apiLogin` throws → `useForm.handleSubmit` rethrows → the rejected promise returned to `onSubmit={handleSubmit}` is **ignored by React**. Result: no toast, no field error, no message. The form just sits there, the spinner stops, and nothing tells the user their password was wrong. (It also produces an unhandled promise rejection in the console.)

**Suggested fix:** catch in `LoginPage.onSubmit` and surface a translated error; and make `useForm` return `submitError` instead of the pointless `try { } catch (e) { throw e }`.

**Answer:** Good idea

>

---

### Q53 · 🔴 Server error messages never reach the user — they see "Request failed with status code 400"

**Where:** `client/src/services/apiClient.ts` (no error interceptor), all `catch (error: any) { toast.error(error?.message || ...) }` sites (`useSession.ts:27,40,54,68,83,98`, `useSessions.ts:35,50,63`)

**What I see:** for a non-2xx response axios throws an `AxiosError` whose `.message` is `"Request failed with status code 400"`. The _actual_ server message lives at `error.response.data.error`. So when the backend says **"Cannot end session while there are active players. Cash out all players first."**, the user gets `Request failed with status code 400`. Every carefully-written server error message in this codebase is unreachable.

**Suggested fix:** a response-error interceptor in `apiClient` that rethrows a normalised error carrying `data.error` (and a `code`, see Q45).

**Answer:** Good idea

>

---

### Q54 · 🔴 A 401 mid-session leaves the user stuck

**Where:** `client/src/services/apiClient.ts`

**What I see:** no 401 interceptor. When the 2-day cookie expires while the app is open, every request fails with a red toast and the user stays on a page they can't use. `AuthContext.user` is still set, so `ProtectedRoute` won't redirect.

**Suggested fix:** on 401 (except `/auth/login`), clear auth state and redirect to `/login`.

**Answer:** Good idea

>

---

### Q55 · 🔴 Filtering to zero results traps the user

**Where:** `client/src/pages/SessionListPage.tsx:27-28, 82-164`

**What I see:** `isCentered = !hasSessions`. Search for a creator with no matches → `sessions` is empty → the layout flips to the "no sessions yet" centred create-form, **which doesn't render `SessionBrowser` at all** — so the filter input disappears along with the results. There is no way to clear the filter except reloading the page.

**Suggested fix:** distinguish "no sessions at all" from "no results for this filter"; keep the filter mounted and show an empty state with a "clear filter" action.

**Answer:** Good idea

>

---

### Q56 · 🔴 Two `ThemeToggle` instances can desync

**Where:** `client/src/components/ThemeToggle.tsx:13-30`; rendered twice on `ArchivedSessionsPage` (`:52` mobile, `:85` desktop) and once via `HeaderActions`

**What I see:** each instance owns its own `useState`, seeded from `localStorage` **at mount**. Both are always in the DOM (one is hidden by a CSS breakpoint, not unmounted). Clicking the mobile toggle updates only that instance's state; the desktop instance keeps the stale value. Resize past the `sm` breakpoint and the now-visible toggle shows the **wrong icon**, and clicking it sets the theme to the value it already has — so the first click does nothing visible.

**Suggested fix:** move theme into a context (or `PreferencesContext`, where it belongs alongside lang/currency) so all toggles share one source of truth.

**Answer:** Good idea

>

---

### Q57 · Archive failures show "Failed to end session" 🔴

**Where:** `client/src/components/SessionBrowser.tsx:168-170` — `toast.error(e?.message || t('failedEndSession'))` inside the **archive** handler. Same wrong key in `useSessions.archiveSession` (`useSessions.ts:63`).

**What I see:** wrong translation key; there is no `failedArchiveSession` key at all.

**Answer:** Fix it

>

---

### Q58 · The archived page shows a filter box that does nothing 🔴

**Where:** `client/src/pages/ArchivedSessionsPage.tsx:105-113` renders `SessionBrowser` **without `onFilter`**; `SessionBrowser.applyFilter` (`:72-75`) calls `onFilter?.(q)` — a no-op.

**What I see:** the user types a creator name, presses "Filtrar", and nothing happens, ever. Pagination on that page also drops the query (`refresh(p)` never passes `q`).

**Answer:** Fix it

>

---

### Q59 · Flash of the wrong empty state on first paint 🟡

**Where:** `SessionListPage.tsx:19-52` — `loading` starts `false`, and the fetch is kicked off in an effect.

**What I see:** first paint renders the centred _"you have no sessions — create one"_ layout, because `sessions` is `[]` and `loading` is `false`. The skeleton never appears in that branch (`SessionListSkeleton` only exists inside the non-centred layout, `:148-149`), so the sequence a returning user sees is: "no sessions" empty state → list pops in. Every single load.

**Suggested fix:** initialise `loading: true` in `useSessions`, and treat "not yet loaded" as distinct from "loaded and empty" (same fix as Q55).

**Answer:** Good idea

>

---

### Q60 · `AddPlayerForm`'s remembered buy-in doesn't actually apply 🟡

**Where:** `SessionDetailPage.tsx:42` reads `localStorage.getItem('lastInitialBuyIn')` **during render** and passes it as `defaultInitialBuyIn`; `AddPlayerForm.tsx:19-24` bakes it into `initialValues` at mount and writes the new value to `localStorage` on submit.

**What I see:** the component never remounts, and `reset()` restores the _original_ `initialValues` — so the "remember my last buy-in" feature only works after a full page reload. The value is also read during render (a side-effectful read) rather than in state.

**Answer:** Fix it

>

---

### Q61 · The synthetic-event hack in `AddPlayerForm` 🟡

**Where:** `client/src/components/forms/AddPlayerForm.tsx:64-71`

```tsx
{...getFieldProps('initialBuyIn')}
onChange={e => {
    getFieldProps('initialBuyIn').onChange({ ...e, target: { ...e.target, value: Number(value) || 0 } } as any);
}}
```

**What I see:** spreading a React synthetic event and faking `target` to smuggle a number through a string-typed handler, plus an `as any` and a second `getFieldProps()` call inside the handler. It works by accident.

**Suggested fix:** give `useForm` a typed `setValue(name, value)` path for non-string fields (it already exports `setValue` — just use it).

**Answer:** Fix it

>

---

### Q62 · `useForm` rethrows into the void on every form 🟡

**Where:** `useForm.ts:58-64`

**What I see:** `try { await onSubmit(values) } catch (error) { throw error } finally { setIsSubmitting(false) }` — the try/catch is a no-op, and the rethrow guarantees an unhandled rejection at every call site because `onSubmit={handleSubmit}` discards the promise. (Elsewhere the hooks toast _before_ rethrowing, so at least something is shown — but the rejection still escapes.)

**Suggested fix:** drop the pointless catch; return/expose the error instead of throwing.

**Answer:** Good idea

>

---

### Q63 · `Modal` clobbers `body.overflow` and has no focus management 🟡

**Where:** `client/src/components/Modal.tsx:15-29`

**What I see:**

- cleanup hardcodes `overflow = 'auto'` instead of restoring the previous value (normally `''`), permanently overriding whatever the page had
- `onClose` is a fresh arrow function on every render of `SessionDetailPage`, so the effect tears down and re-runs on **every** render of all three mounted modals — needless listener churn and repeated writes to `body.style`
- no `role="dialog"`, no `aria-modal`, no focus trap, no focus restore on close, no initial focus — a keyboard or screen-reader user can tab straight out of the modal into the page behind it

**Answer:** Fix it

>

---

### Q64 · Session rows are `<li onClick>` — keyboard-inaccessible 🟡

**Where:** `SessionBrowser.tsx:136-143`

**What I see:** the clickable row is a `motion.li` with an `onClick`, no `role="button"`, no `tabIndex`, no key handler. You cannot open a session with a keyboard. `OverflowMenu` has `role="menu"` but no `menuitem` children and no focus management either.

**Answer:** Fix it

>

---

### Q65 · `NumberTicker` animates from 0 on every mount 🟡

**Where:** `client/src/components/NumberTicker.tsx:17-34`

**What I see:** the motion value starts at `0` and animates up on mount, so switching the Active/Inactive tab replays a 0.6 s count-up on every card. `mv` is missing from both dependency arrays, and the initial `text` state is a hard-coded `'0'` (unformatted) rather than a formatted value.

**Question:** is the count-up-from-zero on mount intended, or should it only animate on _changes_?

**Answer:** Only animate on changes

>

---

### Q66 · Hover lift applies to disabled buttons 🟡

**Where:** `client/src/index.css:23` — `.btn:hover { transform: translateY(-1px) scale(1.03); ... }` with no `:not(:disabled)` guard (line 35 gets the cursor right, but not the transform).

**Answer:** Fix it

>

---

### Q67 · No error boundary anywhere 🟡

**What I see:** any render-time throw (including a failed lazy-chunk import after a deploy) blanks the entire app with no message. `Suspense` has a fallback but no error handling.

**Question:** add an `ErrorBoundary` with a "reload" affordance?

**Answer:** Fix it

>

---

# Section 7 — Frontend: architecture

### Q68 · `ArchivedSessionsPage` reimplements `useSessions` instead of using it 🟠

**Where:** `client/src/pages/ArchivedSessionsPage.tsx:14-39` vs `client/src/hooks/useSessions.ts` — the hook already accepts `{ archived: true }` and does exactly this, correctly typed.

**What I see:** duplicated fetch/loading/page/total state, typed `useState<any[]>`, its own `refresh()`, a missing effect dependency, plus a hand-rolled mobile overflow menu (`:51-80`) that duplicates `HeaderActions`/`OverflowMenu` — including a `menuRef` that is assigned but never used for anything (no click-outside).

**Suggested fix:** delete the duplication; use `useSessions({ archived: true })` + `HeaderActions`.

**Answer:** Good idea

>

---

### Q69 · Layering is violated: a component calls the service directly 🟠

**Where:** `SessionBrowser.tsx:6, 165` imports and calls `archiveSession` from the service layer, then calls `onPage?.(page)` to force a refetch — while `useSessions` exports an `archiveSession` that is **never used** (it's the unused-variable lint error at `SessionListPage.tsx:21`).

**What I see:** two ways to do the same thing, one of them dead. A presentational component owns a mutation and a cache-invalidation strategy.

**Question:** standardise on "hooks own mutations, components emit intent"? (i.e. `SessionBrowser` gets an `onArchive` prop)

**Answer:** Good idea

>

---

### Q70 · No data-fetching/caching layer — every mutation refetches the whole session 🟠

**Where:** `useSession.ts` — `addPlayer`, `registerBuyIn`, `registerCredit`, `cashOut` all `await loadSession()` afterwards.

**What I see:** hand-rolled `useState` + `useCallback` fetching with no cache, no dedupe, no stale-while-revalidate, no request cancellation (a fast tab switch can land an out-of-order response), and no optimistic updates — despite `readme.md` claiming _"Real-time data updates with optimistic UI"_. Each refetch pulls **every buy-in and credit log entry for every player**, which grows all night.

**Question:** adopt TanStack Query (my recommendation — it deletes `useSession`/`useSessions` almost entirely and gives you invalidation, dedupe and optional polling for Q41), or keep hand-rolled and just add optimistic updates?

**Answer:** Good idea

>

---

### Q71 · The client can't localise server errors 🟠

**What I see:** the server returns English prose; the client either shows the axios message (Q53) or a translated fallback. There's no way to show "Encerre o cash out de todos os jogadores primeiro" for a server-side rejection.

**Suggested fix:** server returns `{ code: 'SESSION_HAS_ACTIVE_PLAYERS' }`; the client maps codes → translation keys. Depends on Q45.

**Answer:** Good idea

>

---

### Q72 · Context values aren't stable — `PreferencesContext`'s `useMemo` is a no-op 🟡

**Where:** `PreferencesContext.tsx:260-273` — `t` is redefined on every render, and it's a dependency of the `useMemo`, so the memo never hits. `AuthContext.tsx:40` doesn't memoise its value at all, and `refresh`/`login`/`logout` are new functions every render.

**Why it matters:** every consumer re-renders whenever either provider renders, and it makes `useCallback` chains downstream unstable — `useSession.loadSession` depends on `t`, and `SessionDetailPage` runs `useEffect(loadSession, [loadSession])`. Today that doesn't loop (the provider rarely re-renders), but it's one state change away from a refetch storm.

**Suggested fix:** `useCallback` for `t`/`refresh`/`login`/`logout`, then memo the value objects.

**Answer:** good idea

>

---

### Q73 · Grouping happens client-side, on one page of results 🟠

**Where:** `SessionBrowser.tsx:39-62`

**What I see:** the server paginates (10 rows), then the client groups _those 10_ by week/month/year and re-sorts them. So a week's sessions get split across pages, group headers repeat on consecutive pages, and the caption "Sessions are ordered newest first within each group" is misleading. Changing "Group by" doesn't refetch anything.

**Question:** should grouping move server-side (group-aware pagination), or should the archive/list just load more rows?

**Answer:** Move server-side

>

---

### Q74 · `PaginationProps` / `FilterProps` types are declared but unused; `pageSize: 10` is hard-coded in 4 places 🟡

**Where:** `client/src/types/index.ts:62-73`; `SessionListPage.tsx:51,55,60,158`, `ArchivedSessionsPage.tsx:26,110`, `useSessions.ts:20,48,61`

**Answer:** Remove unused code and move hard-coded magic numbers to consts

>

---

### Q75 · Client types are hand-written and already drifted from the server 🟠

**What I see:** `Player` (client) has no `buyInsLog`/`creditsLog`/`updatedAt`, but the server sends them on every request; `Session.createdBy` is typed but never sent by `getSession` (Q48); `PaginatedResponse.page/pageSize` are typed but never sent (Q47). Nothing catches this — the server is plain JS with no schema.

**Question:** how do you want the contract enforced? Options: (a) shared `zod` schemas in a `shared/` workspace package, inferred on both sides; (b) OpenAPI + generated client; (c) migrate the server to TypeScript. I'd pick (a) for this size of project.

**Answer:** Let's go with b

>

---

### Q76 · Why is the server JavaScript while the client is TypeScript? 🔵

**What I see:** the server has no types at all, so none of the payload shapes, DB rows, or service contracts are checked. Root `package.json` even lists `typescript` as a project keyword.

**Question:** intentional (keep the server small and dependency-free), or would you like it migrated to TS?

**Answer:** Migrate it to TS

>

---

### Q77 · `cn()` wraps `clsx` without `tailwind-merge` 🟡

**Where:** `client/src/utils/cn.ts`

**What I see:** the point of a `cn` helper is usually conflict resolution. Without `tailwind-merge`, `<Button size="md" className="px-2">` emits both `px-3` and `px-2`, and which wins depends on CSS source order, not intent.

**Answer:** Fix it

>

---

### Q78 · `components/ui/index.ts` barrel exists but nothing imports from it 🟡

**Where:** every consumer does `import Button from '../ui/Button'` instead.

**Answer:** Implement the barrel

>

---

# Section 8 — i18n, formatting & UX

### Q79 · Currency switching changes the symbol but not the value 🔵

**Where:** `PreferencesContext.tsx:262-268`

**What I see:** a session recorded as `500` shows as `R$ 500,00`, `$500.00`, or `€500.00` depending on a dropdown — same number, different currency symbol. No FX rate, and the currency isn't stored with the session.

**Question:** intended (it's really a "display symbol" toggle for a group that plays in one currency)? If so I'd rename the label. If not, currency belongs on the _session_, set at creation.

**Answer:** It's intended

>

---

### Q80 · Translations live in a 280-line context file 🟠

**Where:** `client/src/contexts/PreferencesContext.tsx:7-231`

**What I see:** three dictionaries hand-maintained inline, plus a hand-maintained `TranslationKeys` interface in `types/index.ts` listing all 74 keys a second time. Adding a string means editing 4 places. No pluralisation, no interpolation, no lazy-loading of locales.

**Question:** extract to `locales/{pt,en,es}.json` with the type derived from the `pt` file (`type TranslationKey = keyof typeof pt`), or go all the way to `i18next`?

**Answer:** Good idea

>

---

### Q81 · Hard-coded English strings bypass i18n 🟡

**Where:**

- `HeaderActions.tsx:43` — `Logout`
- `SessionDetailPage.tsx:98` — `Session not found`
- `AddPlayerForm.tsx:36,38` — `Name is required`, `Initial buy-in must be greater than 0`
- `BuyInForm.tsx:39,42` — `Please select a player`, `Amount must be greater than 0`
- `CreditForm.tsx:42,45,48,51` — 4 messages
- `CashOutForm.tsx:30` — `Final chip count must be 0 or greater`
- `Modal.tsx:61` — `aria-label="Close modal"`; `LoadingSpinner.tsx:23-25`; `ThemeToggle.tsx:23`; `LangCurrencySwitcher.tsx:26,33`

**What I see:** a Portuguese-speaking user (the default locale) sees English validation errors on every form.

**Answer:** Fix it

>

---

### Q82 · The login label says "E-mail ou usuário" but only email works 🟡

**Where:** `LoginPage.tsx:67` + `emailOrUsername` keys vs `userService.verifyUser` (queries `users.email` only)

**Question:** was username login planned, or should the label just say "E-mail"?

**Answer:** Make it just say email

>

---

### Q83 · Dark is the default and applied only after mount → theme flash 🟡

**Where:** `index.css:4-16` (dark values on `:root`, light as an override) + `ThemeToggle.tsx:16-19` (applies `data-theme` in an effect)

**What I see:** a light-theme user gets a dark flash on every page load, before React hydrates. Also, `readme.md` claims "Light theme (default)" — the code defaults to dark.

**Suggested fix:** a tiny inline script in `index.html` that sets `data-theme` before first paint.

**Answer:** Good idea

>

---

### Q84 · Theme/lang/currency are three separate `localStorage` keys with no validation 🟡

**Where:** `PreferencesContext.tsx:245-250` casts `localStorage.getItem('lang') as Language` with no validation — a stale/garbage value makes `dictionaries[lang]` undefined and `t()` throws on every render (white screen). Same pattern for `currency`.

**Answer:** It's intended

>

---

### Q85 · `confirm()` / `alert()`-style native dialogs 🟡

**Where:** `useSession.ts:91` — `if (!confirm(t('confirmEndSession')))`

**What I see:** a native browser confirm in an app that has a nice `Modal` component. Also untranslatable button labels, and blocked in some embedded contexts.

**Answer:** Fix it

>

---

### Q86 · No loading/disabled state on destructive actions 🟡

**What I see:** the "End session" button in the overflow menu and the archive item in the kebab don't disable while their request is in flight — double-clicks fire duplicate requests.

**Answer:** Fix it

>

---

### Q87 · `title` attribute used as the only explanation for a disabled-ish action 🟡

**Where:** `SessionDetailPage.tsx:129` — `title={hasActivePlayers ? t('cashOutAllFirst') : ''}`

**What I see:** the button isn't actually disabled (it toasts on click, `:52-58`), and `title` doesn't exist on touch devices — where this app is presumably mostly used.

**Answer:** Add a tooltip as well

>

---

### Q88 · Is the app meant to be mobile-first? 🔵

**What I see:** the layout is responsive and the interaction model (overflow menus, bottom-sheet-style modals) suggests phones, but there's no PWA manifest, no service worker, no offline handling, no `apple-touch-icon`, and the favicon is still `vite.svg`. A poker table often has bad wifi.

**Question:** should this be installable/offline-capable?

**Answer:** Yes, but don't worry about this for now

>

---

# Section 9 — Performance

### Q89 · Every mutation triggers a full session refetch including all logs 🟠

Covered in Q70 — flagging separately because it's the main runtime cost: after each buy-in, the client re-downloads every player's complete buy-in and credit history and re-runs the reduce on the server.

**Answer:** Fix it

>

---

### Q90 · Totals are computed in JS on every request 🟡

**Where:** `sessionService.js:63-76, 137-150`

**What I see:** parse JSON → reduce → per player → per request. Fine at 5 players; it's O(n·m) with no caching, and it's only necessary because of the JSON-blob model (Q27). With a `transactions` table this becomes a single `SUM() GROUP BY`.

**Answer:** The table will never be big enough for this to matter

>

---

### Q91 · List endpoints run two full scans per request 🟡

Covered by Q34 (`COUNT(1)` + rows, both unindexed, plus `datetime()` in `ORDER BY`).

**Answer:** Fix it

>

---

### Q92 · `react-window` is a dependency but is never imported 🟡

**Where:** `client/package.json:12` — no usage anywhere in `src/` (verified).

**Question:** was virtualisation planned for the session list? Remove it, or actually use it?

**Answer:** If it's actually not used remove it

>

---

### Q93 · Framer Motion animates every list item on every render 🟡

**Where:** `SessionBrowser.tsx:119-180` — `AnimatePresence` + per-group `motion.div` + per-row `motion.li` with mount animations. Combined with the client-side re-sort/re-group (Q73), every page change re-animates everything.

**Question:** is the animation load intentional? On a mid-range phone this is the most expensive thing the app does.

**Answer:** Yes

>

---

### Q94 · `PlayerCard`'s `memo` is defeated by context 🟡

**Where:** `PlayerCard.tsx:14` — `memo(...)` but it calls `usePreferences()`, so it re-renders whenever the preferences context value changes (which is every provider render, Q72). Same for `LangCurrencySwitcher` and `ThemeToggle`.

**Answer:** Fix it

>

---

### Q95 · No `visibilitychange`/focus refetch, and no polling 🟡

See Q41 — relevant to perf too, since the alternative (aggressive polling) would be costly with the current payload size.

**Answer:** Fix it

>

---

### Q96 · No bundle budget or analysis 🟡

**What I see:** pages are lazy-loaded (good), but `framer-motion` (large) is imported by shared components so it lands in the main chunk; `lucide-react` is fine tree-shaken but worth verifying; no `rollup-plugin-visualizer`, no size check in CI (there is no CI).

**Answer:** Don't worry about this

>

---

# Section 10 — Tooling, build & DX

### Q97 · 🔴 `npm run lint` is broken on the client — 122 errors

**Where:** `client/eslint.config.js:53-56` sets `import/resolver: { typescript: true }`, but **`eslint-import-resolver-typescript` is not installed** (verified — only `eslint-import-resolver-node` is present).

**What I see:** every file reports three phantom errors:

```
Resolve error: typescript with invalid interface loaded as resolver   import/no-cycle
```

That's ~110 of the 122 errors. It means linting is effectively abandoned, which is how the _real_ errors below survived.

**Suggested fix:** install the resolver (or drop `typescript: true`).

**Answer:** Fix it

>

---

### Q98 · Real lint errors currently hidden behind the resolver noise 🟡

Once Q97 is fixed, these remain:

| File                                                                | Issue                                                                                                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx:1`                                                         | `useState` imported, never used                                                                                                                                               |
| `SessionListPage.tsx:21`                                            | `archiveSession` assigned, never used (see Q69)                                                                                                                               |
| `SessionListPage.tsx:30`                                            | `values` assigned, never used                                                                                                                                                 |
| `AddPlayerForm.tsx:15`                                              | `values` assigned, never used                                                                                                                                                 |
| `KebabMenu.tsx:13`, `OverflowMenu.tsx:6,9`, `SessionBrowser.tsx:72` | `'React' is not defined` (`no-undef`) — the `React.MouseEvent` / `React.ReactNode` type namespace is used without importing React, and `no-undef` isn't disabled for TS files |
| `LoginPage.tsx:54`                                                  | prettier formatting                                                                                                                                                           |
| `ArchivedSessionsPage.tsx:39`                                       | `react-hooks/exhaustive-deps`                                                                                                                                                 |
| `NumberTicker.tsx:29,34`                                            | `react-hooks/exhaustive-deps` (`mv`)                                                                                                                                          |
| 24 ×                                                                | `@typescript-eslint/no-explicit-any` warnings                                                                                                                                 |

Note `no-undef` should be **off** for TypeScript files (`tsc` covers it) — that's a config bug, not a code bug.

**Answer:** Fix it

>

---

### Q99 · `npm run format:check` fails on 8 files 🟡

**Files:** `client/index.html`, `client/package.json`, `client/src/index.css`, `client/src/pages/LoginPage.tsx`, `client/tsconfig.json`, `package.json`, `readme.md`, `server/README.md`

**What I see:** Prettier is configured (4-space, 100 cols) but was never run over the whole repo, so `format:check` is red from day one. Also, `.prettierignore` excludes `*.config.js`, which is why `client/eslint.config.js` is 2-space while everything else is 4-space.

**Answer:** Fix it

>

---

### Q100 · Three npm lockfiles **and** a yarn.lock 🔴

**What I see:** root `package.json` declares npm **workspaces** (`client`, `server`), yet all three `package-lock.json` files (root, `client/`, `server/`) are **tracked in git**, plus an untracked `yarn.lock` sitting in your working tree right now. `install:all` runs three separate `npm install`s, defeating workspace hoisting entirely — which is also why `node_modules` exists at the root _and_ in each package.

**Why it matters:** builds are not reproducible; two developers can get different dependency trees; the workspace declaration is a lie.

**Question:** pick one package manager and one lockfile. Which — npm workspaces (delete the per-package locks and `yarn.lock`, use plain `npm install` at the root), or yarn/pnpm?

**Answer:** Use yarn

>

---

### Q101 · Tailwind v4 with a v3-style `tailwind.config.js` that is ignored 🟡

**Where:** `client/tailwind.config.js` + `client/src/index.css:1-2`

**What I see:** you're on Tailwind v4 (`@tailwindcss/postcss`, `@import "tailwindcss"`, `@custom-variant`), which is CSS-first. `tailwind.config.js` is **not** loaded unless referenced with `@config` — and it isn't. So the `content` globs and `theme.extend` are dead. Your design tokens live as raw CSS variables in `:root` instead of `@theme`, which is why you write `text-[var(--text-dim)]` everywhere instead of `text-dim`.

**Question:** delete `tailwind.config.js` and move the tokens into `@theme` (so you get real utility classes), or add `@config` to keep the v3 style?

**Answer:** Good idea

>

---

### Q102 · `vite.config.js` is JS in a TS project and isn't type-checked 🟡

**Where:** `client/vite.config.js`; `client/tsconfig.json:16` includes only `src`

**What I see:** no `tsconfig.node.json`, no `vite-env.d.ts`, config excluded from `tsc`. Also `tsconfig.json` lacks `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, and `verbatimModuleSyntax`/`isolatedModules` — the usual Vite+TS defaults.

**Answer:** Fix it

>

---

### Q103 · The dev proxy is the only thing making `/api` work 🟠

**Where:** `client/vite.config.js:7-14` proxies `/api → localhost:4000`; `apiClient` uses `baseURL: '/api'` with no env override.

**What I see:** in production this only works if something else (nginx, Caddy, or the Express app itself) serves the SPA and proxies `/api` on the same origin. The server does **not** serve `client/dist` and there's no SPA fallback, so `readme.md`'s deploy section ("serve them with your preferred static file server") is the entire deployment story.

**Question:** should the Express app serve the built client in production (simplest: one process, one origin, cookies just work), or are you deploying behind a proxy? Also: do you want `VITE_API_BASE_URL` for a split-origin deployment?

**Answer:** Not sure, go with the simplest approach, this will not be deployed to prod for now

>

---

### Q104 · No tests, no test runner, no CI 🔴

**What I see:** zero test files, no `vitest`/`jest`/`supertest` in either `package.json`, no `test` script, no `.github/workflows`. `readme.md` says _"Add tests for new features"_ under Contributing.

**Why it matters:** the money maths (`payout`, `net_balance`, credits) is the core of this app and is entirely unverified. Every bug in Sections 4 and 6 would have been caught by a handful of tests.

**Question:** want me to add a test layer? My suggested minimum: Vitest + Supertest against an in-memory SQLite for the session/credit/cash-out flows, and Vitest + Testing Library for `useForm` and the money formatting. Plus a GitHub Actions workflow running `lint`, `type-check`, `format:check`, `test`.

**Answer:** Not right now

>

---

### Q105 · No pre-commit hooks 🟡

**Question:** add husky + lint-staged (or a simple `.git/hooks/pre-commit`) so `format:check`/`lint` can't rot again?

**Answer:** Good idea, use git for this

>

---

### Q106 · No `.env.example`, and the README's env vars don't match reality 🟡

**What I see:** `readme.md` says to create `server/.env` with `PORT`, `JWT_SECRET`, `NODE_ENV`. The actual `server/.env` has only `JWT_SECRET`. New contributors have to read the source to find out what's required. (Good news: `.env` is correctly gitignored and not tracked — I verified.)

**Answer:** Create the .env.example

>

---

### Q107 · No Dockerfile / process manager / deployment config 🔵

**Question:** how is this actually deployed (or is it not yet)? A Dockerfile + compose (with a volume for `server/data`) would make Q103 and Q108 concrete.

**Answer:** It is not deployed yet, it's local only for now

>

---

### Q108 · SQLite has no backup story 🟠

**What I see:** the DB lives at `server/data/poker.sqlite` with `-wal`/`-shm` alongside. `readme.md` says "ensure this directory is writable and backed up regularly" — but nothing does that. Combined with Q12, a night's data has exactly one copy.

**Question:** want a scheduled `VACUUM INTO` backup (SQLite's safe online backup), or is this handled at the host level?

**Answer:** Don't worry about this

>

---

# Section 11 — Repo hygiene & docs

### Q109 · `readme.md` documents features that don't exist 🟡

**Claims vs reality:**

- _"Real-time data updates with optimistic UI"_ → neither; every mutation is a full refetch (Q70)
- _"Input validation and sanitization"_ → partial `typeof` checks, no sanitisation (Q31)
- _"SQLite database with automatic schema migration"_ → one hand-rolled column check (Q30)
- _"Light theme (default)"_ → dark is the default (Q83)
- _"Comprehensive search and filtering"_ → creator-name substring only, broken on the archive page (Q58)
- _"MIT License — see the LICENSE file"_ → there is no LICENSE file
- Endpoint table is wrong (Q42); DB schema section omits `created_at`/`updated_at` on players
- `repository.url` is `https://github.com/yourusername/friday-night-poker.git`
- Support section points to a non-existent issues page and "community discussions"

**Question:** rewrite the README to describe what exists (with a "Roadmap" section for the rest)?

**Answer:** Good idea

>

---

### Q110 · `client/README.md` is still the stock Vite template 🟡

**Answer:** Add a nice readme

>

---

### Q111 · `server/README.md` duplicates and contradicts the root README 🟡

**What I see:** its endpoint list is also wrong (`/buyins`, `/credits`, `/cashout`), and it omits auth entirely.

**Answer:** Fix it

>

---

### Q112 · Uncommitted work in progress 🔵

**Where:** `server/lib/db.js` — the working tree changes `path.join(process.cwd(), 'data')` → a path resolved from the module's own location.

**What I see:** this is a **good fix** (it makes `npm start` work regardless of cwd, and stops a stray `data/` directory appearing wherever you launch from). It's just not committed. `yarn.lock` is also untracked (see Q100).

**Question:** commit it? Any reason it was left uncommitted?

**Answer:** This fix was implemented earlier today and I forgot to commit it, feel free to do so

>

---

### Q113 · Commit history quality 🔵

**What I see:** `421b2ef docs: :memo: Add a proper readme`, `42266e6 refactor: :recycle: Add login page translationswq:wq` (a stray `wq:wq` — vim keystrokes in the message), `36d7d7c Add eslint`, `660b1cd YEHI 'OR`. Four commits total, mixed conventions (gitmoji+conventional vs freeform), and the whole app arrived in one commit.

**Question:** do you want a convention enforced (commitlint + conventional commits)? Also: single `main` branch, no PR flow — intentional for a solo project?

**Answer:** It's intentional

>

---

### Q114 · No `LICENSE`, no `CONTRIBUTING`, no `CHANGELOG`, no issue templates 🟡

**What I see:** `package.json` says MIT in two places, README links to a `LICENSE` file that doesn't exist.

**Answer:** Don't worry about this

>

---

### Q115 · `.gitignore` files are inconsistent 🟡

**What I see:** three `.gitignore` files; `server/.gitignore` is the full 100-line Node template with `*.sqlite` and `/data` listed twice, plus `dist`/`build` entries that are meaningless for this package; the root `.gitignore` already covers `.env`/`*.sqlite*`/`node_modules`. The root file also has no trailing newline.

**Answer:** Fix it

>

---

### Q116 · Is there a reason `server/data/` is committed as a directory but the DB isn't? 🔵

**What I see:** the DB, `-wal`, and `-shm` files exist locally and are correctly ignored, but there's no `.gitkeep` — `initDb` creates the directory, so that's fine. Just confirming nothing is meant to be versioned there.

**Answer:** I don't want it commited

>

---

# Section 12 — Things I'd like to propose (need your go/no-go)

### Q117 · Proposal: normalise the money model 🟠

Replace the JSON logs with a `transactions` ledger (Q27), store integer cents (Q28), store ISO-UTC timestamps (Q29), enable foreign keys (Q26), and derive all balances with SQL aggregates. This is the single highest-leverage change in the codebase — it resolves Q4, Q6, Q7, Q27, Q28, Q29, Q35, Q37, Q38, Q90, and unlocks Q5 (settlement) and Q9 (player stats).

**Cost:** ~1 day, plus a migration for your existing 1 session / 5 players.

**Answer:** Don't worry about this

>

---

### Q118 · Proposal: an integration test suite for the money paths 🟠

Before any refactor, pin the current behaviour: create session → add players → buy-ins → credits → cash-outs → end session, asserting balances at each step. Then refactor against a green suite. Related to Q104.

**Answer:** Not right now

>

---

### Q119 · Proposal: a `shared/` workspace for the API contract 🟠

Zod schemas defining every request/response, imported by the server for validation (Q31) and by the client for types (Q75). Kills the type drift and the duplicated validation permanently.

**Answer:** Good idea

>

---

### Q120 · Priority call: what should I fix first? 🔵

My recommended order, if you want one:

1. **Q12** (unauthenticated DB wipe) — minutes, critical
2. **Q13** (case-sensitive login lockout), **Q52** (silent login failure), **Q53** (server errors invisible) — the three that break basic usage
3. **Q97/Q98/Q99** (make lint + format green so regressions get caught)
4. **Q29** (timestamps are wrong on screen), **Q55**/**Q56**/**Q57**/**Q58** (visible UI bugs)
5. **Q118** (tests) → **Q117** (ledger refactor) → **Q35–Q39** (concurrency/validation) fall out of it
6. Everything else

**Question:** does this order match your priorities, or is there something you need working by this Friday?

**Answer:** Feel free to choose the order according to my previous answers

>

---

## Summary of confirmed defects (my assessment, for quick triage)

| #           | Severity    | Issue                                                                         |
| ----------- | ----------- | ----------------------------------------------------------------------------- |
| Q12         | 🔴 Critical | Unauthenticated `DELETE /api/dev/reset` wipes the DB from any origin          |
| Q13         | 🔴 High     | Email case mismatch permanently locks users out                               |
| Q52         | 🔴 High     | Failed login gives the user no feedback at all                                |
| Q53         | 🔴 High     | All server error messages are replaced by "Request failed with status code N" |
| Q29         | 🔴 High     | Displayed timestamps are shifted by the UTC offset                            |
| Q35–Q38     | 🔴 High     | Lost updates, unsafe transactions, self-credit corruption, double cash-out    |
| Q26         | 🔴 High     | Foreign keys declared but not enforced                                        |
| Q54         | 🔴 Med      | Expired session leaves the user stuck with no redirect                        |
| Q55         | 🔴 Med      | Zero-result filter hides the filter input — unrecoverable without reload      |
| Q56         | 🔴 Med      | Duplicate `ThemeToggle` instances desync                                      |
| Q57/Q58     | 🔴 Med      | Wrong toast key on archive; archived-page filter does nothing                 |
| Q18/Q32/Q39 | 🔴 Med      | Error leakage, malformed pagination → 500, archived sessions still writable   |
| Q97         | 🔴 Med      | Client lint has been broken since it was added                                |
| Q100/Q104   | 🔴 Med      | Four lockfiles / zero tests                                                   |

---

_End of questions. Fill in the `Answer:` blocks and prompt me — I'll work through them in the order you set in Q120._
