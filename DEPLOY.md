# Deploying to Vercel

The app is a stock Next.js 14 project, so Vercel needs no special configuration.
Two things do need doing first, and the second is not optional.

## 1. Log in and link

```bash
npx vercel login          # interactive, opens a browser
npx vercel link           # pick the account, accept the detected settings
```

## 2. Move ad images off local disk

**This is required.** Images are written through `lib/storage.ts`, which falls
back to local disk when Supabase Storage is not configured. Vercel's filesystem
is ephemeral and not shared between invocations, so on a deploy every generated
ad would 404 the moment it was requested. The app logs an error when it notices
itself doing this in production, but it cannot fix it.

In the Supabase dashboard:

1. **Storage → New bucket**, name it `ad-images`. Private is fine; images are
   served through `/api/ads/[id]`, which reads them with the service key.
2. **Project Settings → API**, copy the **service_role** key.

## 3. Set the environment variables

```bash
for KEY in SUPABASE_DB_URL ANTHROPIC_API_KEY OPENAI_API_KEY \
           SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY \
           FIRECRAWL_KEY LOGO_DEV_TOKEN \
           APP_USER APP_PASSWORD \
           MAX_ADS_PER_REQUEST DAILY_AD_LIMIT; do
  npx vercel env add "$KEY" production
done
```

| Variable | Notes |
| --- | --- |
| `SUPABASE_DB_URL` | The pooler connection string |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Settings → API. Server-side only; never expose it |
| `ANTHROPIC_API_KEY` | Research and copy |
| `OPENAI_API_KEY` | Image generation |
| `APP_USER` / `APP_PASSWORD` | **Required.** Without them the app returns 503 rather than run unauthenticated |
| `MAX_ADS_PER_REQUEST` | Suggested `2` while demoing |
| `DAILY_AD_LIMIT` | Suggested `12` while demoing |
| `FIRECRAWL_KEY`, `LOGO_DEV_TOKEN` | Optional but both improve output noticeably |

## 4. Ship

```bash
npm run deploy            # vercel deploy --prod
```

Then, once:

```bash
curl -u "$APP_USER:$APP_PASSWORD" -X POST https://<your-deployment>/api/seed
```

which creates the tables and loads `data/clients.json`.

## What a visitor sees

- `/` — the studio, behind Basic auth
- `/lp/<id>` — a generated landing page, **public by design** so it can be sent
  to a prospect

## Notes

- `maxDuration` is 300s on `/api/generate`. Vercel's Hobby plan caps functions
  at 60s, which is not enough for a `gpt-image-2` render; Pro is needed, or the
  fan-out has to move to a background job.
- The database schema is applied at runtime on the first query, so there is no
  migration step in the deploy.
