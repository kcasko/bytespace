# ByteGeist Homelab Deployment Runbook

Target: `https://bytespace.casko.dev`

This runbook deploys ByteSpace on an Ubuntu VPS or ByteGeist homelab using PostgreSQL, Node.js, and Nginx Proxy Manager. It does not use Docker for the app. Express serves `client/dist`, `/api`, and `/uploads` in `NODE_ENV=production`.

Do not commit `.env` files or real secrets. Replace every `REPLACE_WITH_*` value before starting the service.

## 1. Server Prerequisites

Install or confirm:

- Ubuntu VPS or homelab host
- Node.js LTS and npm
- PostgreSQL
- git
- Nginx Proxy Manager reachable on the network
- A DNS record for `bytespace.casko.dev` pointing at the proxy
- Let's Encrypt certificate issued through Nginx Proxy Manager

Example Ubuntu packages:

```bash
sudo apt update
sudo apt install -y git postgresql postgresql-contrib
node --version
npm --version
psql --version
```

Use Node.js 20 or newer. If Ubuntu's packaged Node is old, install Node LTS from NodeSource or your normal homelab package source.

## 2. Suggested Directory

Use:

```bash
/opt/bytespace
```

Clone the repository:

```bash
sudo git clone https://github.com/kcasko/bytespace.git /opt/bytespace
sudo chown -R "$USER":"$USER" /opt/bytespace
cd /opt/bytespace
```

## 3. Install Dependencies

From the repo root:

```bash
cd /opt/bytespace
npm install
cd client
npm install
cd ../server
npm install
cd ..
```

The root scripts are convenience wrappers. The actual runtime dependencies live in `client/` and `server/`.

## 4. PostgreSQL Setup

Create the database and app user.

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE DATABASE bytespace;
CREATE USER bytespace_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE bytespace TO bytespace_user;
\c bytespace
GRANT ALL ON SCHEMA public TO bytespace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bytespace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bytespace_user;
\q
```

Load the schema from the repo root:

```bash
cd /opt/bytespace
psql -d bytespace -f database/schema.sql
```

Optional demo seed:

```bash
psql -d bytespace -f database/seed.sql
```

`seed.sql` creates the Keith demo login with the documented development password. Do not keep that password on a public deployment. Change it, delete the seeded account, or create a fresh demo account before sharing the URL.

If local peer authentication blocks `psql -d bytespace`, run the schema as postgres:

```bash
sudo -u postgres psql -d bytespace -f /opt/bytespace/database/schema.sql
sudo -u postgres psql -d bytespace -f /opt/bytespace/database/seed.sql
```

## 5. Server Environment

Create:

```bash
nano /opt/bytespace/server/.env
```

Template only:

```env
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://bytespace.casko.dev
DATABASE_URL=postgres://bytespace_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/bytespace
SESSION_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
TRUST_PROXY=1
SESSION_COOKIE_SAMESITE=lax
UPLOADS_DIR=uploads
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
WRITE_RATE_LIMIT_WINDOW_MS=900000
WRITE_RATE_LIMIT_MAX=60
UPLOAD_RATE_LIMIT_WINDOW_MS=900000
UPLOAD_RATE_LIMIT_MAX=30
REGISTRATION_MODE=invite
ALLOW_REGISTRATION=true
INVITE_CODE=REDACTED_PRIVATE_INVITE_CODE
```

Notes:

- `SESSION_SECRET` should be at least 32 random characters.
- Use HTTPS through Nginx Proxy Manager.
- Same-origin frontend/backend at `bytespace.casko.dev` should work with `SESSION_COOKIE_SAMESITE=lax`.
- If the frontend and backend are split across different domains later, cookie settings may need `SESSION_COOKIE_SAMESITE=none` plus HTTPS secure cookies.
- `TRUST_PROXY=1` is required because production cookies sit behind the reverse proxy.

Generate a session secret:

```bash
openssl rand -base64 48
```

### Registration Mode

ByteSpace registration is controlled by private server environment variables:

- `REGISTRATION_MODE=open` keeps public registration open.
- `REGISTRATION_MODE=disabled` blocks registration.
- `REGISTRATION_MODE=invite` requires a matching `INVITE_CODE`.
- `ALLOW_REGISTRATION=false` blocks registration for compatibility with older config.

Production should use `REGISTRATION_MODE=invite` or `REGISTRATION_MODE=disabled`. If `REGISTRATION_MODE` is missing, production defaults to disabled registration; development defaults to open registration. The actual `INVITE_CODE` must stay only in `/opt/bytespace/server/.env` or another private environment source and must never be printed, committed, or copied into docs.

Example production config with the secret redacted:

```env
REGISTRATION_MODE=invite
ALLOW_REGISTRATION=true
INVITE_CODE=REDACTED_PRIVATE_INVITE_CODE
```

To change modes safely:

1. Edit `/opt/bytespace/server/.env` on the server.
2. Restart `bytespace.service`.
3. Verify `curl http://127.0.0.1:5000/api/health`.
4. Test registration behavior without exposing the invite code.

