# BackMellow — Static Storefront + Self-Hosted Analytics

**backmellow.com** — Premium lumbar support pillow. Static ecommerce storefront on GitHub Pages, with self-hosted Umami analytics on a Ubuntu server.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         GitHub Pages                    │
│         backmellow.com                  │
│                                         │
│  index.html + policy pages              │
│  js/analytics.js  ──► bmTrack()         │
│  js/main.js       ──► cart / purchase   │
│  admin/index.html ──► custom dashboard  │
└────────────────┬────────────────────────┘
                 │  Browser sends events
                 │  via Umami script.js
                 ▼
┌─────────────────────────────────────────┐
│         Ubuntu Server                   │
│         stats.backmellow.com            │
│                                         │
│  Caddy (TLS termination + CORS)         │
│      │                                  │
│      └─► Umami (port 3000)             │
│              │                          │
│              └─► PostgreSQL            │
└─────────────────────────────────────────┘
```

**How it works:** The storefront is fully static (HTML/CSS/JS on GitHub Pages). Umami's tracking script is embedded in every page. When a visitor loads the site, the script sends a pageview hit to `stats.backmellow.com`. Custom JavaScript events (add to cart, buy now, etc.) are sent via `window.umami.track()`. No server-side code runs on the storefront — all collection happens client-to-Umami.

---

## File Structure

```
BackMellow/
├── index.html                  ← main storefront (Umami script added)
├── returns.html                ← policy page (Umami script added)
├── shipping.html               ← policy page (Umami script added)
├── privacy.html                ← policy page (Umami script added)
├── terms.html                  ← policy page (Umami script added)
├── js/
│   ├── analytics.js            ← NEW: UTM capture + bmTrack helper
│   └── main.js                 ← existing cart/UI (analytics hooks added)
├── css/
│   ├── styles.css
│   └── policy.css
├── admin/
│   └── index.html              ← NEW: custom analytics dashboard (login + charts)
└── deploy/
    ├── docker-compose.yml      ← NEW: Umami + Postgres
    ├── .env.example            ← NEW: environment variable template
    ├── Caddyfile               ← NEW: reverse proxy with HTTPS + CORS
    └── scripts/
        ├── backup.sh           ← NEW: daily database backup
        └── update.sh           ← NEW: zero-downtime update
```

---

## Tracked Events

All events are sent via `window.umami.track()` and include `page_path` and UTM campaign data automatically.

| Event | When fired | Key payload fields |
|---|---|---|
| `view_page` | Every page load | `page_type`, `referrer` |
| `view_product` | Shop section initialises | `product_name`, `selected_color` |
| `select_color` | Color swatch clicked | `color`, `product_name` |
| `add_to_cart` | Add to Cart button clicked | `product_name`, `selected_color`, `quantity`, `price` |
| `open_cart` | Cart drawer opened | `cart_qty` |
| `change_cart_qty` | +/− in cart drawer | `color`, `new_qty` |
| `remove_from_cart` | Remove link in cart | `color`, `product_name` |
| `click_buy_now` | Buy Now button | `selected_color`, `quantity`, `price` |
| `begin_checkout_placeholder` | Checkout modal shown | `cart_qty`, `cart_subtotal` |
| `click_shop_now` | Any "Shop Now" CTA | `label`, `source` |
| `click_shipping_info` | Shipping link clicked | `source` |
| `click_return_policy` | Returns link clicked | `source` |
| `click_support_email` | Support email link | `mailto` |
| `click_social` | Social icon clicked | `network` |
| `time_on_site` | Page unload/pagehide | `seconds_on_site` |

---

## Deploy Umami on Ubuntu

### Prerequisites

- Ubuntu 22.04+ server with a public IP
- Docker + Docker Compose v2 installed
- Caddy v2 installed (`apt install caddy` or via official repo)
- DNS record: `stats.backmellow.com` → your server's public IP

### Step 1 — Copy files to the server

```bash
# On your local machine
scp -r deploy/ user@your-server:/opt/backmellow-analytics
ssh user@your-server
cd /opt/backmellow-analytics
```

### Step 2 — Create the .env file

```bash
cp .env.example .env
nano .env
```

Fill in:
- `POSTGRES_PASSWORD` — generate with `openssl rand -base64 32`
- `UMAMI_APP_SECRET` — generate with `openssl rand -hex 32`

### Step 3 — Install Caddy and configure

```bash
# If not already installed
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Copy Caddyfile
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### Step 4 — Start the stack

```bash
docker compose up -d
```

Watch the logs:
```bash
docker compose logs -f umami
```

### Step 5 — First login + create website

1. Open `https://stats.backmellow.com`
2. Log in with the default credentials:
   - **Username:** `admin`
   - **Password:** `umami`
3. **Change the password immediately** (Settings → Profile)
4. Go to **Settings → Websites → Add Website**
5. Name: `BackMellow`, Domain: `backmellow.com`
6. Click the website → **Edit** → copy the **Website ID** (UUID)

### Step 6 — Wire up the storefront

In all HTML files, replace the two placeholder values in the Umami script tag:

```html
<script defer
  src="https://stats.backmellow.com/script.js"
  data-website-id="your-uuid-here"
></script>
```

Files to update:
- `index.html`
- `returns.html`
- `shipping.html`
- `privacy.html`
- `terms.html`

