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
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:55432/bytespace
SESSION_SECRET=replace-this-with-a-long-random-secret
UPLOADS_DIR=uploads
TRUST_PROXY=false
SESSION_COOKIE_SAMESITE=lax
REGISTRATION_MODE=invite
ALLOW_REGISTRATION=true
INVITE_CODE=replace-with-private-invite-code
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

For deployment details, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
For the ByteGeist homelab runbook for `bytespace.casko.dev`, see [docs/BYTEGEIST_DEPLOYMENT.md](docs/BYTEGEIST_DEPLOYMENT.md).

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

### v0.9 Theme Presets and Preview Polish

ByteSpace v0.9 adds profile theme presets, background image display options, a theme reset control, and a richer live preview in the profile editor.

#### Theme Presets

The editor includes these preset buttons:

- Blue Classic
- Scene Kid Disaster
- Cyber Rot
- Mall Goth
- VHS Static
- LimeWire Infection

Clicking a preset updates the local editor state and live preview immediately. Presets do not save automatically; click **Save Profile** to persist changes.

#### Background Display Options

Profiles now store three additional optional theme fields:

- `theme_background_repeat` (`repeat`, `no-repeat`, `repeat-x`, `repeat-y`)
- `theme_background_size` (`auto`, `cover`, `contain`)
- `theme_background_position` (`center`, `top`, `bottom`, `left`, `right`)

Safe defaults are `repeat`, `auto`, and `center`.

For an existing local database, run the schema/seed setup again from the repo root:

```bash
psql -h localhost -p 55432 -U postgres -d bytespace -f database/schema.sql
psql -h localhost -p 55432 -U postgres -d bytespace -f database/seed.sql
```

`database/seed.sql` also adds the v0.9 columns with defaults when they are missing.

#### Reset Theme

**Reset Theme** returns theme colors and font to Blue Classic and resets background display to `repeat`, `auto`, and `center`. It updates the preview only; click **Save Profile** to persist.

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Log in as Keith with `keith` / `password123`.
5. Go to `http://localhost:5173/profile/edit`.
6. Confirm theme preset buttons appear.
7. Click each preset and confirm the live preview updates.
8. Click **Reset Theme** and confirm the preview returns to Blue Classic.
9. Change mood, headline, a theme preset, background repeat, background size, and background position.
10. Click **Save Profile** and confirm `Profile saved. Your chaos has been preserved.`
11. Visit `http://localhost:5173/profile/keith`.
12. Confirm the saved theme renders on the public profile.
13. Refresh `/profile/keith` and confirm the theme persists.
14. Confirm avatar and background image still render.
15. Confirm guestbook comments still render.
16. Confirm `npm run build` passes in `client/`.

### v1.0 Friends and Top 8 Management

ByteSpace v1.0 adds a simple authenticated friends system and lets users manage their Top 8.

#### Friend Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/friends` | Return accepted friends for the current user |
| `GET` | `/api/friends/requests` | Return incoming and outgoing pending friend requests |
| `POST` | `/api/friends/request/:username` | Send a friend request |
| `POST` | `/api/friends/accept/:username` | Accept an incoming friend request |
| `POST` | `/api/friends/reject/:username` | Reject an incoming friend request |

All friend routes require a valid session cookie.

#### Top 8 Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/friends/top` | Return the current user's Top 8 |
| `PUT` | `/api/friends/top` | Replace the current user's Top 8 with an ordered list |

`PUT /api/friends/top` accepts:

```json
{
  "friendUserIds": [2, 3, 4]
}
```

Rules:

- Users cannot friend themselves.
- Duplicate pending or accepted friendships are rejected safely.
- Only the receiver can accept or reject an incoming request.
- Only accepted friends can be added to Top 8.
- Top 8 accepts at most 8 users.
- Saved Top 8 positions are stored as 1 through 8.
- Password hashes are never returned.

#### Seeded Friends

The seed data gives Keith accepted friendships with:

- Tom
- Lacutis
- ByteGeist
- NullKid
- GlitterGoblin
- LinuxGoblin
- CrashOverride
- DialUpDemon

Keith's seeded Top 8 uses those friends in positions 1 through 8. `database/seed.sql` is safe to re-run for this setup and refreshes Keith's seeded Top 8 order.

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Log in as Keith with `keith` / `password123`.
5. Visit `http://localhost:5173/profile/keith`.
6. Confirm Top 8 renders from PostgreSQL.
7. Go to `http://localhost:5173/friends`.
8. Confirm accepted friends display.
9. Confirm current Top 8 displays.
10. Reorder Top 8 with **Up** and **Down**.
11. Click **Save Top 8**.
12. Visit `/profile/keith` and confirm the public Top 8 order changed.
13. Refresh `/profile/keith` and confirm the order persists.
14. Register a new user.
15. As the new user, send a friend request to `keith`.
16. Log out.
17. Log in as Keith.
18. Go to `/friends` and confirm the incoming request appears.
19. Accept the request and confirm the new user appears in Keith's friends list.
20. Try sending a friend request to yourself and confirm it is rejected.
21. Try a duplicate friend request and confirm a useful error/status appears.
22. Confirm `npm run build` passes in `client/`.

### v1.1 Browse and User Search

ByteSpace v1.1 adds a public browse/search page so people can discover profiles without guessing usernames.

#### Browse Page

Open:

```text
http://localhost:5173/browse
```

The page shows recent users by default. Searching checks both `username` and profile `display_name`, then renders public-safe profile cards with avatar, display name, username, headline, mood, and a link to the public profile.

Logged-out users can browse and view profiles, but friend actions are replaced with `Log in to add friends.`

Logged-in users see friend-aware actions/statuses:

- `self` → Your profile
- `friend` → Friends
- `outgoing_pending` → Request sent
- `incoming_pending` → Request received
- `none` → Add Friend

Clicking **Add Friend** sends `POST /api/friends/request/:username` and updates that card to `Request sent` without a full page reload.

