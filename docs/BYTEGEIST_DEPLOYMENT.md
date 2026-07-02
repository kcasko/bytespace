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


### Optional S3 Offsite Backups

ByteSpace has a backup helper at:

```bash
/opt/bytespace/scripts/bytespace-backup.sh
```

It creates local backups in `/opt/bytespace-backups` and keeps 7 days of local backup files by default. Local backups work without AWS configured.

The script creates and optionally uploads:

- PostgreSQL `.sql` backup
- uploads `.tar.gz` backup

Expected S3 layout when enabled:

```text
s3://BYTESPACE_BACKUP_BUCKET/bytespace/YYYY-MM-DD/
```

Install AWS CLI if S3 upload will be used:

```bash
sudo apt update
sudo apt install -y awscli
aws --version
```

Create a private config file outside the repo:

```bash
sudo mkdir -p /etc/bytespace
sudo install -m 600 /dev/null /etc/bytespace/backup.env
```

Example `/etc/bytespace/backup.env` template, with placeholders only:

```bash
BYTESPACE_S3_ENABLED=true
BYTESPACE_BACKUP_BUCKET=replace-with-bucket-name
BYTESPACE_S3_PREFIX=bytespace
BYTESPACE_BACKUP_DIR=/opt/bytespace-backups
BYTESPACE_RETENTION_DAYS=7
# Optional if local pg_dump cannot connect by database name:
# BYTESPACE_DATABASE_URL=postgres://bytespace_user:REPLACE_WITH_PASSWORD@localhost:5432/bytespace
# Optional if uploads move later:
# BYTESPACE_UPLOADS_DIR=/opt/bytespace/server/uploads
```

Do not put real AWS credentials, database passwords, or production `.env` values in git or docs. AWS credentials should live in one of these root-owned locations:

- `/root/.aws/credentials` and `/root/.aws/config`
- `/etc/bytespace/backup.env` as environment variables for a root-run backup job
- a managed instance role or equivalent provider identity, if available later

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

Manual local backup test, without S3:

```bash
cd /opt/bytespace
sudo BYTESPACE_S3_ENABLED=false ./scripts/bytespace-backup.sh
ls -lah /opt/bytespace-backups
```

Manual S3 upload test after AWS CLI and credentials are configured:

```bash
cd /opt/bytespace
sudo ./scripts/bytespace-backup.sh
sudo sh -c '. /etc/bytespace/backup.env && aws s3 ls "s3://$BYTESPACE_BACKUP_BUCKET/bytespace/$(date -u +%F)/"'
```

Verify S3 backups by confirming both objects exist for today:

```bash
sudo sh -c '. /etc/bytespace/backup.env && aws s3 ls "s3://$BYTESPACE_BACKUP_BUCKET/bytespace/$(date -u +%F)/"'
```

Disable S3 upload by setting this in `/etc/bytespace/backup.env` or by omitting the file entirely:

```bash
BYTESPACE_S3_ENABLED=false
```

S3 retention should be handled by an S3 Lifecycle rule deleting `bytespace/` objects older than 7 days. The script only enforces 7-day local retention in `/opt/bytespace-backups`.

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