Then commit and push to GitHub:

```bash
git add -A
git commit -m "feat: wire up Umami analytics"
git push
```

### Step 7 — Verify

1. Open `https://backmellow.com` in an incognito window
2. Go to your Umami dashboard → you should see a pageview within 5–10 seconds
3. Click "Shop Now", "Add to Cart", etc. — custom events appear under **Events**

---

## Custom Analytics Dashboard (admin/index.html)

The dashboard at `https://backmellow.com/admin/` is a custom single-page app that authenticates against your Umami instance and shows:

- Visitors / Pageviews / Sessions over time (line chart)
- Bounce rate and average time on site
- Top pages and top referrers (horizontal bar tables)
- Custom ecommerce events breakdown (bar chart + table)
- Countries and browsers
- Session duration distribution (histogram from `time_on_site` events)
- Advanced bot filter toggle (hides sessions < 3 s)

**To use it:**

1. Open `https://backmellow.com/admin/`
2. Enter your Umami server URL: `https://stats.backmellow.com`
3. Sign in with your Umami credentials
4. Select the BackMellow website from the dropdown
5. Choose a date range and click **Load Data**

The dashboard talks to the Umami REST API. CORS is handled by the Caddy header configuration in `deploy/Caddyfile`.

---

## DNS Setup

| Record | Type | Value | TTL |
|---|---|---|---|
| `stats.backmellow.com` | A | `<your server IP>` | 300 |

After adding the DNS record, Caddy will automatically obtain a TLS certificate from Let's Encrypt. This usually takes under 2 minutes.

---

## Bot Filtering

Bots are filtered at three levels:

1. **User-Agent (Umami built-in)** — Umami rejects requests from known crawlers and headless browsers by User-Agent string. This is always on.
2. **IP-level (Caddy)** — Add suspicious IP ranges to the `@blocked_ips` block in `deploy/Caddyfile`. Caddy responds with 403 before the request reaches Umami.
3. **Behavioural (Dashboard toggle)** — The custom dashboard's "Advanced bot filter" toggle hides sessions shorter than 3 seconds from the session duration chart. Real Umami metrics (visitors, pageviews) already exclude UA-detected bots; the toggle adds a secondary quality check based on the `time_on_site` custom event.

To add an IP block in Caddy:
```
@blocked_ips {
  remote_ip 1.2.3.4 5.6.7.8/24
}
respond @blocked_ips "Forbidden" 403
```

After editing, reload Caddy: `sudo systemctl reload caddy`

---

## Backups

Set up daily automated backups via cron:

```bash
chmod +x /opt/backmellow-analytics/scripts/backup.sh

# Edit crontab
crontab -e

# Add this line (runs at 2 AM daily):
0 2 * * * /opt/backmellow-analytics/scripts/backup.sh >> /var/log/bm-backup.log 2>&1
```

Backups are saved to `/opt/backmellow-analytics/backups/` and files older than 30 days are automatically pruned.

**To restore a backup:**

```bash
# Stop Umami (leave DB running)
docker compose stop umami

# Restore
gunzip -c backups/umami_20260412_020000.sql.gz \
  | docker exec -i bm_postgres psql -U umami_user umami

# Restart
docker compose start umami
```

---

## Updating Umami

Run the included update script. It takes a pre-update backup automatically:

```bash
cd /opt/backmellow-analytics
bash scripts/update.sh
```

Or manually:
```bash
docker compose pull umami
docker compose up -d --no-deps umami
```

---

## UTM / Campaign Tracking

The storefront auto-captures UTM parameters from the URL and attaches them to every tracked event as `campaign: { utm_source, utm_medium, utm_campaign, utm_content, utm_term }`.

To track a TikTok campaign, link to:
```
https://backmellow.com/?utm_source=tiktok&utm_medium=social&utm_campaign=launch_april
```

The values are stored in `sessionStorage` (key `bm_utm`) and included automatically in all `bmTrack()` calls for the rest of the session.

In Umami, filter by the `campaign` event data property to compare traffic sources.

---

## Storefront Features

| Feature | Status |
|---|---|
| Hero slideshow + lightbox | ✅ Live |
| Cart drawer + localStorage | ✅ Live |
| Bundle pricing (3+) | ✅ Live |
| Color selection (Black / Grey) | ✅ Live |
| Umami pageview tracking | ✅ Added |
| Custom ecommerce events | ✅ Added |
| UTM capture + attribution | ✅ Added |
| Stripe checkout | 🔜 Coming soon |
| Custom analytics dashboard | ✅ Added (`/admin/`) |

---

## Customisation

| What to change | Where |
|---|---|
| Product pricing | `CFG` object in `js/main.js` |
| Analytics domain | `src=` in every HTML file's Umami script tag |
| Website ID | `data-website-id=` in every HTML file |
| Dashboard API base | Automatically prompted on login at `/admin/` |
| Blocked IPs | `@blocked_ips` block in `deploy/Caddyfile` |
| Backup retention | `RETAIN_DAYS` in `deploy/scripts/backup.sh` |
| DB credentials | `deploy/.env` |

---

## Browser Support

Chrome 80+, Firefox 75+, Safari 14+, Edge 80+. No build step — plain HTML/CSS/JS.

---

© 2026 BackMellow. All rights reserved.
