# Private subscription gateway

Deploy with Wrangler. Store credentials as Cloudflare Secrets, never in source.

```powershell
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put SUBSCRIPTION_KEY
npx wrangler deploy
```

`GITHUB_TOKEN` needs read access to repository contents. `SUBSCRIPTION_KEY` is optional; when set, send `Authorization: Bearer <key>`.

## GitHub 私有化操作

仓库可见性需要 GitHub 账号在网页上确认。项目内提供 Playwright 引导脚本：

```powershell
$env:REPO_URL = "https://github.com/chen54088/FREESUB"
node scripts/make-private.mjs
```

脚本会打开浏览器、等待你完成登录/验证码，定位 `Danger Zone`，在最后确认前暂停；确认仓库名无误后，在终端按 Enter。