#### User Search Route

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/users/search?q=` | Public user browse/search endpoint |

Behavior:

- Empty `q` returns a default recent-user browse list.
- Non-empty `q` searches username and display name.
- Results are limited to 25.
- Exact username matches are ordered first when practical.
- Logged-out responses omit `friendStatus`.
- Logged-in responses include `friendStatus` relative to the current user.
- Responses never include `email`, `password_hash`, session data, or private/internal fields.

Example:

```bash
curl "http://localhost:5000/api/users/search?q=keith"
```

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Visit `http://localhost:5173/browse` while logged out.
5. Confirm recent/default users appear.
6. Search for `keith`.
7. Confirm Keith appears.
8. Confirm logged-out users can view `/profile/keith`.
9. Confirm logged-out users do not get an active **Add Friend** action.
10. Log in as Keith.
11. Visit `/browse`.
12. Confirm default users appear.
13. Search for `lacutis`.
14. Confirm Lacutis appears with `Friends` status.
15. Search for `keith`.
16. Confirm self status appears.
17. Register or use a test user that is not Keith's friend.
18. Search for that user.
19. Click **Add Friend**.
20. Confirm the card updates to `Request sent`.
21. Confirm the request appears on `/friends`.
22. Confirm `npm run build` passes in `client/`.

### v1.2 Bulletins

ByteSpace v1.2 adds classic public bulletins: short posts that users create from their account, display on their public profile, and review from a logged-in bulletin board page.

#### Bulletin Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/bulletins/user/:username` | Public | Return public bulletins for a profile username |
| `GET` | `/api/bulletins/me` | Required | Return the logged-in user's bulletins |
| `GET` | `/api/bulletins/friends` | Required | Return recent bulletins from accepted friends |
| `POST` | `/api/bulletins` | Required | Create a bulletin |
| `DELETE` | `/api/bulletins/:id` | Required | Delete one of the logged-in user's own bulletins |

Bulletin responses include:

- `id`
- `title`
- `body`
- `createdAt`
- `updatedAt`
- `authorUsername`
- `authorDisplayName`
- `authorProfileImageUrl`

Responses never include email, password hashes, or session data.

#### Validation

`POST /api/bulletins` accepts:

```json
{
  "title": "Subject here",
  "body": "Bulletin body here"
}
```

Rules:

- Title is required.
- Body is required.
- Title and body are trimmed before storage.
- Title max length is 120 characters.
- Body max length is 2000 characters.
- Empty title/body are rejected.
- Bulletins are public for now.
- Only the owner can delete their bulletin.

Bulletin title/body render as plain text in React. Do not use `dangerouslySetInnerHTML`.

#### Frontend

Open:

```text
http://localhost:5173/bulletins
```

Logged-out users see:

```text
Log in to post bulletins and scream into the glitter void.
```

Logged-in users can:

- Post a bulletin.
- View their own bulletins.
- Delete their own bulletins.
- View recent friend bulletins.

Public profiles fetch recent bulletins through `/api/bulletins/user/:username` and show them in the **Bulletin Board** section.

#### Seeded Bulletins

`database/seed.sql` seeds a few Keith bulletins plus friend bulletins from Tom, Lacutis, and ByteGeist so `/profile/keith` and `/bulletins` have visible sample content.

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Visit `/profile/keith` logged out.
5. Confirm the public bulletin section appears.
6. Confirm logged-out users can read public bulletins.
7. Visit `/bulletins` logged out.
8. Confirm the login prompt appears.
9. Log in as Keith with `keith` / `password123`.
10. Visit `/bulletins`.
11. Confirm the **Post a Bulletin** form appears.
12. Create a bulletin.
13. Confirm it appears under **Your Bulletins**.
14. Visit `/profile/keith`.
15. Confirm the new bulletin appears on the public profile.
16. Refresh and confirm the bulletin persists.
17. Try an empty title and confirm it is rejected.
18. Try an empty body and confirm it is rejected.
19. Try a too-long title/body and confirm it is rejected.
20. Delete your own bulletin.
21. Refresh and confirm deletion persists.
22. Confirm friend bulletins display for Keith.
23. Confirm `npm run build` passes in `client/`.

### v1.3 Profile Song

ByteSpace v1.3 adds a simple profile song box without hosting music files. Users can save song metadata and a normal external link, and public profiles show a retro **Now Playing** widget.

#### Database Fields

The `profiles` table includes:

- `profile_song_title`
- `profile_song_artist`
- `profile_song_url`

`database/seed.sql` adds these columns with `ADD COLUMN IF NOT EXISTS` for existing local databases and seeds Keith with:

- Song title: `Would?`
- Artist: `Alice in Chains`
- Song URL: `https://example.com/profile-song-placeholder`

#### Editor Fields

The profile editor has a **Profile Song** section with:

- Song Title
- Artist
- Song URL

These fields save through the existing **Save Profile** button and update the live preview immediately.

#### Public Profile Display

Public profiles render a chunky early-web profile song widget. If title or artist is present, it shows:

```text
Now Playing: Would? by Alice in Chains
```

If no song is set, it shows:

```text
No profile song set. Suspiciously quiet.
```

If a valid URL exists, the page shows a normal `Open song link` anchor. There are no uploads, no autoplay, no embedded player, and no `dangerouslySetInnerHTML`.

#### URL Validation

`PUT /api/profile/me` accepts:

- `profileSongTitle`, max 120 characters
- `profileSongArtist`, max 120 characters
- `profileSongUrl`, max 500 characters

`profileSongUrl` may be empty. If present, it must be a valid `http://` or `https://` URL. Unsupported schemes such as `javascript:`, `data:`, and `file:` are rejected with `400`.

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Log in as Keith with `keith` / `password123`.
5. Visit `/profile/edit`.
6. Confirm the **Profile Song** section appears.
7. Set Song Title to `Would?`, Artist to `Alice in Chains`, and Song URL to `https://example.com/profile-song-placeholder`.
8. Click **Save Profile**.
9. Confirm `Profile saved. Your chaos has been preserved.`
10. Visit `/profile/keith`.
11. Confirm the profile song box appears with title and artist.
12. Confirm the song URL renders as a normal link.
13. Refresh `/profile/keith` and confirm the song persists.
14. Try `javascript:alert(1)` as the song URL and confirm the backend rejects it with `400`.
15. Confirm `npm run build` passes in `client/`.
16. Smoke check comments, bulletins, browse, friends, Top 8, profile editor, theme controls, avatar upload, and background upload.

### v1.4 Privacy Settings

ByteSpace v1.4 adds a basic account and privacy control panel for profile visibility, comments, bulletins, and friend requests.

#### Database Fields

The `profiles` table includes:

- `profile_visibility`
- `comment_permission`
- `bulletin_visibility`
- `friend_request_permission`

Defaults:

- `profile_visibility = public`
- `comment_permission = everyone`
- `bulletin_visibility = public`
- `friend_request_permission = everyone`

`database/seed.sql` uses `ADD COLUMN IF NOT EXISTS` and backfills defaults for existing local databases.

