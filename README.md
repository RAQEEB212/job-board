# Job Board

A learning project: one admin publishes advertisement images and application links; visitors view them and apply externally.

## Structure

- `public-web`: public React app (port 5173)
- `admin-web`: separate React admin app (port 5184)
- `server`: shared Express API (port 4000)

## Requirements

Node.js 22.12+ and npm. This setup was checked with Node.js 22.18.0.

## Run locally

Open three terminals from this repository and run one block in each:

```sh
cd public-web
npm ci
npm run dev
```

```sh
cd admin-web
npm ci
npm run dev
```

```sh
cd server
npm ci
cp .env.example .env
npm run setup:admin
# Fill DATABASE_URL and Cloudinary values in .env
npm run db:migrate
npm run db:import
npm run dev
```

Public: http://127.0.0.1:5173
Admin: http://127.0.0.1:5184
API health: http://127.0.0.1:4000/api/health

The admin app supports login, Cloudinary image upload, apply links, and deletion.

## Learning steps

1. Basic setup: separate applications and an API health route.
2. Public layout with sample advertisements.
3. PostgreSQL schema and jobs API.
4. Admin login, advertisement upload, and job management.
5. Deployment: PostgreSQL on Neon; advertisement images on Cloudinary.

Advertisements are stored in Neon PostgreSQL. Cloudinary integration requires credentials in server/.env.
Never commit `.env`, credentials, or `node_modules`.

## Public page and Cloudinary

The public app fetches `/api/jobs` through the Vite development proxy. It supports loading, retry, empty states, responsive cards, and opening the full image. The initial advertisement and Apply URL are explicitly demo content.

Jobs are read from and saved to PostgreSQL; `server/data/jobs.json` is the preserved legacy import source. The admin app is available separately on port 5184.

Put Cloudinary values in `server/.env` (see `.env.example`), then from `server/`:

```sh
npm run cloudinary:check
npm run upload:sample -- /absolute/path/to/advertisement.png
```

The upload command uploads to Cloudinary and adds a sample record in PostgreSQL with the returned URL and asset ID. Change its demo apply link before publishing real content. Credentials stay server-side. No unauthenticated upload endpoint is exposed.

For deployed frontends, configure the host to proxy `/api` to the backend; the development proxy only works locally.

## Admin access

Run `npm run setup:admin` from `server/` after creating `.env` to generate the initial account. Existing credentials are preserved on repeat runs. Local login details are in `server/.admin-login.txt` (ignored by Git). The backend stores a salted password hash in `.env`, uses an HttpOnly session cookie, limits failed login attempts, and checks allowed origins for admin mutations. Uploads require login, accept JPG/PNG/WebP up to 5 MB and 20 megapixels, and are validated and converted to WebP server-side before Cloudinary upload.

The admin lists all advertisements and requires confirmation before deletion. Refresh the public page after publishing to see the latest ads.

Advertisements persist in Neon PostgreSQL; sessions are held in server memory (restart requires login). Before hosting, use a persistent session store, HTTPS, and set ADMIN_ORIGIN to the deployed admin URL. Keep the local credentials file private.

## Neon PostgreSQL

Project: `job-board`, AWS Singapore, database `neondb`, branch `production`.
Only the backend reads DATABASE_URL from its ignored `.env`. Neon connections require verified TLS. Image files stay on Cloudinary.

From `server/`:

```sh
npm run db:migrate      # Apply versioned schema changes; safe to repeat
npm run db:import       # Import legacy JSON without duplicating IDs
npm run db:check        # Check connection and advertisement count
npm run test:database   # Verify insert, independent reconnection, read and delete
```

The API starts only after it can connect to PostgreSQL; there is no JSON fallback. Uploads and deletions use parameterized SQL. The migration/import keeps the original JSON file unchanged. The database test cleans up only its generated verification row.
