# Private subscription gateway

Deploy with Wrangler. Store credentials as Cloudflare Secrets, never in source.

```powershell
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put SUBSCRIPTION_KEY
npx wrangler deploy
```

`GITHUB_TOKEN` needs read access to repository contents. `SUBSCRIPTION_KEY` is optional; when set, send `Authorization: Bearer <key>`.