#### Settings Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/settings/me` | Required | Return the logged-in user's settings |
| `PUT` | `/api/settings/me` | Required | Validate and update settings |

`PUT /api/settings/me` accepts:

```json
{
  "profileVisibility": "public",
  "commentPermission": "everyone",
  "bulletinVisibility": "public",
  "friendRequestPermission": "everyone"
}
```

Allowed values:

- `profileVisibility`: `public`, `friends`, `private`
- `commentPermission`: `everyone`, `friends`, `none`
- `bulletinVisibility`: `public`, `friends`, `private`
- `friendRequestPermission`: `everyone`, `friends_of_friends`, `none`

Unsupported values return `400`.

#### Enforcement

Profile visibility:

- `public`: anyone can view.
- `friends`: only the owner and accepted friends can view.
- `private`: only the owner can view.
- Forbidden profile reads return `403` with `This profile is private`.

Comments:

- `everyone`: any logged-in user can comment.
- `friends`: only accepted friends and the profile owner can comment.
- `none`: only the profile owner can comment.

Bulletins:

- `public`: anyone can read profile bulletins.
- `friends`: only accepted friends and the owner can read.
- `private`: only the owner can read.
- Forbidden bulletin reads return `403` with `These bulletins are private`.

Friend requests:

- `everyone`: any logged-in user can send a request.
- `friends_of_friends`: requester must share at least one accepted friend with the receiver.
- `none`: incoming friend requests are rejected.

Browse/search remains public-safe and never returns email, password hashes, session data, or private internals.

#### Frontend

Open:

```text
http://localhost:5173/settings
```

Logged-out users see:

```text
Log in before adjusting your privacy force field.
```

Logged-in users can save settings from the **Account & Privacy Settings** page. Successful saves show:

```text
Settings saved. Your boundaries have been weaponized.
```

Public profile forbidden UI shows:

```text
This profile is private. The glitter curtain is closed.
```

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Log in as Keith with `keith` / `password123`.
5. Visit `/settings`.
6. Confirm settings load.
7. Change profile visibility to `private`.
8. Save settings.
9. Log out.
10. Visit `/profile/keith`.
11. Confirm the private profile UI appears.
12. Log back in as Keith.
13. Set profile visibility back to `public`.
14. Confirm `/profile/keith` works logged out again.
15. Set comment permission to `none`.
16. Log in as another test user.
17. Try commenting on Keith's profile and confirm rejection.
18. Set comment permission back to `everyone`.
19. Set bulletin visibility to `private`.
20. Log out.
21. Visit `/profile/keith` or `/api/bulletins/user/keith` and confirm bulletins are hidden/forbidden.
22. Set bulletin visibility back to `public`.
23. Set friend request permission to `none`.
24. Log in as another user.
25. Try sending a friend request to Keith and confirm rejection.
26. Set friend request permission back to `everyone`.
27. Confirm `npm run build` passes in `client/`.
28. Smoke check comments, bulletins, browse, friends, Top 8, profile editor, theme controls, avatar upload, background upload, and profile song.

### v1.5 Blocking

ByteSpace v1.5 adds basic user blocking. Blocking is account-level and prevents unwanted profile viewing, comments, bulletin access, and friend requests.

#### Database

Blocking uses a dedicated table:

```sql
blocked_users (
  id,
  blocker_id,
  blocked_id,
  created_at
)
```

Rules:

- `blocker_id` references the user who created the block.
- `blocked_id` references the blocked user.
- `UNIQUE (blocker_id, blocked_id)` prevents duplicate rows.
- `CHECK (blocker_id <> blocked_id)` prevents self-block rows.
- `database/seed.sql` creates the table and indexes with `IF NOT EXISTS` for local upgrades.

#### Block Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/blocks` | Required | Return users blocked by the logged-in user |
| `POST` | `/api/blocks/:username` | Required | Block a user |
| `DELETE` | `/api/blocks/:username` | Required | Unblock a user |

Successful block response:

```json
{
  "status": "ok",
  "message": "User blocked"
}
```

Successful unblock response:

```json
{
  "status": "ok",
  "message": "User unblocked"
}
```

Blocked user rows include:

- `id`
- `username`
- `displayName`
- `profileImageUrl`
- `blockedAt`

#### Enforcement

If User A blocks User B:

- User B cannot view User A's profile.
- User B cannot comment on User A's profile.
- User B cannot send User A a friend request.
- User B cannot view User A's bulletins.
- User B is hidden from User A's browse/search results.
- User B is excluded from User A's friends list and Top 8 management.
- Existing friendship and pending friend requests between the users are deleted.
- Each user is removed from the other's Top 8.
- Unblocking does not restore friendship or Top 8 placement.

Profile block responses:

- If the profile owner blocked the viewer: `403` with `This profile is unavailable`.
- If the viewer blocked the profile owner: `403` with `You blocked this user`.

Blocked comments, bulletins, and friend requests return `403` with a useful blocking error.

#### Frontend

`/settings` includes a **Blocked Users** section:

- Username field
- **Block User** button
- Blocked user list
- **Unblock** button per blocked user

Success messages:

```text
User blocked. The glitter curtain has been slammed shut.
User unblocked. Choose chaos responsibly.
```

Public profiles show **Block User** when logged in and viewing another user's profile. The UI asks:

```text
Are you sure you want to block @username?
```

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Log in as Keith with `keith` / `password123`.
5. Visit `/settings`.
6. Confirm the **Blocked Users** section appears.
7. Block a test user by username.
8. Confirm they appear in the blocked list.
9. Confirm **Unblock** works.
10. Create or use a second test user.
11. As Keith, block that user.
12. Log out.
13. Log in as the blocked user.
14. Try viewing `/profile/keith` and confirm blocked UI/403 behavior.
15. Try commenting on Keith's profile and confirm rejection.
16. Try sending a friend request to Keith and confirm rejection.
17. Try viewing Keith's bulletins and confirm rejection.
18. Log back in as Keith.
19. Confirm the blocked user does not appear in browse/search.
20. Confirm the blocked user does not appear in friends list or Top 8 management.
21. Unblock the user.
22. Confirm the user can be found again in browse/search.
23. Confirm the user can send a friend request again if privacy settings allow.
24. Try blocking self and confirm rejection.
25. Try blocking the same user twice and confirm no duplicate rows.
26. Confirm `npm run build` passes in `client/`.
27. Smoke check comments, bulletins, browse, friends, Top 8, profile editor, theme controls, avatar upload, background upload, profile song, and privacy settings.

### v1.6 Deployment Prep

ByteSpace v1.6 prepares the app for realistic deployment without deploying it yet.

