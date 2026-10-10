# ResumeFlow

A personal resume workspace. Write your experience, pick a layout, add a passport-size photo, and print or save a polished PDF.

**Stack:** HTML · CSS · JavaScript (frontend) — Node.js + Express (backend) — MySQL (database)

## Features
- Own sign-up / sign-in (email + password, stored with bcrypt in MySQL)
- Resume editor: Basics, Experience, Education, Skills, Projects, with live preview and profile-strength meter
- 6 layouts: Editorial, Margin, Signal, Meridian, Horizon, Chronicle — each in 4 accent colours
- Passport-size (35 × 45 mm) profile photo in Meridian, Horizon and Chronicle
- Print / Save as PDF, night reading mode, compact editor
- Brute-force protection on sign-in, security headers, request-size limits

## Run locally
Requires **Node.js 18+** and **MySQL 5.7+ / 8** (or MariaDB 10.2+).

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env: set DB_USER, DB_PASSWORD and SESSION_SECRET
npm start
```
Open http://localhost:5000 — the database and tables are created automatically.

## Environment variables
| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | **Yes (production)** | Long random text used to sign login tokens. If missing, a temporary one is used and everyone is signed out on each restart. |
| `DATABASE_URL` | One of these two | Full connection URL, e.g. `mysql://user:pass@host:3306/dbname`. Also read from `MYSQL_URL`. |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | One of these two | Separate settings (defaults: localhost, 3306, root, empty, resumeflow). Railway's `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` also work. |
| `DB_SSL` | No | `true` if your database provider requires SSL. |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `false` only if the provider uses its own certificate authority. |
| `PORT` | No | Set automatically by hosting platforms (default 5000). |
| `TRUST_PROXY` | No | Number of proxies in front of the app (default 1). Use `0` if there is none. |

## Deploy

> **Important:** GitHub is where you store the code. **GitHub Pages cannot run this app**, because it needs a Node.js server and a MySQL database. Push the code to GitHub, then deploy that repository to a host that runs Node.js.

### 1. Put the code on GitHub
```bash
git init
git add .
git commit -m "ResumeFlow"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```
`.env` is git-ignored, so your passwords are never uploaded.

### 2. Deploy to a host (pick one)
**Railway (easiest — includes MySQL)**
1. New Project → *Deploy from GitHub repo* → choose your repository.
2. In the same project: *New* → *Database* → *MySQL*.
3. Open your app service → *Variables* and add:
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` (use your database service's name if different)
   - `SESSION_SECRET` = a long random string
4. *Settings* → *Networking* → *Generate Domain*, then open the link.

**Render (Node web service + any MySQL)**
1. New → *Web Service* → connect your GitHub repository.
2. Build command `npm install` · Start command `npm start` · Health check path `/api/healthz`.
3. Environment: `DATABASE_URL` (from your MySQL provider), `SESSION_SECRET`, and `DB_SSL=true` if the provider requires SSL.
4. Render has no managed MySQL, so use an external one (for example Railway MySQL, Aiven, or DigitalOcean Managed MySQL). Free web services sleep when idle, so the first visit after a pause is slow.

**Docker / VPS**
```bash
docker build -t resumeflow .
docker run -p 5000:5000 -e SESSION_SECRET=... -e DATABASE_URL=mysql://user:pass@host:3306/db resumeflow
```
Put it behind HTTPS (for example Nginx, Caddy or your platform's proxy).

## Project structure
```
server.js        Express API + static hosting
schema.sql       Database tables (created automatically on start)
public/          index.html, styles.css, app.js (frontend)
Dockerfile       Container build
.github/         CI check
```

## API
`POST /api/auth/sign-up` · `POST /api/auth/sign-in` · `GET /api/auth/me`
`GET /api/resume` · `PUT /api/resume` · `GET /api/resume/summary` · `GET /api/healthz`

## Troubleshooting
- **"Could not start the server"** — check your database settings; the message printed above it names the problem.
- **Signed out after every restart** — set `SESSION_SECRET`.
- **"Skipped automatic database creation" warning** — harmless; your database user just can't create databases, so the existing one is used.
- **Fonts look different offline** — fonts load from Google Fonts and need an internet connection.
