# ByteSpace Deployment Guide

ByteSpace is a Vite frontend and an Express API backed by PostgreSQL. The simplest demo deployment is a single Node server behind HTTPS: build `client/dist`, start the Express server, and let Express serve the frontend plus `/api` and `/uploads`.

Separate frontend/API deployments are still supported with `VITE_API_BASE_URL` and `CLIENT_ORIGIN`.

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
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
WRITE_RATE_LIMIT_WINDOW_MS=900000
WRITE_RATE_LIMIT_MAX=60
UPLOAD_RATE_LIMIT_WINDOW_MS=900000
UPLOAD_RATE_LIMIT_MAX=30
```

Client variables:

```env
VITE_API_BASE_URL=https://your-api.example
```

For same-origin production deployments where Express serves `client/dist`, `VITE_API_BASE_URL` may be left unset. The production client will call `/api/...` and `/uploads/...` on the same origin. In local development, the fallback remains `http://localhost:5000`.

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
- Set `VITE_API_BASE_URL` to the API origin for separate frontend/API deployment, or leave it unset for same-origin Express serving.
- Run `npm run build` from the repo root or in `client/`.
- Start the API with `npm start` in `server/` or `npm run start:server` from the repo root.
- Serve the built frontend with Express, a static host, or a reverse proxy.
- Put the API behind HTTPS.
- Set `TRUST_PROXY=true` when running behind a reverse proxy or managed platform.
- Back up PostgreSQL.
- Back up `UPLOADS_DIR`.
- Do not use the seeded Keith password in production.
- Do not expose `.env` files.

## Option A: Single VPS / ByteGeist Homelab

Use one host for PostgreSQL, the Node server, persistent uploads, and a reverse proxy.

1. Install Node.js 20+ and PostgreSQL.
2. Set server env vars in `server/.env`.
3. Run the schema:

   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```

4. For a demo only, optionally seed sample data:

   ```bash
   psql "$DATABASE_URL" -f database/seed.sql
   ```

5. Build the client:

   ```bash
   npm install
   npm --prefix client install
   npm --prefix server install
   npm run build
   ```

6. Start the server:

   ```bash
   npm run start:server
   ```

7. Put Nginx/Caddy/Apache in front with HTTPS.
8. Proxy the public site to the Node server. Express serves `client/dist`, `/api`, and `/uploads`.
9. Set `CLIENT_ORIGIN` to the public HTTPS origin.
10. Set `TRUST_PROXY=true`.
11. Back up PostgreSQL and `UPLOADS_DIR`.

VPS reverse proxy notes:

- Use HTTPS. Production cookies are secure.
- Route `/api` to the Express backend.
- Route `/uploads` to the Express backend or serve the uploads directory safely from the proxy.
- Serve `client/dist` through Express or directly from the proxy.
- If the frontend is served from a different domain, set `VITE_API_BASE_URL` before building the client.

## Option B: Render/Railway Style

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

Uploads:

- Use a persistent disk if the platform supports one.
- Without persistent disk, uploaded avatars/backgrounds can disappear on redeploy.
- Multi-instance deployments need object storage later.

## Alternative Static Proxy Setup

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

## Security Headers And Rate Limits

ByteSpace uses Helmet for baseline security headers. Content Security Policy is currently deferred because profile images, uploaded backgrounds, local dev origins, and future profile-song link behavior need a tested policy before enforcement.

The server applies JSON body parsing with a `100kb` limit. Multer upload limits still apply separately for avatar/background uploads.

Rate limits return:

```json
{
  "error": "Too many requests. Try again later."
}
```

Default limits:

- Auth login/register: `10` requests per `15` minutes per IP.
- Write actions: `60` requests per `15` minutes per IP.
- Upload actions: `30` requests per `15` minutes per IP.

Tuning variables:

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `UPLOAD_RATE_LIMIT_WINDOW_MS`
- `UPLOAD_RATE_LIMIT_MAX`

These limits are a basic safety net, not a full abuse-prevention system.

## Uploads

Uploaded avatars and backgrounds are served from `/uploads`.

`UPLOADS_DIR=uploads` stores files under `server/uploads` by default. This is fine for a single-server demo. For real production, add object storage later or ensure the uploads directory is on persistent disk and backed up.

Local uploads are not ideal for multi-instance deployments because each instance would have its own disk.

## Database Migrations

This project does not yet have a formal migration tool. `database/seed.sql` includes `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` statements to help existing local development databases catch up.

For production with real users, add a formal migration tool before changing schema.

## Security Notes

- No email verification yet.
- No password reset yet.
- No raw custom CSS yet.
- Local uploads are not cloud storage.
- `database/seed.sql` creates demo users, including Keith with the documented dev password. Change or remove seeded credentials before public use.
- Rate limiting is basic and should be paired with platform logs/firewalling for public deployments.
- CSP is deferred until it can be tested against uploads, local dev, and external profile-song links.
- Do not commit `.env` files.
- Do not commit uploaded user files.

## Production Smoke Test

Run this after deploying:

1. Load the landing page.
2. Confirm `/api/health` works.
3. Confirm `/api/db/health` works.
4. Log in as Keith or a deployed demo account.
5. Confirm the dashboard loads.
6. Confirm `/profile/keith` loads.
7. Upload an avatar.
8. Upload a background image.
9. Post a guestbook comment.
10. Create and delete a bulletin.
11. Send a friend request between two demo users.
12. Set a profile to private and confirm public users are blocked.
13. Block and unblock a user.
