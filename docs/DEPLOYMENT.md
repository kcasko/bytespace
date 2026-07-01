# ByteSpace Deployment Guide

ByteSpace is split into a Vite static frontend and an Express API backed by PostgreSQL. This guide is deployment prep only; it does not add cloud storage or a formal migration tool yet.

## Required Environment

Server variables:

```env
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://your-frontend.example
DATABASE_URL=postgres://user:password@host:5432/bytespace
SESSION_SECRET=replace-with-a-long-random-production-secret
UPLOADS_DIR=uploads
TRUST_PROXY=true
SESSION_COOKIE_SAMESITE=lax
```

Client variables:

```env
VITE_API_BASE_URL=https://your-api.example
```

Use `SESSION_COOKIE_SAMESITE=none` only when the frontend and API are on different sites and the app is served over HTTPS with secure cookies.

## Local Development

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Docker PostgreSQL:

```bash
docker run --name bytespace-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bytespace -p 55432:5432 -d postgres:16
psql -h localhost -p 55432 -U postgres -d bytespace -f database/schema.sql
psql -h localhost -p 55432 -U postgres -d bytespace -f database/seed.sql
```

## Production Checklist

- Set `NODE_ENV=production`.
- Set a strong `SESSION_SECRET`.
- Set `DATABASE_URL` to the production PostgreSQL database.
- Set `CLIENT_ORIGIN` to the exact frontend origin. Do not use `*` with credentialed cookies.
- Set `VITE_API_BASE_URL` to the API origin for the frontend build.
- Run `npm run build` in `client/`.
- Start the API with `npm start` in `server/` or `npm run start:server` from the repo root.
- Serve the built frontend with a static host.
- Put the API behind HTTPS.
- Set `TRUST_PROXY=true` when running behind a reverse proxy or managed platform.
- Back up PostgreSQL.
- Back up `UPLOADS_DIR`.
- Do not use the seeded Keith password in production.
- Do not expose `.env` files.

## Option A: Render/Railway Style

Use a PostgreSQL add-on, one backend web service, and one frontend static site.

Backend:

- Build/install from `server/`.
- Start command: `npm start`.
- Set server environment variables.
- Ensure `CLIENT_ORIGIN` equals the static site URL.
- Ensure uploads are persisted if the platform supports disks. If not, local uploads may be lost on redeploy.

Frontend:

- Build from `client/`.
- Build command: `npm run build`.
- Publish directory: `dist`.
- Set `VITE_API_BASE_URL` to the backend URL before building.

## Option B: Single VPS / Homelab

Run PostgreSQL and the Node server on the host or local network, then put a reverse proxy in front.

- Install Node.js 20+ and PostgreSQL.
- Run `database/schema.sql`.
- Use `database/seed.sql` only for development/demo data.
- Build the client with `npm run build`.
- Serve `client/dist` with Nginx/Caddy/Apache.
- Run the server with `npm start`, systemd, or a process manager.
- Configure HTTPS.
- Proxy `/api` and `/uploads` to the Express server if using one public domain.
- Back up PostgreSQL and `server/uploads`.

## Sessions, Cookies, And CORS

ByteSpace uses `connect-pg-simple`; sessions live in PostgreSQL, not process memory.

The API enables credentialed CORS for `CLIENT_ORIGIN`. Do not use wildcard origins with cookies.

Development cookies use:

- `httpOnly: true`
- `sameSite: lax`
- `secure: false`

Production cookies use:

- `httpOnly: true`
- `secure: true`
- `sameSite` from `SESSION_COOKIE_SAMESITE`, default `lax`

Different-domain frontend/API deployments may require `SESSION_COOKIE_SAMESITE=none` and HTTPS.

## Uploads

Uploaded avatars and backgrounds are served from `/uploads`.

`UPLOADS_DIR=uploads` stores files under `server/uploads` by default. This is fine for a single-server demo. For real production, add object storage later or ensure the uploads directory is on persistent disk and backed up.

## Database Migrations

This project does not yet have a formal migration tool. `database/seed.sql` includes `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` statements to help existing local development databases catch up.

For production with real users, add a formal migration tool before changing schema.

## Security Notes

- No email verification yet.
- No password reset yet.
- No raw custom CSS yet.
- Local uploads are not cloud storage.
- Do not commit `.env` files.
- Do not commit uploaded user files.
