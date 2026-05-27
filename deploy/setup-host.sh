#!/usr/bin/env bash
# One-time Pi setup: install nginx and serve site/dist on port 80.
# Run with: sudo ./deploy/setup-host.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="${REPO_ROOT}/deploy"
DIST_DIR="${REPO_ROOT}/site/dist"

echo "==> Installing nginx"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx

echo "==> Building site (as user ${SUDO_USER:-root})"
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != root ]]; then
  sudo -u "${SUDO_USER}" env HOME="$(getent passwd "${SUDO_USER}" | cut -d: -f6)" \
    bash "${DEPLOY_DIR}/build.sh"
else
  bash "${DEPLOY_DIR}/build.sh"
fi

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "Build failed: ${DIST_DIR}/index.html missing" >&2
  exit 1
fi

echo "==> Installing nginx site config"
install -m 644 "${DEPLOY_DIR}/nginx-ragnaross.conf" /etc/nginx/sites-available/ragnaross
ln -sf /etc/nginx/sites-available/ragnaross /etc/nginx/sites-enabled/ragnaross
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

echo ""
echo "Site is live on port 80."
echo "  Local:  http://$(hostname -I | awk '{print $1}')/"
echo "  Dist:   ${DIST_DIR}"
echo ""
echo "After DNS points here, enable HTTPS:"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d ragnaross.co.uk -d www.ragnaross.co.uk"
echo ""
echo "To redeploy after changes:"
echo "  ./deploy/build.sh && sudo systemctl reload nginx"
