# ragnaross

Personal site for [ragnaross.co.uk](https://ragnaross.co.uk), built with [Astro](https://astro.build/) (static output in `site/dist/`).

## Host on this Pi

**One-time setup** (installs nginx, builds the site, serves on port 80):

```bash
cd /var/www/site/ragnaross
sudo ./deploy/setup-host.sh
```

Then open `http://192.168.1.94/` on your LAN (or your Pi’s current IP from `hostname -I`).

**Redeploy** after editing content or code:

```bash
./deploy/build.sh
sudo systemctl reload nginx
```

**HTTPS** (once DNS for `ragnaross.co.uk` points at this machine):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ragnaross.co.uk -d www.ragnaross.co.uk
```

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

## Future: visual CMS (optional)

Content is markdown in `site/src/content/` — no CMS is installed. If in-browser editing becomes useful later, [Keystatic](https://keystatic.com/) is the best fit for this Astro setup: it adds a local admin UI in dev (`@keystatic/astro` + `keystatic.config.ts` mapping the existing `sections` and `articles` collections), still stores everything as Git-backed markdown, and needs no extra runtime on the Pi. Alternative: [Decap CMS](https://decapcms.org/) for editing via `/admin` on the deployed site (more setup, GitHub auth). Use one or the other, not both.
