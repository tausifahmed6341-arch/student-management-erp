# ERP Nexus: local and production setup

## 1. Local development

1. Install PostgreSQL 16+ and create a database named `erp_nexus`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a randomly generated `JWT_SECRET`, and `APP_ORIGIN=http://localhost:3000`.
3. Run `npm.cmd install --cache .npm-cache` and then `npm.cmd run dev`. On this Windows machine, use `npm.cmd` because PowerShell blocks `npm.ps1`.
4. The first connection creates the `erp_records` table and imports demo data once. Future restarts load the same records.

## 2. Production deployment

1. Provision managed PostgreSQL with encrypted connections, automated backups, and a restricted application user.
2. Set `NODE_ENV=production`, `DATABASE_URL`, a unique 48+ byte `JWT_SECRET`, `APP_ORIGIN` to the HTTPS website address, and `SEED_DEMO_DATA=false` for a clean deployment.
3. Put the application behind HTTPS (Nginx, Caddy, Cloudflare, or a platform load balancer). Do not expose PostgreSQL to the public internet.
4. Build with `npm.cmd run build` and run with `npm.cmd start` under a service manager such as PM2, Docker, systemd, or your cloud platform.
5. Create real administrator accounts through a protected onboarding flow; remove or reset all demo accounts before granting user access.

## 3. Pending external integrations

- Payments: use Razorpay, Stripe, PayU, or your institution's gateway. Only webhook-verified transactions should create successful fee payments.
- Notifications: add transactional email/SMS/push providers and a scheduled worker for overdue and attendance checks.
- Android biometric app: authenticate every enrolled device with its own rotating credential, then submit signed events to a dedicated gateway endpoint. Never send raw biometric templates to this web API.
- Offline AI: use Ollama only on managed local hardware or a private network. Add a server-side policy/filter layer and role-scoped ERP context before exposing it to users.
