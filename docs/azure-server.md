# Highpoints Azure Server

The Azure VM `Highpoint/myVm` hosts an additive Highpoints origin server.

## Live Hosts

- `https://server.highpoints.work` - DNS-only direct Azure server with Let's Encrypt TLS
- `https://origin.highpoints.work` - DNS-only direct Azure origin with Let's Encrypt TLS
- `https://azure.highpoints.work` - DNS-only direct Azure host with Let's Encrypt TLS
- `http://40.87.39.63` - direct Azure VM HTTP endpoint

## Runtime

- VM public IP: `40.87.39.63`
- SSH user: `nick`
- SSH key: `/root/.ssh/azure_vmss_ed25519`
- App directory: `/opt/highpoints`
- Public site service: `highpoints-go-site`
- Front door: `nginx`
- TLS certificate: `/etc/letsencrypt/live/origin.highpoints.work/` for `origin.highpoints.work`, `server.highpoints.work`, and `azure.highpoints.work`

The public pages run from the Go site on `127.0.0.1:8080`.
Nginx proxies `/app`, `/app.bundle.js`, `/vendor/*`, and `/service-worker.js` to the production Highpoints app so the Azure origin and Cloudflare host present the same complete application instead of separate app shells.
Nginx proxies `/api/*` to `https://highpoints.work/api/*` so Azure-hosted app screens keep using the production Cloudflare Worker and D1 backend.
Nginx keeps `/api/search` local so public-site search is served by the Azure Go service.

## Cache Policy

- `server.highpoints.work`, `origin.highpoints.work`, and `azure.highpoints.work` are DNS-only records to the Azure VM. This avoids stale Cloudflare edge cache for app and API routes.
- `/app`, `/sw.js`, `/api/*`, `/api/search`, `/azure/status`, and `/healthz` return `Cache-Control: no-store, max-age=0`.
- `/icons/*` returns `Cache-Control: public, max-age=31536000, immutable`.
- `/manifest.json` and `/.well-known/*` return `Cache-Control: public, max-age=3600`.

## Update Command

From this repo:

```bash
scripts/deploy-azure-server.sh
```

Optional overrides:

```bash
HIGHPOINTS_AZURE_HOST=40.87.39.63 \
HIGHPOINTS_AZURE_USER=nick \
HIGHPOINTS_AZURE_KEY=/root/.ssh/azure_vmss_ed25519 \
scripts/deploy-azure-server.sh
```

## Health Checks

```bash
curl -fsS https://server.highpoints.work/azure/status
curl -fsS https://server.highpoints.work/api/v2/health
curl -fsSI https://origin.highpoints.work/app
ssh -i /root/.ssh/azure_vmss_ed25519 nick@40.87.39.63 'systemctl status highpoints-go-site nginx'
```
