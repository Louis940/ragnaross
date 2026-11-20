# ragnaross

Personal site for [ragnaross.co.uk](https://ragnaross.co.uk), built with [Astro](https://astro.build/) (static output in `site/dist/`).

## Host on this Pi

**One-time setup** (installs nginx, builds the site, serves on port 80):

```bash
cd /var/www/site/ragnaross
sudo ./deploy/setup-host.sh
```

Then open `http://<pi-lan-ip>/` on your LAN.

**Redeploy** after editing content or code:

```bash
./deploy/build.sh
sudo systemctl reload nginx
```

### Media assets (Pi)

Article images use URLs like `/assets/images/coffee/...`. They live outside git and outside the Astro build, in `/var/www/media/ragnaross/assets/`. nginx serves `/assets/` straight from that folder (see `deploy/nginx-ragnaross.conf`), so new or replaced images are live immediately — **no rebuild needed**.

Images are uploaded through [dufs](https://github.com/sigoden/dufs) at `https://files.ragnaross.co.uk`, which writes into the same folder.

**One-time setup on the Pi:**

```bash
# Media folder: www-data owns it (dufs writes, nginx reads); setgid keeps the group on new dirs
sudo mkdir -p /var/www/media/ragnaross/assets/images/{coffee,food-ext}
sudo chown -R www-data:www-data /var/www/media/ragnaross
sudo chmod -R 2775 /var/www/media/ragnaross
sudo usermod -aG www-data "$USER"   # optional: lets you add files over SSH too (re-login)

# dufs credentials (YAML: the "-" goes before the rule, not before "auth:")
sudo mkdir -p /etc/dufs
sudoedit /etc/dufs/auth.yaml
#   auth:
#     - <user>:<password>@/:rw
sudo chown root:www-data /etc/dufs/auth.yaml
sudo chmod 640 /etc/dufs/auth.yaml

# dufs service (listens on 127.0.0.1:5000 only)
sudo install -m 644 deploy/dufs.service /etc/systemd/system/dufs.service
sudo systemctl daemon-reload && sudo systemctl enable --now dufs
curl -I http://127.0.0.1:5000/   # expect 401
```

Then in the Cloudflare dashboard (the tunnel is token-based, so routes live there, not in a local config):

1. **Zero Trust → Networks → Tunnels →** this tunnel **→ Published application routes → Add**: `files.ragnaross.co.uk` → `HTTP` `localhost:5000`.
2. **Zero Trust → Access → Applications → Self-hosted**: protect `files.ragnaross.co.uk` with an Allow policy for your email only.

Upload into the same paths the markdown uses, e.g. `images/coffee/rum-baba-kaleidoscope-3.0.jpg` → `https://ragnaross.co.uk/assets/images/coffee/rum-baba-kaleidoscope-3.0.jpg`. If you replace an image under the same name, purge it in Cloudflare (Caching → Purge) or wait out the 7-day cache.

**Local dev:** `npm run dev` doesn't go through nginx, so put copies of any images you want to see in `site/public/assets/` (gitignored). On the Pi, `site/public/assets` should **not** exist — remove the old symlink if it's there, or the images get pointlessly copied into `dist/` on every build.

Public HTTPS uses **Cloudflare Tunnel** (no certbot on the Pi). See [Public access](#public-access-route-53--s3--cloudflare-tunnel) below.

There is a Cloudflare Origin Certificate on the Pi, this is used to provide HTTPS between the Pi and the Tunnel itself, it uses Strict HTTP on Cloudflare.

### Ongoing deploy

Unchanged — tunnel stays up; rebuild and reload nginx:

```bash
./deploy/build.sh && sudo systemctl reload nginx
```

### Rough monthly cost

| Service | Cost |
|---------|------|
| Route 53 hosted zone | ~£0.40 |
| Cloudflare Tunnel | £0 |
| Pi at home | electricity only |

## Development

Requires Node **≥ 22.12** (see `site/.node-version`; [fnm](https://github.com/Schniz/fnm) is recommended on the Pi).

```bash
cd site
fnm use    # if using fnm
npm install
npm run dev    # http://localhost:4321
npm run build  # → dist/
```

See `MIGRATION.txt` for URL mapping from the original Framer site.

## Future: visual CMS?

Content is markdown in `site/src/content/` — no CMS is installed. If in-browser editing becomes useful later, [Keystatic](https://keystatic.com/) is the best fit for this Astro setup: it adds a local admin UI in dev (`@keystatic/astro` + `keystatic.config.ts` mapping the existing `sections` and `articles` collections), still stores everything as Git-backed markdown, and needs no extra runtime on the Pi. 

Alternative: [Decap CMS](https://decapcms.org/) for editing via `/admin` on the deployed site (more setup, GitHub auth).
