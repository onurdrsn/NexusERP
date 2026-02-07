# NexusERP (Monorepo Edition)

## Overview
NexusERP is an enterprise-grade ERP system built with a modern Monorepo architecture. It separates concerns into distinct workspaces for Frontend, Backend API, and Core Domain Logic.

## Architecture

This project uses npm workspaces:

- **`apps/web`**: React + Vite Admin Dashboard.
  - Features: Users, Roles, Inventory, Orders, Audit Logs.
  - Visuals: Data-dense tables, Sidebar navigation, Action Toolbars.
- **`apps/api`**: Serverless Backend (Netlify Functions).
  - Features: Authentication, Transactional operations (Order -> Stock), Role-based access.
  - Database: PostgreSQL.
- **`packages/core`**: Shared Domain Logic & Types.
  - Contains: Type definitions (`User`, `Order`, `Product`), Pure business rules (Validation, Calculation).
  - Used by both Web and API apps.

## Prerequisites
- Node.js v18+
- PostgreSQL Database
- Netlify CLI (`npm install -g netlify-cli`)

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
    This installs dependencies for all workspaces and links them.

2.  **Environment Variables**:
    Create `.env` in root:
    ```env
    DATABASE_URL=postgres://user:pass@host:5432/dbname
    JWT_SECRET=your_super_secret_key
    ```
    (Note: Netlify Functions pick up env vars from Netlify context or `.env`)

3.  **Run Locally** (Recommended Workflow):

    *   **Terminal 1 (Core Watch)**:
        ```bash
        npm run dev:core
        # Watches @nexus/core for changes.
        ```

    *   **Terminal 2 (App Server)**:
        ```bash
        npm run dev:api
        # Starts Netlify Dev (API on 8888) AND Frontend (Vite on 5173).
        # Access the app at: http://localhost:8888
        ```

    > **Note:** Do not run `npm run dev:web` separately if `dev:api` is running. Netlify Dev manages the web process for you.

## Building
To build the frontend and core packages:
```bash
npm run build
```

## Security
- **RBAC**: Roles are managed in `apps/api/functions/roles.ts`.
- **Audit Logs**: Critical actions (Stock adjustments, User modifications) are logged via `audit_logs` table.
- **Validation**: Business rules (e.g., negative stock prevention) are enforced in `@nexus/core`.
