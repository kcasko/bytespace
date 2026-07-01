# ByteSpace Security Notes

ByteSpace is a demo-ready retro social app, not a fully hardened public platform yet.

## Current Hardening

- Helmet provides baseline HTTP security headers.
- Content Security Policy is deferred until it can be tested against uploads, local dev, and external profile-song links.
- JSON request bodies are limited to `100kb`.
- Avatar uploads are limited to 2 MB.
- Background uploads are limited to 5 MB.
- Uploads allow jpeg, png, webp, and gif only. SVG is rejected.
- Upload filenames are random hex names with safe extensions.
- Rate limiting is applied to login/register, major write routes, and image uploads.
- Unknown `/api` routes return JSON 404 responses.
- Production API error responses avoid stack traces.

## Deployment Requirements

- Use HTTPS.
- Set a strong `SESSION_SECRET`.
- Set `TRUST_PROXY=true` behind a reverse proxy or managed platform.
- Set `CLIENT_ORIGIN` to the exact frontend origin.
- Do not use wildcard CORS with credentials.
- Keep `UPLOADS_DIR` persistent and backed up.
- Remove or change seeded demo credentials before public use.
- Do not expose `.env` files.

## Known Gaps

- No email verification.
- No password reset.
- No formal database migration tool.
- No object storage for multi-instance uploads.
- Rate limiting is basic and should not be treated as complete abuse prevention.
