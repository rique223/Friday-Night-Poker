# client

The React SPA. See the [root readme](../readme.md) for the domain rules and how to run
everything together — this file covers only what is specific to the client package.

## Layout

```
src/
  main.tsx             providers: QueryClient, Router, Preferences, Auth
  App.tsx              routes, ErrorBoundary, Suspense
  constants.ts         page size, cache timings, localStorage keys
  i18n/
    locales/*.json     pt (source of truth), en, es
    index.ts           dictionaries, key type derived from pt.json, error-code mapping
  contexts/            AuthContext, PreferencesContext (language, currency, theme)
  hooks/               useForm, useSession, useSessions, useToastMutation, useApiError
  services/            axios client + typed transport, shapes from @fnp/shared
  components/
    ui/                Button, Input, Select, LoadingSpinner — import from `../ui`
    forms/             one component per form
  pages/               one component per route
```

## Conventions

- **Types come from `@fnp/shared`.** Do not hand-write a request or response shape; if
  the API changes, the compile error should land here.
- **Money is integer cents** in state and over the wire. Convert only at the edges:
  `toCents()` when reading an input, `formatCurrency()` when rendering. Nothing formats a
  raw number.
- **Server errors are translated by code.** `useApiError().toastError(error, fallbackKey)`
  maps the server's `code` to a locale string; never render `error.message` directly.
- **Data fetching goes through TanStack Query.** Mutations invalidate `sessionKeys.all`
  rather than refetching inline, so overlapping writes collapse into one refetch.
- **Styling uses theme utilities** (`text-dim`, `bg-surface`, `border-border`) backed by
  the `@theme` block in `index.css`. Both themes resolve the same custom properties, so a
  utility works in either without a `dark:` variant.

## Adding a translation key

Add it to `src/i18n/locales/pt.json` first — the `TranslationKey` type is derived from
that file, so `en.json` and `es.json` will fail to compile until they have it too. Server
error codes follow the `error_<CODE>` convention and are picked up automatically.

## Theme

The theme is applied by a small inline script in `index.html` before first paint, so there
is no flash. `PreferencesContext` is the single source of truth afterwards — never read
`localStorage.theme` from a component.