## 6. Build Client

From the repo root:

```bash
cd /opt/bytespace
npm run build
```

This creates `client/dist`. In production mode, Express serves that directory and falls back to `index.html` for frontend routes.

## 7. Start Production Manually

From the repo root:

```bash
cd /opt/bytespace
NODE_ENV=production npm start
```

The app should listen on port `5000`.

Quick local checks on the server:

```bash
curl http://127.0.0.1:5000/api/health
curl http://127.0.0.1:5000/api/db/health
curl -I http://127.0.0.1:5000/
```

Stop the manual process before installing systemd.

## 8. Process Manager With systemd

### Simple Root Version

This is the quickest version. It works, but a dedicated Linux user is cleaner.

Create:

```bash
sudo nano /etc/systemd/system/bytespace.service
```

Service:

```ini
[Unit]
Description=ByteSpace production server
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/bytespace
EnvironmentFile=/opt/bytespace/server/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bytespace
sudo systemctl start bytespace
sudo systemctl status bytespace
```

Logs:

```bash
journalctl -u bytespace -f
```

### Better Dedicated User Version

Create a service user:

```bash
sudo adduser --system --group --home /opt/bytespace bytespace
sudo chown -R bytespace:bytespace /opt/bytespace
```

Use the same service file, but set:

```ini
User=bytespace
Group=bytespace
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart bytespace
```

If npm is not at `/usr/bin/npm`, check:

```bash
which npm
```

Then update `ExecStart`.

## 9. Nginx Proxy Manager

Create a Proxy Host:

- Domain Names: `bytespace.casko.dev`
- Scheme: `http`
- Forward Hostname / IP: `172.20.0.1` for the live ByteGeist Docker NPM setup
- Forward Port: `5000`
- Cache Assets: off unless you know what you are caching
- Block Common Exploits: on
- Websockets Support: off unless needed later

Important: when Nginx Proxy Manager runs in Docker, `127.0.0.1` points at the NPM container, not the VPS host. Using `127.0.0.1` caused a `504 Gateway Time-out`. The working upstream for the live deployment is `http://172.20.0.1:5000`.

SSL tab:

- Request a new Let's Encrypt certificate
- Force SSL: on
- HTTP/2 Support: on if available
- HSTS: optional after confirming HTTPS works

The public app should be:

```text
https://bytespace.casko.dev
```

The public health checks should be:

```text
https://bytespace.casko.dev/api/health
https://bytespace.casko.dev/api/db/health
```

## 10. Upload Persistence

Default uploads live at:

```text
/opt/bytespace/server/uploads
```

Rules:

- This directory must persist between deploys.
- Back up `/opt/bytespace/server/uploads`.
- Do not wipe uploads during deploys.
- Do not commit uploaded files to git.
- Future object storage is recommended if ByteSpace becomes public or multi-server.

Create the directory if needed:

```bash
mkdir -p /opt/bytespace/server/uploads/avatars
mkdir -p /opt/bytespace/server/uploads/backgrounds
```

## 11. Update And Deploy A New Version

```bash
cd /opt/bytespace
git pull
npm install
cd client
npm install
cd ../server
npm install
cd ..
npm run build
sudo systemctl restart bytespace
sudo systemctl status bytespace
```

Check logs if restart fails:

```bash
journalctl -u bytespace -n 100 --no-pager
```

## Live v2.3 Deployment State

Current production deployment:

- URL: `https://bytespace.casko.dev`
- Host: `bytegeist-cloud`
- OS: Ubuntu 24.04.4 LTS
- App path: `/opt/bytespace`
- Production env file: `/opt/bytespace/server/.env`
- systemd service: `bytespace.service`
- Node app listens on host port `5000`
- Nginx Proxy Manager runs in Docker
- NPM proxy target: `http://172.20.0.1:5000`
- Health checks: `/api/health` and `/api/db/health`

