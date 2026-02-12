# Netlify → Cloudflare Worker Pages Migration Guide

This document outlines the changes made to migrate the NexusERP backend from Netlify Functions to Cloudflare Worker Pages.

## Overview of Changes

### 1. **Configuration Files**

- **Removed**: `netlify.toml` (root and `apps/api/`)
- **Added**: `wrangler.toml` (Cloudflare Workers configuration)

### 2. **API Structure**

- **Netlify Functions**: Individual function files that act as handlers
- **Cloudflare Workers**: Single entry point (`apps/api/src/index.ts`) that routes requests to handlers

### 3. **Dependency Changes**

#### Removed

- `@netlify/functions` - Netlify-specific types and utilities

#### Added

- `wrangler` - Cloudflare Workers CLI and build tool

### 4. **Type System Updates**

#### Before (Netlify — Type System)

```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // ...
};

```

#### After (Cloudflare — Type System)

```typescript
import { HandlerEvent, HandlerContext, HandlerResponse } from './utils/router';

export const authHandler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // ...
};

```

### 5. **Key Files Modified**

#### Core Files

- `apps/api/functions/utils/apiResponse.ts` - Updated for Cloudflare compatibility
- `apps/api/functions/utils/router.ts` - Removed Netlify-specific path handling
- `apps/api/package.json` - Updated dependencies and build scripts
- `apps/web/vite.config.ts` - Updated proxy configuration

#### New Files

- `apps/api/src/index.ts` - Main Cloudflare Worker entry point
- `wrangler.toml` - Cloudflare Workers configuration

### 6. **Environment Variables**

#### Netlify Approach

```bash
# .env file auto-loaded
DATABASE_URL=postgres://...
JWT_SECRET=...

```

#### Cloudflare Approach

```bash
# Option 1: Via wrangler CLI
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET

# Option 2: Via wrangler.toml (for non-sensitive values)
[env.production]
vars = { ENVIRONMENT = "production" }

# Option 3: .env file (development only)
DATABASE_URL=postgres://...
JWT_SECRET=...

```

### 7. **Local Development**

#### Before (Netlify — Local Development)

```bash
# Terminal 1
npm run dev:api  # Starts Netlify Dev on 8888

# Terminal 2 (if needed)
npm run dev:web  # Usually managed by Netlify Dev

```

#### After (Cloudflare — Local Development)

```bash
# Terminal 1
npm run dev:api  # Starts Cloudflare Worker on 8787

# Terminal 2
npm run dev:web  # Starts Vite on 5173 with proxy to localhost:8787

```

### 8. **Deployment**

#### Before (Netlify — Deployment)

```bash
# Automatic deployment on push (configured via Netlify UI)
# Or manual
npm run build
netlify deploy

```

#### After (Cloudflare — Deployment)

```bash
# Authenticate once
wrangler login

# Deploy
npm run deploy:api
# Or
cd apps/api && npm run deploy

# Preview
wrangler preview

```

### 9. **Request/Response Format**

Both platforms use similar request/response formats, but the internal routing differs:

**Netlify**: Routes handled by file path (`functions/auth.ts` → `/.netlify/functions/auth`)

**Cloudflare**: Routes handled by the main index.ts entry point with manual routing

### 10. **Routing Changes**

#### Netlify Redirects (Old)

```toml
[[redirects]]
  from = "/api/auth/*"
  to = "/.netlify/functions/auth/:splat"
  status = 200

```

#### Cloudflare Routes (New)

Routing is handled in `apps/api/src/index.ts` - no configuration needed beyond `wrangler.toml`

### 11. **Database Connection**

No changes required - PostgreSQL connection via `DATABASE_URL` works the same way

### 12. **Audit Logging**

The audit logging system remains unchanged. Log files are written to `/tmp/api_debug.log` on the Worker.

## Breaking Changes

None! The API interface remains the same. External clients don't need any changes.

## Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables: `wrangler secret put DATABASE_URL`, `wrangler secret put JWT_SECRET`
- [ ] Run local development: `npm run dev:api` + `npm run dev:web`
- [ ] Test API endpoints at `http://localhost:5173`
- [ ] Verify authentication flow
- [ ] Test CORS headers
- [ ] Deploy to production: `npm run deploy:api`
- [ ] Verify production endpoints

## Troubleshooting

### Port Conflict (8787)

```bash
# Change port in wrangler.toml or use
wrangler dev --port 9000

```

### Missing Environment Variables

```bash
# Set secrets
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET

# Verify
wrangler secret list

```

### Database Connection Timeout

- Verify DATABASE_URL format
- Check firewall/security group allows connections from Cloudflare
- Test local connection: `psql $DATABASE_URL -c "SELECT 1"`

### CORS Issues

- Check `Access-Control-Allow-Origin` headers in `utils/apiResponse.ts`
- Verify frontend proxy configuration in `vite.config.ts`

## Performance Considerations

1. **Cold Starts**: Cloudflare Workers have minimal cold start time
2. **Execution Time**: Default 50ms timeout; increase if needed in `wrangler.toml`
3. **Memory**: Workers have 128MB CPU memory; monitor database connections
4. **Cost**: Check Cloudflare pricing for Worker invocations

## Rollback Plan

If you need to rollback to Netlify:

1. Keep old `netlify.toml` files in git history
2. Switch dependencies back to `@netlify/functions`
3. Update function handlers to use Netlify Handler type
4. Revert vite.config.ts proxy settings
5. Run `npm install` and redeploy to Netlify

## Next Steps

1. Update CI/CD pipeline to use `wrangler publish` instead of Netlify deploy
2. Configure custom domain in Cloudflare
3. Set up monitoring/logging via Cloudflare dashboard
4. Consider using Cloudflare KV for caching if needed
5. Monitor Worker metrics in Cloudflare Analytics