#### Environment Files

Server example:

```text
server/.env.example
```

Required server variables:

- `NODE_ENV`
- `PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `SESSION_SECRET`
- `UPLOADS_DIR`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `UPLOAD_RATE_LIMIT_WINDOW_MS`
- `UPLOAD_RATE_LIMIT_MAX`

Optional deployment variables:

- `TRUST_PROXY`
- `SESSION_COOKIE_SAMESITE`

Client example:

```text
client/.env.example
```

Required client variable:

- `VITE_API_BASE_URL`

All frontend API helpers use `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"`.

#### Root Scripts

The repo root has convenience scripts:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run build:client
npm run start:server
```

Client scripts still work from `client/`, and server scripts still work from `server/`.

#### Local Development Checklist

1. Install frontend dependencies: `cd client && npm install`.
2. Install backend dependencies: `cd server && npm install`.
3. Copy env files: `cp client/.env.example client/.env` and `cp server/.env.example server/.env`.
4. Start Docker PostgreSQL:

   ```bash
   docker run --name bytespace-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bytespace -p 55432:5432 -d postgres:16
   ```

5. Load schema and seed:

   ```bash
   psql -h localhost -p 55432 -U postgres -d bytespace -f database/schema.sql
   psql -h localhost -p 55432 -U postgres -d bytespace -f database/seed.sql
   ```

6. Start backend: `cd server && npm run dev`.
7. Start frontend: `cd client && npm run dev`.

#### Production Checklist

- Set `NODE_ENV=production`.
- Set production `DATABASE_URL`.
- Set a strong `SESSION_SECRET`.
- Set exact `CLIENT_ORIGIN`.
- Set frontend `VITE_API_BASE_URL`.
- Run `npm run build` in `client/`.
- Start backend with `npm start` from `server/`.
- Configure HTTPS and a reverse proxy or managed platform routing.
- Set `TRUST_PROXY=true` when behind a proxy.
- Back up PostgreSQL.
- Back up `UPLOADS_DIR`.
- Do not use the dev seed password in production.
- Do not expose `.env`.

#### CORS And Sessions

The backend reads `CLIENT_ORIGIN` from env and enables credentialed CORS. Do not use wildcard origins with session cookies.

Sessions use PostgreSQL through `connect-pg-simple`. `MemoryStore` is not used.

Development cookies use `httpOnly`, `sameSite=lax`, and non-secure cookies. Production uses secure cookies. If the frontend and API are on different domains, `SESSION_COOKIE_SAMESITE=none` plus HTTPS may be required.

#### Upload Storage

Uploaded avatars and backgrounds are served from `/uploads` and stored under `UPLOADS_DIR`, defaulting to `server/uploads`.

Local disk uploads are fine for a single-server demo. For real production, use persistent disk with backups or add object storage later.

#### Database Migrations

Fresh local DB:

```bash
createdb bytespace
psql -d bytespace -f database/schema.sql
psql -d bytespace -f database/seed.sql
```

Existing local DBs currently rely on `database/seed.sql` using `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` for incremental development changes.

This project does not yet have a formal migration tool. For production with real users, add migrations before changing schema.

#### Security Notes

- Local uploads are not cloud storage.
- No raw custom CSS yet.
- No email verification yet.
- No password reset yet.
- No formal migrations yet.
- Do not expose `.env`.
- Do not commit uploaded user files.

Detailed deployment options are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
The ByteGeist homelab runbook for `bytespace.casko.dev` is documented in [docs/BYTEGEIST_DEPLOYMENT.md](docs/BYTEGEIST_DEPLOYMENT.md).
Security notes are documented in [docs/SECURITY.md](docs/SECURITY.md).

### v1.7 Homepage/Dashboard

ByteSpace v1.7 adds a real home experience without adding a new social system.

#### Landing Page

Logged-out visitors at `/` now see a retro landing page with:

- ByteSpace title and tagline
- Register, Login, and Browse Profiles links
- Feature callouts for profile customization, Top 8, bulletins, guestbook comments, browse, and profile songs
- A small fake profile preview card

#### Logged-In Dashboard

Logged-in users at `/` now see **Your ByteSpace Command Center** with:

- Profile summary
- Mood/headline/avatar
- View My Profile and Edit Profile shortcuts
- Quick links for profile editing, browse, friends, bulletins, and settings
- Counts for friends, Top 8, incoming/outgoing requests, bulletins, comments, and blocked users
- Incoming friend request preview
- Recent friend bulletin preview
- Recent profile comment preview

#### Dashboard API

Authenticated route:

```http
GET /api/dashboard/me
```

Response shape:

```json
{
  "user": {
    "id": 1,
    "username": "keith"
  },
  "profile": {
    "displayName": "Keith",
    "headline": "...",
    "mood": "...",
    "profileImageUrl": "...",
    "backgroundImageUrl": "..."
  },
  "counts": {
    "friends": 8,
    "incomingRequests": 0,
    "outgoingRequests": 0,
    "topFriends": 8,
    "bulletins": 2,
    "comments": 4,
    "blockedUsers": 0
  },
  "incomingRequests": [],
  "recentFriendBulletins": [],
  "recentProfileComments": []
}
```

The dashboard response does not include email, password hashes, session data, or internal auth fields. Dashboard lists exclude blocked relationships where practical.

#### Verification Steps

1. Start PostgreSQL.
2. Start the backend: `cd bytespace/server && npm run dev`.
3. Start the frontend: `cd bytespace/client && npm run dev`.
4. Visit `/` while logged out.
5. Confirm the landing page appears.
6. Confirm Register, Login, and Browse Profiles links work.
7. Visit `/browse` logged out and confirm browse still works.
8. Log in as Keith with `keith` / `password123`.
9. Visit `/`.
10. Confirm the dashboard appears.
11. Confirm the welcome panel shows Keith/profile info.
12. Confirm counts render.
13. Confirm quick action links work.
14. Confirm incoming requests preview or empty state appears.
15. Confirm friend bulletins preview or empty state appears.
16. Confirm profile comments preview or empty state appears.
17. Confirm `GET /api/dashboard/me` works and does not expose `email` or `password_hash`.
18. Smoke check `/profile/keith`, `/profile/edit`, `/browse`, `/friends`, `/bulletins`, `/settings`, avatar upload, and background upload.
19. Confirm `npm run build` passes.

### v2.0 Deployable Demo

ByteSpace v2.0 prepares a deployable demo build. No actual deployment was performed in this repo pass because no server or platform credentials were provided.

#### Deployment Approach

Preferred demo path:

- Single VPS or ByteGeist homelab
- PostgreSQL on a managed service or the host
- Express server behind HTTPS/reverse proxy
- `client/dist` served by Express after `npm run build`
- `/api` and `/uploads` handled by the same Express server
- Persistent `UPLOADS_DIR` with backups

Render/Railway-style split deployment is also supported:

- backend web service
- frontend static site
- managed PostgreSQL
- persistent upload disk if available

#### Environment Variables

Server:

- `NODE_ENV=production`
- `PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `SESSION_SECRET`
- `TRUST_PROXY`
- `SESSION_COOKIE_SAMESITE`
- `UPLOADS_DIR`

