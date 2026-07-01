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

## Next Pass

The next pass should add cloud storage (e.g. S3-compatible) to replace local uploads, then continue tightening social profile workflows.
