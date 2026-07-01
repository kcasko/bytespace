# ByteSpace

ByteSpace is an original retro-inspired social profile app with loud early-2000s energy: profile boxes, Top 8 friends, comments, bulletins, moods, and intentionally chaotic customization.

This pass includes:

- A working Vite React profile prototype.
- Profile data loaded from PostgreSQL through the Express API, with a development mock fallback when the database is unavailable.
- Email/password registration and login with bcrypt.
- Session-based auth using HTTP-only cookies.
- Server-side mock profile data in `server/src/data/mockProfiles.js`.
- PostgreSQL schema, seed data, and connection utilities.
- Retro fixed-width profile styling.
- A minimal Express API with health, profile, database, and auth routes.
- Folder structure prepared for auth, uploads, and future profile editing.

## Requirements

- Node.js 20 or newer recommended
- npm
- PostgreSQL for database setup and `/api/db/health`

## Frontend

```bash
cd bytespace/client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Backend

```bash
cd bytespace/server
npm install
copy .env.example .env
npm run dev
```

The server reads `DATABASE_URL` from `server/.env`.

Example `server/.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:55432/bytespace
SESSION_SECRET=replace-this-with-a-long-random-secret
NODE_ENV=development
```

Health check:

```bash
curl http://localhost:5000/api/health
```

Database health check:

```bash
curl http://localhost:5000/api/db/health
```

Profile API:

```bash
curl http://localhost:5000/api/profile/keith
```

Successful profile responses return:

```json
{
  "profile": {
    "username": "keith"
  }
}
```

Missing profiles return `404`:

```json
{
  "error": "Profile not found"
}
```

Auth API examples:

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d "{\"username\":\"newuser\",\"email\":\"newuser@example.com\",\"password\":\"password123\"}" \
  http://localhost:5000/api/auth/register

curl -i -b cookies.txt http://localhost:5000/api/auth/me

curl -i -b cookies.txt -X POST http://localhost:5000/api/auth/logout

curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d "{\"emailOrUsername\":\"keith\",\"password\":\"password123\"}" \
  http://localhost:5000/api/auth/login
```

## PostgreSQL Setup

### Option A: Local PostgreSQL

Create the local database from the repo root, using the credentials that match your machine:

```bash
createdb bytespace
psql -d bytespace -f database/schema.sql
psql -d bytespace -f database/seed.sql
```

If your local PostgreSQL username or password differs, update `DATABASE_URL` in `server/.env`.

### Option B: Temporary Docker PostgreSQL

```bash
docker run --name bytespace-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bytespace -p 55432:5432 -d postgres:16
```

Use this `DATABASE_URL` in `server/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:55432/bytespace
```

Load the schema and seed data:

```bash
psql -h localhost -p 55432 -U postgres -d bytespace -f database/schema.sql
psql -h localhost -p 55432 -U postgres -d bytespace -f database/seed.sql
```

Seeded development login:

```text
username: keith
email: keith@example.local
password: password123
```

This password is for local development only. Do not use it in production.

### v0.4 Verification

Start the backend:

```bash
cd bytespace/server
npm install
npm run dev
```

Verify:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/db/health
curl http://localhost:5000/api/profile/keith
```

When the database is available, `/api/profile/:username` reads from PostgreSQL. If the database is unavailable during development, known mock profiles can still be served from `server/src/data/mockProfiles.js` and the server logs a warning.

### v0.5 Auth Verification

1. Re-run `database/schema.sql` and `database/seed.sql`.
2. Start the backend and frontend.
3. Open `http://localhost:5173/register` and register a new user.
4. Confirm the nav shows the username and a Logout button.
5. Log out.
6. Log in as the new user from `http://localhost:5173/login`.
7. Log out again.
8. Log in as seeded Keith with `keith` / `password123`.

Auth responses return only safe user fields: `id`, `username`, and `email`. Password hashes are never returned to the frontend.

Sessions are stored in PostgreSQL through `connect-pg-simple` using the `session` table in `database/schema.sql`.

### v0.6 Profile Editor Verification

1. Start Docker PostgreSQL if using it.
2. Re-run `database/schema.sql` and `database/seed.sql`.
3. Start the backend and frontend.
4. Log in as seeded Keith with `keith` / `password123`.
5. Go to `http://localhost:5173/profile/edit`.
6. Change mood, headline, about text, or theme settings.
7. Save.
8. Visit `http://localhost:5173/profile/keith`.
9. Confirm the public profile shows the saved updates.

### v0.7 Profile Comments Verification