Client:

- `VITE_API_BASE_URL`

For same-origin production where Express serves `client/dist`, `VITE_API_BASE_URL` can be left unset and the built client will call the same origin. In local dev, the fallback remains `http://localhost:5000`.

For split frontend/API deployment, set `VITE_API_BASE_URL` to the deployed backend URL before building the client, and set `CLIENT_ORIGIN` to the exact frontend origin.

#### Build And Start

Install dependencies:

```bash
npm --prefix client install
npm --prefix server install
```

Build frontend:

```bash
npm run build
```

Start backend/demo server:

```bash
cd server
NODE_ENV=production npm start
```

On PowerShell:

```powershell
$env:NODE_ENV='production'; npm start
```

The production server serves:

- `/api/*`
- `/uploads/*`
- built React routes from `client/dist` when the build exists

#### Reverse Proxy Notes

- Use HTTPS. Production cookies are secure.
- Set `TRUST_PROXY=true` behind Nginx, Caddy, Apache, Render, Railway, or similar.
- Set `CLIENT_ORIGIN` to the public frontend origin.
- Route `/api` to Express.
- Route `/uploads` to Express or safely serve the uploads directory.
- Keep `UPLOADS_DIR` on persistent disk.

#### PostgreSQL Setup

Fresh DB:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Demo seed data:

```bash
psql "$DATABASE_URL" -f database/seed.sql
```

`seed.sql` creates demo users and the Keith login. Change or delete seeded passwords before any public demo.

#### Upload Storage Warning

Local uploads are acceptable for a single-server demo. Back up `UPLOADS_DIR`, keep it persistent between deploys, and do not use this layout for multi-instance production without object storage.

#### Production Smoke Test

1. Landing page loads.
2. `/api/health` works.
3. `/api/db/health` works.
4. Login works.
5. Dashboard loads.
6. Public profile loads.
7. Avatar upload works.
8. Background upload works.
9. Guestbook comment works.
10. Bulletin create/delete works.
11. Friend request works.
12. Private profile blocks public users.
13. Block/unblock works.

### v2.1 Production Hardening

ByteSpace v2.1 adds a focused security/reliability pass before real deployment.

#### Security Headers

The Express server uses Helmet for baseline security headers. Content Security Policy is intentionally deferred until it can be tested against uploaded images/backgrounds, local dev origins, and external profile-song links.

Helmet is configured to keep dev and production image loading compatible with the Vite frontend and `/uploads`.

#### Rate Limits

Default per-IP limits:

- Auth login/register: `10` requests per `15` minutes.
- Write actions: `60` requests per `15` minutes.
- Upload actions: `30` requests per `15` minutes.

Protected routes:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/comments/:username`
- `POST /api/bulletins`
- `POST /api/friends/request/:username`
- `POST /api/profile/me/avatar`
- `POST /api/profile/me/background`

429 response:

```json
{
  "error": "Too many requests. Try again later."
}
```

Rate limit tuning:

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `WRITE_RATE_LIMIT_WINDOW_MS`
- `WRITE_RATE_LIMIT_MAX`
- `UPLOAD_RATE_LIMIT_WINDOW_MS`
- `UPLOAD_RATE_LIMIT_MAX`

These limits are basic hardening, not complete abuse prevention.

#### Request And Error Handling

- JSON body parsing uses `100kb` limit.
- Unknown `/api` routes return `404` with `{ "error": "API route not found" }`.
- Central error handling returns JSON for API routes.
- Production API errors do not include stack traces.
- Existing route-level error handling remains in place.

#### Security Checklist

- Use HTTPS.
- Set a strong `SESSION_SECRET`.
- Set `TRUST_PROXY=true` behind a reverse proxy.
- Set exact `CLIENT_ORIGIN`; do not use wildcard CORS with credentials.
- Back up `UPLOADS_DIR`.
- Remove or change seeded demo credentials before public deployment.
- Remember: no email verification, password reset, or formal migration tool yet.

### v2.2 ByteGeist Deployment Runbook

ByteSpace v2.2 adds a practical Ubuntu/Nginx Proxy Manager homelab deployment runbook for `bytespace.casko.dev`.

See [docs/BYTEGEIST_DEPLOYMENT.md](docs/BYTEGEIST_DEPLOYMENT.md) for:

- `/opt/bytespace` clone and install commands
- PostgreSQL database/user setup
- production `.env` template with placeholders only
- client build and production start commands
- systemd service examples
- Nginx Proxy Manager settings
- upload persistence, update, backup, rollback, and smoke-test steps

### v2.3 Live ByteGeist Deployment

ByteSpace is deployed live at `https://bytespace.casko.dev` on `bytegeist-cloud` under `/opt/bytespace`. The production service is `bytespace.service`, the Node app listens on host port `5000`, and Nginx Proxy Manager proxies to `http://172.20.0.1:5000` from Docker.

The live production env file is `/opt/bytespace/server/.env`. It must remain private and must not be printed, committed, or copied into docs. Backup artifacts for PostgreSQL and uploads must also stay out of git.

See [docs/BYTEGEIST_DEPLOYMENT.md](docs/BYTEGEIST_DEPLOYMENT.md) for the live deployment state, NPM 504 root cause, UFW rule, health checks, backup notes, and update/rollback commands.


### Active S3 Offsite Backups

ByteSpace runs `/opt/bytespace/scripts/bytespace-backup.sh` every day at `03:00` from cron:

```cron
0 3 * * * /opt/bytespace/scripts/bytespace-backup.sh >> /var/log/bytespace-backup.log 2>&1
```

Local backups are stored in `/opt/bytespace-backups`, and the local script keeps 7 days of PostgreSQL `.sql` dumps and uploads `.tar.gz` archives. Offsite S3 backups are enabled in production and upload the same two artifacts to:

```text
s3://bytespace-backups-keith-2026/bytespace/YYYY-MM-DD/
```

