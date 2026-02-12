# NexusERP (Monorepo Edition)

## Overview

NexusERP is an enterprise-grade ERP system built with a modern Monorepo architecture. It separates concerns into distinct workspaces for Frontend, Backend API, and Core Domain Logic.

## Architecture

This project uses npm workspaces:

- **`apps/web`**: React + Vite Admin Dashboard.
  - Features: Users, Roles, Inventory, Orders, Audit Logs.
  - Visuals: Data-dense tables, Sidebar navigation, Action Toolbars.
- **`apps/api`**: Serverless Backend (Cloudflare Worker Pages).
  - Features: Authentication, Transactional operations (Order -> Stock), Role-based access.
  - Database: PostgreSQL.
  - Runtime: Cloudflare Workers with TypeScript support.
- **`packages/core`**: Shared Domain Logic & Types.
  - Contains: Type definitions (`User`, `Order`, `Product`), Pure business rules (Validation, Calculation).
  - Used by both Web and API apps.

## Prerequisites

- Node.js v18+
- PostgreSQL Database
- Cloudflare CLI (`npm install -g wrangler`)
- Cloudflare Account with Workers enabled

## Setup

1. **Install Dependencies**:

    ```bash
    npm install
    ```

    This installs dependencies for all workspaces and links them.

2. **Environment Variables**:
    Create `.env` in root:

    ```env
    DATABASE_URL=postgres://user:pass@host:5432/dbname
    JWT_SECRET=your_super_secret_key
    ```

    For Cloudflare Workers, set environment variables via `wrangler.toml` or Cloudflare Dashboard:

    ```bash
    wrangler secret put DATABASE_URL
    wrangler secret put JWT_SECRET
    ```

3. **Configure Cloudflare Worker**:
    Update `wrangler.toml` with your Cloudflare settings:
    - Update `name` field to your worker name
    - Set `routes` with your domain/zone information
    - Configure `env.production.routes` for production deployment

4. **Run Locally** (Recommended Workflow):

    - **Terminal 1 (Core Watch)**:

        ```bash
        npm run dev:core
        # Watches @nexus/core for changes.
        ```

    - **Terminal 2 (API Server)**:

        ```bash
        npm run dev:api
        # Starts Cloudflare Worker (API on 8787)
        ```

    - **Terminal 3 (Frontend)**:

        ```bash
        npm run dev:web
        # Starts Vite dev server (Frontend on 5173)
        # Configure frontend API endpoint to http://localhost:8787/api
        ```

## Building & Deployment

**Build for Production**:

```bash
npm run build

```

**Deploy to Cloudflare Workers**:

```bash
# From apps/api directory
cd apps/api
npm run deploy
# Or from root
wrangler publish

```

**Preview Deployment**:

```bash
wrangler preview

```

## Database Migrations

Run SQL migrations from `database/schema.sql`:

```bash
psql $DATABASE_URL < database/schema.sql

```

Seed roles:

```bash
psql $DATABASE_URL < database/seed_roles.sql

```

Create admin user:

```bash
node scripts/create-admin-user.ts

```

## API Routes

All API routes are prefixed with `/api`:

- **Authentication**: `/api/auth/*` (login, register, change-password)
- **Products**: `/api/products/*`
- **Stock**: `/api/stock/*`
- **Orders**: `/api/orders/*` (routes to sales-orders)
- **Customers**: `/api/customers/*`
- **Suppliers**: `/api/suppliers/*`
- **Users**: `/api/users/*` (admin only)
- **Roles**: `/api/roles/*` (admin only)
- **Warehouses**: `/api/warehouses/*`
- **Purchase Orders**: `/api/purchase-orders/*`
- **Audit Logs**: `/api/audit-logs/*` (admin only)
- **Dashboard**: `/api/dashboard/*` (admin only)

## Security

- **RBAC**: Roles are managed in `apps/api/functions/roles.ts`.
- **Audit Logs**: Critical actions (Stock adjustments, User modifications) are logged via `audit_logs` table.
- **Validation**: Business rules (e.g., negative stock prevention) are enforced in `@nexus/core`.
- **Secrets**: Sensitive environment variables are managed via Cloudflare Secrets Manager.

## Troubleshooting

### Worker Not Starting

- Ensure `wrangler` is installed: `npm install -g wrangler`
- Check `wrangler.toml` configuration
- Verify Node.js version is 18+

### Database Connection Issues

- Verify `DATABASE_URL` environment variable is set correctly
- Ensure PostgreSQL server is accessible
- Check database credentials and connection string format

### Deployment Failed

- Authenticate with Cloudflare: `wrangler login`
- Verify account permissions for Workers
- Check `wrangler.toml` routes configuration
- Review deployment logs: `wrangler tail`