1. Start PostgreSQL.
2. Start the backend and frontend.
3. Log in as seeded Keith with `keith` / `password123`.
4. Visit `http://localhost:5173/profile/keith`.
5. Post a guestbook comment.
6. Confirm it appears without a full page reload.
7. Refresh the page and confirm the comment persists.
8. Log out.
9. Confirm the profile shows a login prompt instead of the comment form.
10. Confirm empty comments and comments over 500 characters are rejected.
11. Confirm comment bodies render as plain text, not HTML.

Comment API:

```bash
curl http://localhost:5000/api/comments/keith
```

Authenticated comment posting uses the same HTTP-only session cookie as login:

```bash
curl -i -b cookies.txt -H "Content-Type: application/json" \
  -d "{\"body\":\"Thanks for the add.\"}" \
  http://localhost:5000/api/comments/keith
```

## Project Structure

```text
bytespace/
  client/
    src/
      components/
      api/
      pages/
      data/
      styles/
      App.jsx
      main.jsx
  server/
    src/
      db/
      data/
      middleware/
      routes/
      controllers/
      server.js
    uploads/
    .env.example
  database/
    schema.sql
    seed.sql
  README.md
```

### v0.8 Image Uploads Verification

ByteSpace v0.8 adds authenticated profile picture and background image uploads stored locally on the server.

#### Upload Routes

| Method | Route | Field | Description |
|--------|-------|-------|-------------|
| `POST` | `/api/profile/me/avatar` | `avatar` | Upload profile picture |
| `POST` | `/api/profile/me/background` | `background` | Upload background image |

Both routes require a valid session cookie. Logged-out requests receive `401 Authentication required`.

#### Allowed Image Types

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

SVG and all other file types are rejected with `400 Unsupported image type`.

#### File Size Limits

| Upload | Limit |
|--------|-------|
| Avatar (`/me/avatar`) | 2 MB |
| Background (`/me/background`) | 5 MB |

Oversized files are rejected with `400 File is too large`.

#### Storage Path

Uploaded files are written to:

```text
server/uploads/avatars/       ← profile pictures
server/uploads/backgrounds/   ← background images
```

Filenames are randomly generated hex strings (e.g. `a3f8c21b...jpg`) — original filenames are never used. Files in `server/uploads/` are excluded from git via `.gitignore`. Directory placeholders (`.gitkeep`) are committed.

Public URLs served to the frontend follow this pattern:

```text
/uploads/avatars/<filename>
/uploads/backgrounds/<filename>
```

Example: `http://localhost:5000/uploads/avatars/abc123def456.jpg`

#### curl Examples

```bash
# Upload avatar (requires active session cookie)
curl -i -b cookies.txt \
  -F "avatar=@/path/to/photo.jpg" \
  http://localhost:5000/api/profile/me/avatar

# Upload background
curl -i -b cookies.txt \
  -F "background=@/path/to/banner.png" \
  http://localhost:5000/api/profile/me/background
```

#### Verification Steps

1. Start Docker PostgreSQL if needed:

   ```bash
   docker run --name bytespace-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bytespace -p 55432:5432 -d postgres:16
   ```

2. Start the backend:

   ```bash
   cd bytespace/server && npm run dev
   ```

3. Start the frontend:

   ```bash
   cd bytespace/client && npm run dev
   ```

4. Log in as Keith at `http://localhost:5173/login`:

   ```text
   username: keith
   password: password123
   ```

5. Go to `http://localhost:5173/profile/edit`.

6. In the **Profile Picture** section, choose a JPEG/PNG/WebP/GIF and click **Upload Profile Picture**. Confirm the success message and preview update.

7. In the **Background Image** section, choose an image and click **Upload Background Image**. Confirm success.

8. Visit `http://localhost:5173/profile/keith`.

9. Confirm:
   - Profile image appears in the sidebar.
   - Background image renders across the page shell.

10. Refresh the page and confirm both images persist (they are stored in PostgreSQL and served from disk).

11. Try uploading an unsupported file type (e.g. `.txt` or `.svg`) and confirm the `Unsupported image type` error.

12. Log out and try to upload via curl without a cookie — confirm `401 Authentication required`.

13. Verify health endpoints:

    ```bash
    curl http://localhost:5000/api/health
    curl http://localhost:5000/api/db/health
    curl http://localhost:5000/api/profile/keith
    ```

## Next Pass

The next pass should add cloud storage (e.g. S3-compatible) to replace local uploads, then connected Top 8 management and messaging.