The live AWS backup config is `/etc/bytespace/backup.env` with `root:root` ownership and `600` permissions. It lives outside the repo and must never be printed, committed, copied into docs, or exposed. AWS credentials are stored outside git. The production server env file `/opt/bytespace/server/.env` is also private and must not be printed or copied.

Remote 7-day cleanup is handled by the S3 Lifecycle rule. Local 7-day cleanup is handled by the backup script. The manual S3 upload test passed on `2026-07-02`; verified objects included:

```text
s3://bytespace-backups-keith-2026/bytespace/2026-07-02/bytespace-db-20260702-211306.sql
s3://bytespace-backups-keith-2026/bytespace/2026-07-02/bytespace-uploads-20260702-211306.tar.gz
```

Verify backups without exposing secrets:

```bash
tail -100 /var/log/bytespace-backup.log
sudo -i
source /etc/bytespace/backup.env
aws s3 ls "s3://$BYTESPACE_BACKUP_BUCKET/$BYTESPACE_S3_PREFIX/" --recursive | tail -20
exit
```

See [docs/BYTEGEIST_DEPLOYMENT.md](docs/BYTEGEIST_DEPLOYMENT.md) for AWS CLI requirements, IAM permission shape, backup verification, and safety notes.

### v2.4 Invite-Only Registration

ByteSpace supports three registration modes controlled by server environment variables:

- `REGISTRATION_MODE=open` allows public registration.
- `REGISTRATION_MODE=disabled` blocks new registrations with a clear `403` response.
- `REGISTRATION_MODE=invite` requires a matching `INVITE_CODE` submitted during registration.

`ALLOW_REGISTRATION=false` blocks registration for compatibility with older config and overrides `REGISTRATION_MODE`. If `REGISTRATION_MODE` is missing, development falls back to open registration, while production falls back to disabled registration so the live app is not accidentally opened.

Recommended production config is invite-only or disabled:

```env
REGISTRATION_MODE=invite
ALLOW_REGISTRATION=true
INVITE_CODE=REDACTED_PRIVATE_INVITE_CODE
```

To change modes safely, edit the private server env file on the host, restart `bytespace.service`, and verify `/api/health`. Never commit `.env`, invite codes, database dumps, or backup archives.

### v2.5 Admin Moderation Foundation

ByteSpace includes a basic backend-enforced admin and moderation foundation. Admin users can open `/admin` to list users, view recent signups, review recent comments and bulletins, suspend or unsuspend users, and delete comments or bulletins.

Schema additions:

- `users.is_admin BOOLEAN NOT NULL DEFAULT FALSE`
- `users.suspended_at TIMESTAMPTZ`
- `users.suspension_reason TEXT`

Admin access is checked server-side on `/api/admin/*`; frontend visibility is only a convenience. Admin routes never return password hashes. Suspended users cannot log in or perform protected write actions such as profile updates, uploads, comments, bulletins, friend requests, settings changes, or block actions. They receive: `This account has been suspended.`

Apply the v2.5 user-column migration on the server before using admin tools:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
```

There is no public route to make an admin. Grant admin status manually from PostgreSQL on the server:

```sql
UPDATE users SET is_admin = true WHERE username = 'your_username';
```

Use the production database shell, not a committed file. Do not commit `.env`, invite codes, database URLs, backup artifacts, or moderation exports.

### v2.6 User Reporting and Safety Tools

ByteSpace adds logged-in user reporting for profiles, comments, and bulletins. Users can submit one open report per target with a reason and optional details. Report text is rendered as normal React text, not raw HTML. Suspended users cannot submit reports because `/api/reports` uses authenticated active-account middleware.

Report reasons:

- `harassment`
- `spam`
- `inappropriate_content`
- `impersonation`
- `other`

Report statuses:

- `open`
- `reviewed`
- `dismissed`
- `action_taken`

Admins review reports from `/admin`, can filter by status, add an admin note while changing status, and use existing moderation actions from report context: suspend user, delete comment, or delete bulletin. Admin report routes are backend-enforced under `/api/admin/reports`.

Schema addition: `content_reports`, with reporter, target type/id or username, reason, details, status, admin note, resolver, resolution timestamp, and creation timestamp. The app startup verifies this operational schema with safe `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` statements.

Do not commit `.env`, invite codes, database URLs, backup files, report exports, or moderation data dumps. The production `.env` remains private.

### v2.7 Admin Audit Logs

ByteSpace records admin moderation actions in `admin_audit_logs` so the site owner can see who did what, when, and why. Audit entries include the admin user, action, target type, target id or username, summary, optional sanitized metadata, and timestamp.

Logged actions:

- `suspend_user`
- `unsuspend_user`
- `delete_comment`
- `delete_bulletin`
- `update_report_status`

Admins view logs from `/admin` or the admin-only API. Logged-out users receive `401`; non-admin users receive `403`. Audit metadata is intentionally small and sanitized. Do not log invite codes, session secrets, database URLs, password hashes, raw environment values, full request bodies, or other secrets.

Admin audit routes:

```text
GET /api/admin/audit-logs
GET /api/admin/audit-logs/:id
```

Supported filters: `limit`, `action`, `targetType`, and `adminUsername`.


### v2.8 Profile Polish and Retro Customization

ByteSpace profiles now include a short plain-text status message, public profile stats, and display-only badges. Users edit the status message from `/profile/edit`; it is capped at 120 characters and rendered as normal React text.

Public profile polish:

- Status line near the profile header and sidebar identity.
- Stats box for accepted friend count, guestbook comment count, bulletin count, and joined date.
- Display-only badges for admins, new members, and founder/early users.
- Clearer empty states for guestbook comments, Top 8, bulletins, and missing avatar/background images.
- Extra retro theme presets: Neon Mall, Vaporwave, Terminal Green, Pink Glitter, Dark Arcade, and Blue GeoCities.

Schema/runtime notes:

- Fresh schema includes `profiles.status_message TEXT`.
- v2.8.1 uses `profiles.status_message` directly in production. The old `profile_status_messages` compatibility table may still exist for one release, but normal runtime code no longer reads from or writes to it.
- Badges are derived server-side from `users.is_admin`, `users.created_at`, and low user IDs. Users cannot self-assign badges.

Safety notes: status messages and other user profile text are plain text only. ByteSpace still does not support raw custom CSS, untrusted HTML, or profile script injection. Do not commit `.env`, invite codes, database URLs, backups, or moderation exports.


### v2.8.1 Profile Status Schema Cleanup

ByteSpace now reads and writes profile status messages directly from `profiles.status_message`. The legacy `profile_status_messages` compatibility table is intentionally not dropped in this patch, but it is unused by normal runtime code and can be considered for removal in a later migration after backup verification.

Startup still checks `profiles.status_message` with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so fresh or lagging databases have the expected column. Do not commit `.env`, invite codes, database URLs, or backup artifacts.


### v2.9 Notifications

ByteSpace now has simple database-backed notifications. This is polling/fetch based only; there are no websockets, background workers, push notifications, or external queues in this milestone.

Notification events currently created:

- `friend_request_received` when a user receives a friend request.
- `friend_request_accepted` when a request is accepted.
- `profile_comment` when someone else signs a user's guestbook.
- `friend_bulletin` when an accepted friend posts a bulletin.

Notification API routes require login and only operate on the current user's notifications:

```text
GET /api/notifications
GET /api/notifications/unread-count
PUT /api/notifications/:id/read
PUT /api/notifications/read-all
```

Notifications render as plain React text. Links are generated by the server as internal ByteSpace paths. Notification helper failures are logged and do not fail the primary user action. The system does not store invite codes, password hashes, session secrets, database URLs, raw environment values, or admin-only data in notification metadata.

Schema addition: `notifications`, with recipient user, optional actor user, type, title, body, internal link, metadata JSON, read timestamp, and creation timestamp. Runtime startup creates the table and indexes with safe `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` statements.

Frontend additions: a header unread-count badge and `/notifications` page with unread/read states, mark-read, and mark-all-read controls.


### v3.0 Profile Music Polish

ByteSpace keeps profile music nostalgic without hosting audio. Users can save plain-text song metadata and a normal external music link:

- `profile_song_title`
- `profile_song_artist`
- `profile_song_url`

The public profile **Now Playing** box now shows title, artist, detected service, and a safe external music link. The editor preview shows the same summary before saving.

Supported display-only service detection:

- YouTube
- Spotify
- SoundCloud
- Bandcamp
- Apple Music
- Other link

URL validation remains server-side. Empty URLs are allowed. Non-empty URLs must be valid `http://` or `https://` links, must stay within the 500 character limit, and must not include credentials or unsupported schemes such as `javascript:`, `data:`, `file:`, or `vbscript:`.