Do not print, copy, commit, or document the real contents of `/opt/bytespace/server/.env`. It contains production secrets and must stay private on the server.

The prior `504 Gateway Time-out` was caused by using `127.0.0.1` as the NPM upstream. Inside the NPM container, `127.0.0.1` is the container itself, not the VPS host. The Docker network gateway must be used instead.

UFW allows the NPM Docker network to reach the Node app:

```text
allow from 172.20.0.0/16 to any port 5000 proto tcp
```

PostgreSQL and upload backups were created during deployment. Backup artifacts must stay out of git; `.gitignore` ignores local backup artifacts.

### Admin Bootstrap and Moderation

ByteSpace v2.5 adds backend-enforced admin moderation. The admin page is available at:

```text
https://bytespace.casko.dev/admin
```

Admin API routes live under `/api/admin/*` and require a logged-in user with `users.is_admin = true`. Non-authenticated users receive `401`; logged-in non-admin users receive `403`. Password hashes, session secrets, database URLs, invite codes, and production `.env` values must never be exposed.

Apply the v2.5 user-column migration first:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
```

To grant admin status manually, connect to PostgreSQL on the VPS and update the intended account:

```bash
sudo -u postgres psql -d bytespace
```

```sql
UPDATE users SET is_admin = true WHERE username = 'your_username';
```

To remove admin status later:

```sql
UPDATE users SET is_admin = false WHERE username = 'your_username';
```

Suspension sets `users.suspended_at` and optional `users.suspension_reason`. Suspended users cannot log in or use protected write actions. Admins can unsuspend users from `/admin` or with SQL if needed:

```sql
UPDATE users
SET suspended_at = NULL, suspension_reason = NULL
WHERE username = 'their_username';
```

Moderation capabilities in v2.5:

- list users
- view recent signups
- view recent comments and bulletins
- suspend or unsuspend users
- delete comments
- delete bulletins

Do not edit or print `/opt/bytespace/server/.env` while performing admin bootstrap.

### User Reports and Safety Review

ByteSpace v2.6 adds a `content_reports` table and report workflow. Logged-in users can report:

- profiles
- comments
- bulletins

User route:

```text
POST /api/reports
```

Admin routes:

```text
GET /api/admin/reports
GET /api/admin/reports/:id
PUT /api/admin/reports/:id/status
```

Allowed report statuses are `open`, `reviewed`, `dismissed`, and `action_taken`. Admins review reports at `/admin`, can add an admin note while changing status, and can use existing moderation actions from report context: suspend user, delete comment, or delete bulletin.

The app verifies the reporting schema at startup with safe `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements. Do not print, copy, or commit `/opt/bytespace/server/.env`. Do not commit backup artifacts, report exports, invite codes, database URLs, or moderation dumps.

### Admin Audit Logs

ByteSpace v2.7 records moderation actions in `admin_audit_logs`. Admins can review logs at `/admin` or through:

```text
GET /api/admin/audit-logs
GET /api/admin/audit-logs/:id
```

Logged actions include suspending users, unsuspending users, deleting comments, deleting bulletins, and changing report status/admin notes. The audit table stores admin id, action, target type, target id or username, summary, sanitized metadata, and creation time.

Security notes:

- Audit APIs require backend admin authorization.
- Logs must not contain invite codes, session secrets, database URLs, password hashes, raw `.env` values, or full request bodies.
- `/opt/bytespace/server/.env` remains private and must not be printed, copied, or committed.
- Do not commit backups, moderation exports, or audit dumps.

## 12. Smoke Tests

Server checks:

```bash
curl https://bytespace.casko.dev/api/health
curl https://bytespace.casko.dev/api/db/health
curl -I https://bytespace.casko.dev
```

Browser checks:

1. Open `https://bytespace.casko.dev`.
2. Confirm the landing page loads.
3. Log in.
4. Confirm the dashboard loads.
5. Open `/profile/keith` or another profile.
6. Upload avatar and background images.
7. Post a guestbook comment.
8. Create and delete a bulletin.
9. Browse users.
10. Manage friends and Top 8.
11. Open settings.
12. Test block and unblock.

## 13. Backup Plan

PostgreSQL:

```bash
pg_dump bytespace > bytespace-backup.sql
```

