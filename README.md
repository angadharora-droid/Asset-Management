# Centre Point Amravati — Asset Handover Register (MERN)

A full-stack rebuild of the single-file asset-handover artifact as a proper
**MERN** application: **M**ongoDB · **E**xpress · **R**eact · **N**ode.

Handover teams log every asset during the Hariganga → CPH transition. Each entry
gets an auto-generated, sequential, unique code (`CPA.<CAT>.<ITEM>.<NNNN>`),
condition/verification details, value & CAPEX/OPEX classification, custody, and
up to four photos. A live register, dashboard, and printable sign-off sheet are
generated from the shared database.

```
Asset management/
├── backend/      Express REST API + MongoDB (Mongoose)
├── frontend/     React (Vite) + Tailwind CSS single-page app
├── package.json  convenience scripts to run both together
└── README.md
```

---

## 1. Prerequisites

- **Node.js 18+** and npm
- **MongoDB** — either a local install (running on `mongodb://127.0.0.1:27017`)
  or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

## 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
#   then edit backend/.env and set MONGODB_URI if needed

# Frontend (optional — defaults work for local dev)
cp frontend/.env.example frontend/.env
```

> On Windows PowerShell use `Copy-Item backend\.env.example backend\.env`.

## 3. Install dependencies

From the project root:

```bash
npm install            # installs "concurrently" for the combined dev script
npm run install:all    # installs backend + frontend dependencies
```

(Or install each package individually: `npm install` inside `backend/` and `frontend/`.)

## 4. Run

**Both at once** (from the root):

```bash
npm run dev
```

**Or separately** (two terminals):

```bash
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the
backend, so no CORS setup is needed during development.

> **After pulling auth changes, reinstall backend deps** (adds `bcryptjs` + `jsonwebtoken`):
> `npm run install:all` (or `npm install` inside `backend/`).

### Optional: load sample data

```bash
npm run seed           # clears + inserts a few demo assets
```

---

## Authentication

Access is gated by individual accounts (JWT, bcrypt-hashed passwords) with two roles:

- **Admin** — full access, can delete assets and manage users (a **Users** screen).
- **Member** — log and update assets; no user management or delete.

On first startup, if the database has no users, an **admin is created** from
`ADMIN_EMAIL` (default `admin@centrepoint.local`). If you leave `ADMIN_PASSWORD`
blank, a **strong random password is generated and printed once** in the backend
console — copy it, log in, and change it. There is no well-known default password.

`JWT_SECRET` must be set (≥ 32 chars) in production — the server **refuses to start**
in production without it. In development, leave it blank and a random per-restart
secret is used (logins reset when the backend restarts). Generate one with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Login is rate-limited; passwords are bcrypt-hashed (cost 12) with an 8-char minimum.

Auth endpoints (`/api/auth`): `POST /login`, `GET /me`, and admin-only
`GET|POST /users`, `PATCH /users/:id`. All `/api/assets/*` routes require a valid
token; `DELETE /assets/:code` additionally requires an admin.

---

## API

Base URL: `http://localhost:5000/api`

| Method | Endpoint                                            | Purpose                                  |
| ------ | -------------------------------------------------- | ---------------------------------------- |
| GET    | `/health`                                          | Service health check                     |
| GET    | `/assets`                                          | List all assets (oldest first)           |
| GET    | `/assets/:code`                                    | Fetch one asset by code                  |
| GET    | `/assets/meta/next-code?categoryCode=&itemCode=`   | Preview the next code (no reservation)   |
| POST   | `/assets`                                          | Create an asset (server generates code)  |
| PUT    | `/assets/:code`                                    | Update an asset (identity is immutable)  |
| DELETE | `/assets/:code`                                    | Delete an asset                          |

### Code generation

Codes are issued by an atomic counter (`Counter` collection, one doc per
`CATEGORY.ITEM` key, incremented with `$inc` + `upsert`). This is concurrency-safe:
two simultaneous saves can never receive the same number — an improvement over the
original artifact's client-side counter.

### Photos

Photos are compressed client-side (max 900px wide, JPEG q0.65) and stored inline
as base64 data URLs on the asset document. The Express JSON body limit is raised
to 15 MB to accommodate them.

---

## Tech notes

**Backend** — Express 4, Mongoose 8, ES modules. Layered into
`config / models / constants / utils / controllers / routes / middleware`.
Validation (required fields, "Missing → expected location", "Damaged → remarks +
damage photo") is enforced server-side as well as in the UI.

**Frontend** — React 18 + Vite, Tailwind CSS (brand tokens — navy/gold/cream — in
`tailwind.config.js`), Axios API client, `xlsx` for Excel export. Four tabs:
New Entry · Register · Dashboard · Sign-Off. Data is loaded through the
`useAssets` hook and refreshed when each tab is opened.

## Production build

```bash
npm run build                      # outputs frontend/dist
# serve frontend/dist behind any static host / CDN, and set
# VITE_API_URL to the deployed API origin before building, e.g.
#   VITE_API_URL=https://api.example.com/api npm run build
```

Run the backend with `npm start --prefix backend` behind a process manager
(pm2/systemd) pointed at your production `MONGODB_URI`.
