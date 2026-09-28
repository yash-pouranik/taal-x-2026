# Navratri QR-Based Prop Distribution System

A production-ready web application for managing Navratri prop distribution for 800–1,100 registered participants over 9 days. Replaces physical cards with unique QR codes and a staff scanner portal.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS |
| Auth | next-auth v4 (credentials, JWT) |
| Database | MongoDB + Mongoose |
| QR Generation | `qrcode` |
| QR Scanning | `html5-qrcode` |
| Timezone | `date-fns-tz` (always `Asia/Kolkata`) |

---

## Setup

### 1. Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm

### 2. Clone and install

```bash
git clone <repo>
cd taal-x-2026
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/navratri-distribution
NEXTAUTH_SECRET=your-very-long-random-secret
NEXTAUTH_URL=http://localhost:3000

ADMIN_NAME=Admin
ADMIN_EMAIL=admin@yourorg.com
ADMIN_PASSWORD=choose-a-strong-password
```

Generate a strong `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Seed initial admin

```bash
npm run seed:admin
```

This creates the admin account and default event config (Oct 1–9 2026).

### 5. Run development server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | Full URL of the app (e.g. `https://yourdomain.com`) |
| `ADMIN_NAME` | Seed only | Admin display name |
| `ADMIN_EMAIL` | Seed only | Admin login email |
| `ADMIN_PASSWORD` | Seed only | Admin initial password |
| `NODE_ENV` | Auto | `development` or `production` |

---

## Database Setup

MongoDB collections are created automatically by Mongoose when the app first starts.

### Required indexes (auto-created by Mongoose):

| Collection | Index | Type |
|------------|-------|------|
| `users` | `email` | unique |
| `participants` | `qrTokenHash` | unique |
| `participants` | `participantId` | unique |
| `participants` | `name, fatherName` | text (search) |
| `claims` | `participantId + distributionDate` | **compound unique** |
| `claims` | `distributionDate` | index |

The `claims` compound unique index is the core integrity mechanism that prevents double-claiming, even under concurrent requests.

---

## Admin Setup Checklist

Before the event:

1. Login as admin → `/admin/dashboard`
2. **Set event dates** → `/admin/config` (e.g. Oct 1–9 2026)
3. **Register all participants** → `/admin/participants/register`
4. **Download/print QR cards** for each participant
5. **Create staff accounts** → `/admin/staff`
6. Share staff login credentials
7. **Test** with one dummy participant:
   - Staff logs in → Scans QR → Verifies → Gives prop
   - Try scanning same QR again → should say "Already collected"

---

## Operational Usage

### Each Navratri Day

1. Staff logs in to the portal
2. Clicks **SCAN QR**
3. Camera opens — scan participant's QR card
4. Verification screen shows: **Name**, **Father's Name**, **Day**, **Status**
5. Staff visually confirms → clicks **GIVE PROP**
6. Success screen shown

### If QR card is lost/damaged

1. Admin → Participant detail page
2. Click **Regenerate QR** → old QR becomes invalid
3. Print new card for participant

---

## Deployment

### Docker (recommended for VPS)

```bash
# Build and start
docker-compose up -d

# Seed admin (first time only)
docker-compose exec app npx tsx scripts/seed-admin.ts

# View logs
docker-compose logs -f app
```

Set these in your environment before `docker-compose up`:
```bash
export NEXTAUTH_SECRET="your-secret"
export NEXTAUTH_URL="https://yourdomain.com"
```

Or create a `.env` file in the project root (not `.env.local`).

### Manual (without Docker)

```bash
npm run build
npm start
```

Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start npm --name "navratri" -- start
pm2 startup
pm2 save
```

### Nginx reverse proxy (example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Security Notes

- QR tokens are never stored — only their SHA-256 hash is in the DB
- Dates are always determined server-side using `Asia/Kolkata` timezone
- Claims use a database-level unique constraint (not application-level check)
- HTTP-only cookies for session tokens in production
- Role-based middleware protects all admin routes
- Rate limiting is enforced on auth and claim endpoints

---

## Backup

```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/navratri-distribution" --out=./backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/navratri-distribution" ./backup/20261001
```

With Docker:
```bash
docker-compose exec mongo mongodump --out=/backup
docker cp navratri-mongo:/backup ./mongo-backup
```

---

## Roles

| Feature | Admin | Staff |
|---------|-------|-------|
| Register participants | ✅ | ❌ |
| View participants | ✅ | ❌ |
| Download/print QR | ✅ | ❌ |
| Regenerate QR | ✅ | ❌ |
| Scan QR | ✅ | ✅ |
| Give prop | ✅ | ✅ |
| View stats | ✅ | Basic |
| Manage staff | ✅ | ❌ |
| Configure dates | ✅ | ❌ |
| Export reports | ✅ | ❌ |

---

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/participants` | GET | Any | List/search participants |
| `/api/participants` | POST | Admin | Register participant |
| `/api/participants/:id` | GET | Admin | Participant + claim history |
| `/api/participants/:id` | PUT | Admin | Edit participant |
| `/api/participants/:id/qr` | GET | Admin | Download QR |
| `/api/participants/:id/qr` | POST | Admin | Regenerate QR |
| `/api/claims/verify` | POST | Any auth | Verify QR scan |
| `/api/claims/confirm` | POST | Any auth | Confirm distribution |
| `/api/config` | GET | Any auth | Get event config |
| `/api/config` | PUT | Admin | Update event dates |
| `/api/admin/stats` | GET | Admin | Dashboard stats |
| `/api/admin/staff` | GET/POST | Admin | List/create staff |
| `/api/admin/staff/:id` | PUT/DELETE | Admin | Edit/delete staff |
| `/api/reports/participants` | GET | Admin | CSV export |
| `/api/reports/distribution` | GET | Admin | CSV export |

---

## License

Private — for internal use by the organizing committee only.