With a timestamp:

```bash
pg_dump bytespace > "bytespace-$(date +%Y%m%d-%H%M%S).sql"
```

Uploads:

```bash
tar -czf bytespace-uploads.tar.gz /opt/bytespace/server/uploads
```

With a timestamp:

```bash
tar -czf "bytespace-uploads-$(date +%Y%m%d-%H%M%S).tar.gz" /opt/bytespace/server/uploads
```

Store backups somewhere other than the same disk if this becomes important.


### Active S3 Offsite Backups

ByteSpace has a production backup helper at:

```bash
/opt/bytespace/scripts/bytespace-backup.sh
```

It creates local backups in `/opt/bytespace-backups` and keeps 7 days of local backup files. The live cron schedule is:

```cron
0 3 * * * /opt/bytespace/scripts/bytespace-backup.sh >> /var/log/bytespace-backup.log 2>&1
```

The script creates and uploads both artifacts:

- PostgreSQL `.sql` backup
- uploads `.tar.gz` backup

Production S3 backups are enabled and tested. The current offsite target is:

```text
s3://bytespace-backups-keith-2026/bytespace/YYYY-MM-DD/
```

The live AWS config file is:

```text
/etc/bytespace/backup.env
```

That file is `root:root` with `600` permissions. It must never be printed, committed, copied into docs, or exposed. It stores AWS backup settings outside the repo. The production app env file `/opt/bytespace/server/.env` is also private and must not be printed or copied.

Install AWS CLI on a replacement host before enabling S3 uploads:

```bash
sudo apt update
sudo apt install -y awscli
aws --version
```