Safe YouTube previews are supported only for known YouTube watch/share/short/embed URL shapes. ByteSpace converts the video id into a fixed `https://www.youtube-nocookie.com/embed/VIDEO_ID` iframe with no autoplay. Users cannot paste raw iframe/embed HTML, scripts, or custom embed code. The server never fetches user-provided music URLs and no external API keys are used.






### v3.9 Account Settings

ByteSpace v3.9 expands `/settings` into a safe account settings area while preserving existing privacy and block controls.

Account APIs:

* `GET /api/account/settings` returns safe account basics and browse-directory preferences for the logged-in user.
* `PUT /api/account/preferences` updates browse-directory preference booleans.
* `PUT /api/account/password` changes the logged-in user's password after verifying the current password.

Schema additions on `profiles`:

* `show_in_directory BOOLEAN NOT NULL DEFAULT TRUE`
* `show_music_in_directory BOOLEAN NOT NULL DEFAULT TRUE`
* `show_status_in_directory BOOLEAN NOT NULL DEFAULT TRUE`

Browse preference behavior:

* `show_in_directory=false` excludes the account from `/browse` discovery results only.
* `show_music_in_directory=false` hides the profile music indicator on browse cards only.
* `show_status_in_directory=false` hides the status message on browse cards and status-message search only.
* Known public profile URLs continue to obey the existing profile visibility settings; this is not a private-profile toggle.

Password changes require the current password, require a new password of at least 8 characters, use the existing bcrypt hashing pattern, keep the current session active, and never return or log password hashes.

Safety notes: settings routes require login, users can only update their own account, preference values are strict booleans, invite-only registration is unchanged, and no password hashes, invite codes, session data, admin-only data, `.env`, or `/etc/bytespace/backup.env` are exposed.

### v3.8 Profile Discovery Polish

ByteSpace v3.8 improves `/browse` into a safer retro profile directory. Users can search by username, display name, or status message, and the search state is reflected in query parameters such as `/browse?q=keith`.

Discovery controls:

* Sort by Newest, Recently Updated, or Username A-Z.
* Filter to profiles with profile music.
* Filter to profiles with a status message.
* Empty search returns the normal browse directory.

The existing public endpoint `GET /api/users/search` now accepts safe allowlisted parameters: `q`, `sort`, `hasMusic`, and `hasStatus`. Invalid sort values return a clear error. Results are limited and use parameterized SQL.

Profile cards expose public-safe fields only: avatar, display name, username, headline, mood, status message, layout hint, joined/updated dates, profile music indicator, friend count, friend status, and profile link. Suspended users are excluded from browse results. The endpoint does not return email, password hashes, invite data, reports, audit logs, session data, or admin-only metadata.

Public profiles also include a subtle link back to Browse. Mobile browse controls stack cleanly and cards avoid horizontal overflow.

Safety notes: invite-only registration, admin checks, reports, audit logs, notifications, backups, and production environment files are unchanged. `/opt/bytespace/server/.env` and `/etc/bytespace/backup.env` remain private.

### v3.7 Admin Moderation Polish

ByteSpace v3.7 polishes the admin dashboard at `/admin` without changing public auth behavior or exposing admin data. The page now uses clearer moderation sections for Overview, Reports, Users, Audit Logs, Recent Signups, Recent Comments, and Recent Bulletins.

Admin API addition:

* `GET /api/admin/summary` returns admin-only aggregate counts for total users, suspended users, open reports, and recent signups/comments/bulletins.

Moderation polish:

* Overview summary cards make the admin page easier to scan.
* Report rows show status badges, reporter/target metadata, reason, preview, note, and clear actions for reviewed, dismissed, or action taken.
* User rows show admin and suspended badges, joined date, profile link, and clearer suspend/unsuspend actions.
* Audit logs show action/target badges, actor username, target info, metadata preview, and action/target/actor filters.
* Self-suspension remains blocked server-side and is also guarded in the UI.
* Mobile admin sections stack into cards with tap-friendly buttons.

Safety notes: all admin routes still require a logged-in admin, no password hashes or secrets are returned, audit metadata remains sanitized, and `.env` plus `/etc/bytespace/backup.env` must remain private.

### v3.6 Onboarding Welcome Flow

