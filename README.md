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

Article images use URLs like `/assets/images/coffee/...`. They live outside git on disk and are linked into the Astro `public/` folder so builds copy them into `site/dist/`.

**One-time setup on the Pi:**

```bash
mkdir -p /var/www/media/ragnaross/assets/images/{coffee,food-ext}
cd /var/www/site/ragnaross/site/public
rm -rf assets   # only if empty or you have moved any files out
ln -s /var/www/media/ragnaross/assets assets
```

Add images under `/var/www/media/ragnaross/assets/` using the same paths as in markdown, e.g.:

```text
/var/www/media/ragnaross/assets/images/coffee/rum-baba-kaleidoscope-3.0.jpg
/var/www/media/ragnaross/assets/images/food-ext/margarets.jpg
```

Rebuild so Astro copies them into `dist/`:

```bash
./deploy/build.sh
ls site/dist/assets/images/coffee/ | head
```

Do not commit `site/public/assets` — it is gitignored. Re-run the `ln -s` if a pull recreates `public/assets` as a normal directory.

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