Minimum IAM permissions should be scoped to the backup bucket and prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/bytespace/*"
      ]
    }
  ]
}
```

Local retention and offsite retention are separate:

- local retention: `/opt/bytespace/scripts/bytespace-backup.sh` deletes local backup files older than 7 days from `/opt/bytespace-backups`
- S3 retention: the S3 Lifecycle rule deletes `bytespace/` objects older than 7 days

The manual S3 upload test passed. Verified uploaded objects from `2026-07-02`:

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

Disable S3 upload by setting this in the private `/etc/bytespace/backup.env` file:

```bash
BYTESPACE_S3_ENABLED=false
```

Do not put real AWS credentials, database passwords, production `.env` values, backup archives, or database dumps in git or docs. AWS credentials should live only in root-owned config outside the repo, such as `/etc/bytespace/backup.env`, `/root/.aws/credentials`, `/root/.aws/config`, or a managed instance role if added later.


## v2.8 Profile Polish Notes

ByteSpace v2.8 adds profile polish without changing deployment topology:

- `profiles.status_message TEXT` is part of the fresh schema.
- v2.8.1 production uses `profiles.status_message` directly. The legacy `profile_status_messages` table may still exist on the server for one release, but normal runtime code no longer reads from or writes to it.
- Users edit status messages from `/profile/edit`; the server validates a 120 character maximum.
- Public profiles show a status line, stats box, and display-only badges.
- Badges are server-derived: admin, new member, and founder/early user.
- Additional theme presets are available in the profile editor: Neon Mall, Vaporwave, Terminal Green, Pink Glitter, Dark Arcade, and Blue GeoCities.

Operational reminders:

- Restart `bytespace.service` after deploying server changes.
- Confirm `/api/health` and `/api/db/health` locally and externally.
- Keep `/opt/bytespace/server/.env` private. Do not print, commit, or copy it into docs.
- Do not commit backup artifacts from `/opt/bytespace-backups` or generated upload archives.
- Profile text remains plain React text; raw HTML and raw custom CSS are intentionally unavailable.


## v2.8.1 Profile Status Schema Cleanup

Production now stores profile status messages in `profiles.status_message` directly. The previous `profile_status_messages` compatibility table is left in PostgreSQL and should not be dropped during this release, but application queries no longer depend on it.

Deployment checks after this patch:

- Confirm `/api/profile/keith` returns the expected `statusMessage`.
- Save a status message through `/profile/edit` or the profile API.
- Confirm `/api/profile/keith` reflects the saved value.
- Keep `/opt/bytespace/server/.env` private and do not copy production secrets into docs.


## v2.9 Notifications Notes

ByteSpace v2.9 adds database-backed notifications in the existing Node/PostgreSQL deployment. No new daemon, websocket service, queue, cron job, or background worker is required.

Operational behavior:

- The app creates the `notifications` table and indexes during startup if they are missing.
- Notification routes live under `/api/notifications` and require authenticated active users.
- The frontend polls the unread-count endpoint from the header while a user is logged in.
- Notification text is plain React text and notification links are internal app paths.

Notification types:

- `friend_request_received`
- `friend_request_accepted`
- `profile_comment`
- `friend_bulletin`

Deployment verification after restart:

```bash
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

Then verify logged-out `/api/notifications` returns `401`, Keith can load `/notifications`, unread count works, and `/admin` still loads for admin moderation, reports, and audit logs.

Security reminders: keep `/opt/bytespace/server/.env` private, do not commit backups or generated dumps, and do not store secrets in notification metadata.


## v3.0 Profile Music Notes

ByteSpace v3.0 improves the existing profile song feature without adding uploads, autoplay, external API keys, or server-side URL fetching.

Behavior:

- Profile song fields remain `profile_song_title`, `profile_song_artist`, and `profile_song_url`.
- The profile page and editor preview detect common music services for display only.
- Safe YouTube previews use a controlled `youtube-nocookie.com` iframe generated from known YouTube URL formats.
- Non-YouTube music links render as normal external links with `noopener noreferrer`.
- Raw HTML embeds, arbitrary iframe code, and script URLs are not accepted.

Validation:

- Empty URL is allowed.
- Non-empty URL must be valid `http://` or `https://`.
- URL max remains 500 characters.
- Credentials in music URLs are rejected.
- Unsupported schemes such as `javascript:`, `data:`, `file:`, and `vbscript:` are rejected.

Security reminders: keep `/opt/bytespace/server/.env` private, do not add music file uploads, do not host copyrighted audio, and do not store secrets in profile music fields.







## v4.0 Direct Messages Notes

ByteSpace v4.0 adds friends-only 1-to-1 direct messages. The feature is intentionally an MVP: no group chats, no attachments/images, no voice/video, no typing indicators, no read receipts, and no websockets/realtime layer.

New schema:

* `dm_conversations`
* `dm_messages`

New API routes:

* `GET /api/dms/conversations`
* `POST /api/dms/conversations`
* `GET /api/dms/conversations/:id/messages`
* `POST /api/dms/conversations/:id/messages`
* `DELETE /api/dms/messages/:id`

Security behavior:

* All routes require login.
* Conversation/message access requires participation.
* Sending requires an accepted friendship and no block in either direction.
* Suspended users are blocked by existing auth middleware.
* Message bodies are plain text, trimmed, required, and limited to 1000 characters.
* Users can soft-delete only their own messages.
* Existing conversations may remain visible after blocking or unfriending, but sending is rejected.

Reports and notifications:

* Report target type `dm_message` is supported.
* Only DM participants can report a DM message.
* Admin reports show only the reported DM message preview, not unrelated private conversation history.
* New messages create `direct_message` notifications with a generic body.

This release does not change invite-only registration, admin permissions, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, AWS configuration, or production environment files. Do not print or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

## v3.9 Account Settings Notes

ByteSpace v3.9 adds account settings under the existing `/settings` page. It keeps existing privacy/block settings and adds safe account basics, browse-directory preferences, and password change controls.

New logged-in account API routes:

* `GET /api/account/settings`
* `PUT /api/account/preferences`
* `PUT /api/account/password`

Schema additions:

* `profiles.show_in_directory BOOLEAN NOT NULL DEFAULT TRUE`
* `profiles.show_music_in_directory BOOLEAN NOT NULL DEFAULT TRUE`
* `profiles.show_status_in_directory BOOLEAN NOT NULL DEFAULT TRUE`

Browse behavior:

* `show_in_directory=false` removes a user from `/browse` results.
* `show_music_in_directory=false` hides only the browse-card music indicator.
* `show_status_in_directory=false` hides only the browse-card status message and status-message discovery search.
* Public profile URL visibility remains controlled by existing privacy settings.

Password changes require the current password and a new password of at least 8 characters. Passwords and password hashes are never logged or returned. The current session remains active after a successful password change.

This release does not change invite-only registration, admin permissions, reports, audit logs, notifications, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, AWS configuration, or production environment files. Do not print or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

## v3.8 Profile Discovery Polish Notes

ByteSpace v3.8 improves `/browse` and the existing public/session-aware user search route. It does not change invite-only registration, admin permissions, reports, audit logs, notifications, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, AWS configuration, or production environment files.

Updated endpoint:

* `GET /api/users/search?q=&sort=&hasMusic=&hasStatus=`

Supported sort values:

* `newest`
* `updated`
* `username`

Filters:

* `hasMusic=true`
* `hasStatus=true`

The route searches username, display name, and status message. It excludes suspended users, hides blocked relationships for logged-in users as before, limits results, validates sort values server-side, and returns public-safe profile card fields only. It must not expose email, password hashes, invite codes, reports, audit logs, sessions, secrets, or admin-only metadata.

The browse page now has a stronger retro directory layout, query-param-backed search, sort/filter controls, a small New Around Here strip, richer public profile cards, and mobile-friendly stacking. Public profiles include a subtle Discover more profiles link back to `/browse`.

Do not print or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

## v3.7 Admin Moderation Polish Notes

ByteSpace v3.7 improves `/admin` usability while preserving existing server-side admin authorization. The admin dashboard now has scannable cards for Overview, Reports, Users, Audit Logs, Recent Signups, Recent Comments, and Recent Bulletins.

New admin-only endpoint:

* `GET /api/admin/summary`

The summary endpoint returns safe aggregate counts only: total users, suspended users, open reports, and recent signups/comments/bulletins. It does not expose password hashes, invite codes, session data, environment values, or backup configuration.

The report workflow now highlights status, target type, reporter, reason, created date, previews, and admin notes. User moderation displays admin/suspended badges and keeps self-suspension blocked server-side. Audit log rows are easier to scan and can be filtered by action, target type, and actor username.

This release does not change invite-only registration, admin permissions, reports schema, audit schema, notifications, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, AWS configuration, or production environment files. Do not print or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

## v3.6 Onboarding Welcome Flow Notes

ByteSpace v3.6 adds a simple logged-in onboarding flow at `/welcome` plus onboarding API routes under `/api/onboarding`. The flow is invite-friendly and explains profile setup, themes, layouts, section ordering, profile music, browsing, friends, bulletins, notifications, reporting, blocking, and privacy settings.

Schema additions:

* `users.onboarding_completed_at TIMESTAMPTZ`
* `users.last_seen_onboarding_step VARCHAR(40)`

Routes:

* `GET /api/onboarding/status`
* `PUT /api/onboarding/complete`
* `PUT /api/onboarding/step`

Existing users should be backfilled as completed so production accounts are not forced through onboarding. New invited registrations start incomplete and can finish onboarding from `/welcome`; skipping the flow does not mark it complete. If the production database user cannot alter `users`, run the documented schema update manually as the database owner and restart `bytespace`.

This release does not change invite-only registration, admin permissions, reporting, audit logs, notifications, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, AWS configuration, or production environment files. Do not print or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

## v3.5 Profile Section Ordering Notes

ByteSpace v3.5 adds safe, preset section ordering for public profiles. It adds `profiles.section_order JSONB` for existing deployments with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` when the database user has permission. If a deployment has not been migrated yet, runtime code falls back to the default order.

Allowed section keys are `about`, `interests`, `music`, `friends`, `bulletins`, and `comments`. Missing keys are appended in default order. Unknown keys and duplicate keys are rejected by the profile update route. Public profiles render existing section components in the saved order; users cannot submit raw HTML, raw CSS, JavaScript, arbitrary component names, or custom labels.

The editor uses Up/Down controls and Reset to Default. Existing layout presets, theme customization, profile music, status messages, mobile breakpoints, reports, comments, bulletins, and notifications remain compatible.

Deployment verification remains:

```bash
cd /opt/bytespace
npm run build
sudo systemctl restart bytespace
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

Safety reminders: do not print, copy, edit, or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`. Do not commit AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

## v3.4 Public Landing Page Polish Notes

ByteSpace v3.4 is a frontend public-homepage polish pass. It does not change registration mode, auth behavior, admin permissions, reports, audit logs, notifications, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, or production environment files.

The logged-out `/` page now presents ByteSpace as an invite-only retro social app with short feature cards and a static mock profile preview. The preview is fake sample content and does not fetch private user data or admin-only data. Existing logged-in users still see the dashboard at `/`.

Safety reminders: registration remains invite-only, invite codes are not exposed, no tracking scripts or third-party analytics were added, and no raw user HTML/CSS/JS is rendered. Do not print, copy, edit, or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`.

Deployment verification remains:

```bash
cd /opt/bytespace
npm run build
sudo systemctl restart bytespace
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

## v3.3 Theme Customization Polish Notes

ByteSpace v3.3 is a safe theme editor polish pass. It changes editor UI, server validation, and public theme sanitization. It does not change Nginx Proxy Manager, UFW, PostgreSQL credentials, backups, invite-only registration, admin permissions, reports, audit logs, notifications, or production environment files.

Theme controls remain allowlisted:

- colors: validated hex only, with shorthand normalized server-side
- fonts: safe allowlist only
- background repeat: `repeat`, `no-repeat`, `repeat-x`, `repeat-y`
- background size: `auto`, `cover`, `contain`
- background position: `center`, `top`, `bottom`, `left`, `right`

The editor now shows preset preview cards with color swatches and selected state. Public profiles apply sanitized values only; unknown or older invalid values fall back to safe defaults. Raw CSS, raw HTML, JavaScript, arbitrary embeds, and arbitrary style property editing remain unavailable.

Deployment verification remains:

```bash
cd /opt/bytespace
npm run build
sudo systemctl restart bytespace
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

Safety reminders: do not print, copy, edit, or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`. Do not commit AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

## v3.2 Profile Layout Customization Notes

ByteSpace v3.2 adds preset-only profile layout customization. It changes the app schema and frontend CSS, but does not change Nginx Proxy Manager, UFW, PostgreSQL credentials, backups, invite-only registration, admin permissions, reports, audit logs, or notifications.

Schema field:

```sql
profiles.layout_preset VARCHAR(40) NOT NULL DEFAULT 'classic'
```

Supported values are `classic`, `compact`, `wide`, `sidebar_left`, `sidebar_right`, and `spotlight`. Runtime startup adds the column with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing deployments. Public profiles apply the preset as a controlled CSS class; users never provide raw CSS, HTML, JavaScript, or embeds.

Mobile behavior: all presets collapse to a safe single-column layout under the existing mobile breakpoints. Sidebars stack, text wraps, and YouTube music previews remain responsive.

Deployment verification remains:

```bash
cd /opt/bytespace
npm run build
sudo systemctl restart bytespace
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

Safety reminders: do not print, copy, edit, or commit `/opt/bytespace/server/.env` or `/etc/bytespace/backup.env`. Do not commit AWS credentials, invite codes, database URLs, backup dumps, or upload archives.

## v3.1 Mobile Polish Notes

ByteSpace v3.1 is a frontend responsive-layout pass. It does not require database changes, environment changes, new services, or reverse proxy changes.

Mobile-focused pages:

- `/`
- `/login`
- `/register`
- `/profile/:username`
- `/profile/edit`
- `/admin`
- `/notifications`
- `/bulletins`
- `/friends`
- `/settings`

Deployment verification remains the normal Node build and service restart:

```bash
cd /opt/bytespace
npm run build
sudo systemctl restart bytespace
curl -i https://bytespace.casko.dev/api/health
curl -i https://bytespace.casko.dev/api/db/health
```

Safety note: this release only adjusts CSS/layout and docs. It does not change invite-only registration, admin access, reports, audit logs, notifications behavior, backups, Nginx Proxy Manager, UFW, PostgreSQL credentials, or `/opt/bytespace/server/.env`.

## 14. Rollback Plan

Use git tags.

Example rollback to v2.1:

```bash
cd /opt/bytespace
git fetch --tags
git checkout v2.1
npm install
cd client
npm install
cd ../server
npm install
cd ..
npm run build
sudo systemctl restart bytespace
```

Confirm:

```bash
curl https://bytespace.casko.dev/api/health
sudo systemctl status bytespace
```

To return to main later:

```bash
cd /opt/bytespace
git checkout main
git pull
npm run build
sudo systemctl restart bytespace
```

## 15. Final Pre-Public Checklist

- Replace all `REPLACE_WITH_*` values.
- Use a strong `SESSION_SECRET`.
- Confirm HTTPS works.
- Confirm Nginx Proxy Manager forwards to port `5000`.
- Confirm `CLIENT_ORIGIN=https://bytespace.casko.dev`.
- Confirm database health works.
- Change or remove seeded demo credentials before public access.
- Confirm uploads persist after `sudo systemctl restart bytespace`.
- Confirm backups run.
