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
