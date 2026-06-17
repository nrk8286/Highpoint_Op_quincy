#!/usr/bin/env bash
set -euo pipefail

VM_HOST="${HIGHPOINTS_AZURE_HOST:-40.87.39.63}"
VM_USER="${HIGHPOINTS_AZURE_USER:-nick}"
SSH_KEY="${HIGHPOINTS_AZURE_KEY:-/root/.ssh/azure_vmss_ed25519}"
REMOTE="${VM_USER}@${VM_HOST}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"
go test ./site-go
go build -o "$TMP_DIR/highpoints-go-site" ./site-go
mkdir -p "$TMP_DIR/bundle/www"
cp "$TMP_DIR/highpoints-go-site" "$TMP_DIR/bundle/highpoints-go-site"
cp -a "$ROOT_DIR/www/." "$TMP_DIR/bundle/www/"
tar -C "$TMP_DIR/bundle" -czf "$TMP_DIR/highpoints-azure-deploy.tgz" .

scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$TMP_DIR/highpoints-azure-deploy.tgz" "$REMOTE:/tmp/highpoints-azure-deploy.tgz"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE" 'bash -s' <<'REMOTE_SCRIPT'
set -euo pipefail
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx ca-certificates curl certbot python3-certbot-nginx
sudo mkdir -p /opt/highpoints
sudo tar -C /opt/highpoints -xzf /tmp/highpoints-azure-deploy.tgz
sudo chown -R root:root /opt/highpoints
sudo chmod 0755 /opt/highpoints/highpoints-go-site
sudo find /opt/highpoints/www -type d -exec chmod 0755 {} \;
sudo find /opt/highpoints/www -type f -exec chmod 0644 {} \;
sudo tee /etc/systemd/system/highpoints-go-site.service >/dev/null <<'EOF'
[Unit]
Description=Highpoints Go public site and Azure origin health service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/highpoints
ExecStart=/opt/highpoints/highpoints-go-site -addr 127.0.0.1:8080
Restart=always
RestartSec=3
User=www-data
Group=www-data
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/log

[Install]
WantedBy=multi-user.target
EOF
sudo tee /etc/nginx/sites-available/highpoints-azure >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name azure.highpoints.work server.highpoints.work origin.highpoints.work highpoints.work www.highpoints.work _;

    access_log /var/log/nginx/highpoints_access.log;
    error_log /var/log/nginx/highpoints_error.log;

    add_header X-Highpoints-Origin azure-myVm always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy same-origin always;

    location = /app/ {
        return 308 /app;
    }

    location = /app {
        proxy_pass https://highpoints.work/app;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location = /app.bundle.js {
        proxy_pass https://highpoints.work/app.bundle.js;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location /vendor/ {
        proxy_pass https://highpoints.work/vendor/;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
        add_header Cache-Control "public, max-age=3600" always;
    }

    location = /service-worker.js {
        proxy_pass https://highpoints.work/service-worker.js;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location /cdn-cgi/ {
        proxy_pass https://highpoints.work/cdn-cgi/;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_redirect off;
    }

    location = /sw.js {
        root /opt/highpoints/www;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location = /manifest.json {
        root /opt/highpoints/www;
        add_header Cache-Control "public, max-age=3600" always;
    }

    location /icons/ {
        root /opt/highpoints/www;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location /.well-known/ {
        root /opt/highpoints/www;
        add_header Cache-Control "public, max-age=3600" always;
    }

    location = /api/search {
        proxy_pass http://127.0.0.1:8080/api/search;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location /api/ {
        proxy_pass https://highpoints.work/api/;
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Host highpoints.work;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Authorization $http_authorization;
        proxy_redirect off;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location /azure/status {
        proxy_pass http://127.0.0.1:8080/healthz;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:8080/healthz;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, max-age=0" always;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/highpoints-azure /etc/nginx/sites-enabled/highpoints-azure
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now highpoints-go-site nginx
sudo systemctl restart highpoints-go-site nginx
if [ "${HIGHPOINTS_SKIP_CERTBOT:-0}" != "1" ]; then
  sudo certbot --nginx -d origin.highpoints.work -d server.highpoints.work -d azure.highpoints.work --expand --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
fi
sudo nginx -t
sudo systemctl reload nginx
curl -fsSL -H "Host: server.highpoints.work" http://127.0.0.1/azure/status
curl -fsSL -H "Host: server.highpoints.work" http://127.0.0.1/api/v2/health
REMOTE_SCRIPT

curl -fsS "https://server.highpoints.work/azure/status" >/dev/null
curl -fsS "https://server.highpoints.work/api/v2/health" >/dev/null
curl -fsS "https://server.highpoints.work/app" | grep -q 'const API_PROBE = "/api/v2/health"'
curl -fsS "https://origin.highpoints.work/azure/status" >/dev/null
echo "Highpoints Azure server deployed: https://server.highpoints.work"