ByteSpace v3.6 adds a guided first-run welcome flow for newly invited users. New users can visit `/welcome` after registration or login to get a short tour of profiles, themes, layouts, section ordering, profile music, browsing, friends, bulletins, notifications, and safety tools.

Schema additions on `users`:

* `onboarding_completed_at TIMESTAMPTZ`
* `last_seen_onboarding_step VARCHAR(40)`

API routes:

* `GET /api/onboarding/status` returns the logged-in user's onboarding state.
* `PUT /api/onboarding/complete` marks onboarding complete for the logged-in user.
* `PUT /api/onboarding/step` stores the last viewed onboarding step.

Existing users are treated as already onboarded during schema/seed backfill so established accounts are not forced through the flow. New registrations remain incomplete until the user finishes onboarding. The dashboard shows a Getting Started checklist while onboarding is incomplete, and users can skip the tour without marking it complete.

Safety notes: onboarding routes require login, users can only update their own onboarding state, no invite code is exposed, no admin-only data is exposed, and all text is rendered as normal React text. Production `.env` and `/etc/bytespace/backup.env` remain private and must never be committed or printed.

### v3.5 Profile Section Ordering

ByteSpace v3.5 lets users choose the order of major public profile sections from `/profile/edit`. The section order is stored as `profiles.section_order JSONB` when the column exists, and the server falls back to the default order for missing or legacy data.

Allowed section keys:

- `about`
- `interests`
- `music`
- `friends`
- `bulletins`
- `comments`

The editor uses Up/Down buttons plus Reset to Default. Missing sections are appended in default order for resilience. Unknown section keys and duplicate keys are rejected server-side. Public profiles render the same existing sections in the saved order; no arbitrary component names, raw HTML, raw CSS, JavaScript, or custom labels are accepted. Layout presets and mobile stacking remain compatible.

Do not print or commit `/opt/bytespace/server/.env`, `/etc/bytespace/backup.env`, AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

### v3.4 Public Landing Page Polish

ByteSpace v3.4 improves the logged-out homepage while preserving the logged-in dashboard at `/`. The public landing page now explains ByteSpace as an invite-only retro social profile space with custom profiles, themes, layouts, profile music, friends, Top 8, bulletins, comments, notifications, and safety tools.

The landing page includes clear Log In, Register with Invite, and Browse Profiles links plus explicit invite-only messaging. It uses a static mock profile preview (`byteghost`) and does not fetch private user data, expose invite codes, expose admin-only data, or add tracking/analytics.

The page remains mobile-friendly: hero content stacks, feature cards collapse, buttons are tap-friendly, and the mock profile panel does not overflow. Do not print or commit `/opt/bytespace/server/.env`, `/etc/bytespace/backup.env`, AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

### v3.3 Theme Customization Polish

ByteSpace v3.3 improves `/profile/edit` theme controls while keeping customization preset-based and safe. The editor groups controls into Theme preset, Colors, Font, Background image behavior, and Preview sections. Preset cards now show descriptions, swatches, and selected state.

Supported safe controls:

- hex colors for background, text, box/card, border, and header/accent
- safe font allowlist: System Retro, Comic Sans Chaos, Courier Terminal, Verdana Classic, Georgia Diary, Trebuchet Web, Tahoma Portal, and Times New Roman Zine
- background repeat: `repeat`, `no-repeat`, `repeat-x`, `repeat-y`
- background size: `auto`, `cover`, `contain`
- background position: `center`, `top`, `bottom`, `left`, `right`

Server validation rejects arbitrary CSS strings, unsupported font values, and unsupported background behavior values. Hex colors may be `#000000` or shorthand like `#fff`, which the server normalizes before saving. Public profile theme rendering uses sanitized allowlisted values so older bad data falls back to safe defaults.

No raw CSS, raw HTML, JavaScript, user-provided embeds, or arbitrary CSS property editing was added. Do not print or commit `/opt/bytespace/server/.env`, `/etc/bytespace/backup.env`, AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

### v3.2 Profile Layout Customization

ByteSpace v3.2 adds safe profile layout presets. Users choose a structure from `/profile/edit`; the value is stored in `profiles.layout_preset` and applied on public profiles as a CSS class. There is no raw HTML, raw CSS, JavaScript injection, draggable editor, or user-provided style string.

Supported layout presets:

- `classic` - current/default ByteSpace layout
- `compact` - tighter spacing for short profiles
- `wide` - wider main content area
- `sidebar_left` - profile info on the left, content on the right
- `sidebar_right` - content on the left, profile info on the right
- `spotlight` - larger hero/status/music emphasis

All presets stack to a single-column layout on mobile so profile music embeds, stats, comments, bulletins, reports, badges, and notification links remain usable. Invalid layout values are rejected server-side. Missing layout values fall back to `classic`.

Schema addition: `profiles.layout_preset VARCHAR(40) NOT NULL DEFAULT 'classic'`. Startup keeps the column present with safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Do not print or commit `/opt/bytespace/server/.env`, `/etc/bytespace/backup.env`, AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

### v3.1.2 Active S3 Backup Documentation

ByteSpace v3.1.2 documents that production offsite S3 backups are active and tested. Local backups continue to live in `/opt/bytespace-backups` with 7-day retention, while S3 backups use the `bytespace/YYYY-MM-DD/` prefix in `bytespace-backups-keith-2026` and rely on an S3 Lifecycle rule for remote 7-day retention.

No application behavior changed. Do not print or commit `/opt/bytespace/server/.env`, `/etc/bytespace/backup.env`, AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

### v3.1 Mobile Polish

ByteSpace v3.1 improves phone and small-screen usability while keeping the retro profile-page style intact. This pass changes responsive layout and spacing only; it does not change auth, invite-only registration, admin permissions, reports, audit logs, notifications logic, backups, or deployment configuration.

Responsive improvements:

- Header/nav wraps into comfortable tap targets on small screens.
- Page shells and auth panels no longer rely on fixed desktop widths under mobile breakpoints.
- Profile pages stack sidebar and main content, scale avatars/backgrounds, keep badges/stats readable, and keep YouTube music previews responsive.
- Edit profile, login, register, comments, bulletins, reports, settings, and upload controls use full-width inputs/buttons where needed.
- Admin sections, reports, audit logs, notification cards, dashboard panels, and friend/comment/bulletin lists stack cleanly on mobile.

Breakpoints are centered around `768px` and `480px`. The app remains intentionally loud and nostalgic; the goal is usability without turning ByteSpace into a modern SaaS dashboard.

## Next Pass

The next pass should continue tightening social profile workflows and production operations.
