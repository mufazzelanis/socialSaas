# Deploying to Production

This covers what's actually implemented so far: auth (incl. password reset
+ email), Telegram/Facebook/Instagram/LinkedIn publishing, the
admin/activity-log/permission system, and branding. Subscription billing
isn't built yet — see the project plan for that roadmap.

## 1. Server prerequisites

- PHP 8.3+, Composer
- MySQL 8+ (or MariaDB)
- Nginx (or Apache) + PHP-FPM
- Node 20+ (only needed at build time, not at runtime)
- A domain (or two — one for the API, one for the frontend, e.g.
  `api.yourdomain.com` / `app.yourdomain.com`) with DNS pointed at the server
- Certbot (for free HTTPS via Let's Encrypt)

## 2. Get the code onto the server

```bash
git clone <your-repo-url> /var/www/social-saas
cd /var/www/social-saas
```

(If this project isn't in git yet, do that first — `git init`, commit,
push to a private repo. Deploying from a folder you rsync by hand works too,
but git makes rollbacks possible.)

## 3. Backend setup

```bash
cd /var/www/social-saas/backend
composer install --no-dev --optimize-autoloader

cp .env.production.example .env
# now edit .env: DB credentials, APP_URL, FRONTEND_URLS, mail settings, etc.

php artisan key:generate   # generates a fresh APP_KEY for THIS environment
```

**Back up the `APP_KEY` value somewhere safe (password manager, secrets
vault) the moment it's generated.** It encrypts every stored Telegram bot
token and platform credential secret. Lose it and every connected account
becomes unusable — everyone has to reconnect.

Continue:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

Set ownership/permissions so PHP-FPM (usually running as `www-data`) can
write to `storage/` and `bootstrap/cache/`:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

**Video uploads (up to 2GB) need matching PHP-FPM `php.ini` limits** —
Laravel's own validation isn't enough if PHP itself rejects the upload
first. Find the right ini (`php --ini` or `php-fpm8.3 -i | grep "Loaded Config"`)
and set:

```ini
upload_max_filesize = 2048M
post_max_size = 2200M
memory_limit = 1024M
max_execution_time = 1800
```

Then `sudo systemctl restart php8.3-fpm`. (`deploy/nginx.conf.example` also
sets Nginx's own `client_max_body_size` and timeouts to match — Nginx will
reject a large upload before PHP even sees it otherwise.)

## 4. Frontend build

```bash
cd /var/www/social-saas/frontend
# point the build at your real API URL:
echo "VITE_API_URL=https://api.yourdomain.com/api" > .env.production
npm ci
npm run build
```

This produces `frontend/dist/` — a folder of static files. It does not need
Node running in production; Nginx just serves the files (see
`deploy/nginx.conf.example`).

## 5. Web server

Copy and adjust `deploy/nginx.conf.example` (PHP-FPM socket path, domain
names, app path), then:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/social-saas
sudo ln -s /etc/nginx/sites-available/social-saas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

## 5b. Set up real Facebook, Instagram & LinkedIn credentials

Telegram just needs a bot token (each user provides their own — nothing to
set up here). Facebook/Instagram/LinkedIn use OAuth and need a Developer App
you create, with its Client ID/Secret entered in **Admin → Platform
Credentials** once the app is deployed (or even during local dev — both
platforms accept `http://localhost` redirect URIs while an app is in
development mode).

**Facebook (also covers Instagram — Instagram Business accounts have no
separate login for publishing; they're discovered through whichever
Facebook Page they're linked to):**
1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → "Other" → "Business".
2. Add the **Facebook Login** product.
3. Under Facebook Login → Settings, add this exact redirect URI:
   `https://api.yourdomain.com/api/social-accounts/oauth/facebook/callback`
   (or `http://localhost:8000/api/social-accounts/oauth/facebook/callback` for local testing).
4. Add the **Instagram Graph API** product (needed for the `instagram_basic`
   / `instagram_content_publish` permissions this app requests).
5. Copy the App ID and App Secret into **Admin → Platform Credentials →
   Facebook** in the dashboard, toggle Enabled, Save.
6. While the app is in **Development Mode**, only accounts added as
   Admins/Developers/Testers on the app (in App Roles) can actually
   complete the OAuth flow — that's enough to fully test the connect +
   publish flow yourself. Going to **Live Mode** for real customers requires
   Meta's **App Review** for `pages_manage_posts` and
   `instagram_content_publish` — budget time for that (usually 1–2 weeks,
   needs a screencast demo of the feature).

**LinkedIn:**
1. Go to [developer.linkedin.com](https://developer.linkedin.com) → Create App.
2. Under Products, request **"Sign In with LinkedIn using OpenID Connect"**
   and **"Share on LinkedIn"** — both are usually auto-approved instantly.
3. Under Auth, add this exact redirect URI:
   `https://api.yourdomain.com/api/social-accounts/oauth/linkedin/callback`
4. Copy the Client ID and Client Secret into **Admin → Platform Credentials
   → LinkedIn**, toggle Enabled, Save.
5. LinkedIn access tokens expire after ~60 days with no silent refresh in
   this basic flow — users will need to reconnect periodically. A
   background expiry check/reminder is a reasonable future addition.

**Once configured**, go to **Social Accounts** in the dashboard and use the
real "Connect via Facebook" / "Connect via LinkedIn" buttons — same place
Telegram connects from.

## 6. Create your super admin

```bash
cd /var/www/social-saas/backend
# register a normal account through the live site first, then:
php artisan user:make-admin you@yourdomain.com
```

## 7. Backups

```bash
chmod +x deploy/backup-db.sh
# adjust APP_DIR/BACKUP_DIR paths inside the script if your layout differs
crontab -e
# add: 0 3 * * * /var/www/social-saas/deploy/backup-db.sh >> /var/log/social-saas-backup.log 2>&1
```

## 8. Sanity checklist before pointing real users at it

- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false` (never leave this `true`)
- [ ] `FRONTEND_URLS` matches your real frontend origin exactly (scheme + domain)
- [ ] HTTPS working on both domains (no mixed content / plain-HTTP warnings)
- [ ] Registered a test account, promoted it via `user:make-admin`, confirmed
      the Admin tab loads
- [ ] Connected a real Telegram bot and published a test post successfully
- [ ] Backup script runs manually without error, produces a `.sql.gz` file
- [ ] Rate limiting is active — 7 rapid login attempts should return `429`
- [ ] Decided: leave `GRANT_ALL_PLATFORMS_ON_REGISTRATION=true`, or flip to
      `false` if new signups should wait for admin approval
- [ ] Facebook/LinkedIn app credentials added in Admin → Platform
      Credentials, and the exact redirect URIs (see section 5b above)
      match what's registered in each developer console
- [ ] Test-connected a real Facebook Page (and, if it has one, its linked
      Instagram Business account) and published a test post to each
- [ ] Test-connected LinkedIn and published a test post
- [ ] If testing Instagram locally before deploying: expect it to fail —
      Instagram fetches the image from a public URL and cannot reach
      `localhost`. This isn't a bug; it resolves itself once deployed
      behind a real domain.

## Known gaps (not blockers for launch, but real gaps)

- **No background queue for publishing**: posts publish synchronously
  during the request. Fine at small scale; if a platform's API is slow,
  that request is slow. A queue worker is the next logical addition once
  traffic grows.
- **Facebook App Review**: `pages_manage_posts` and
  `instagram_content_publish` require Meta's App Review before real
  (non-tester) users can connect in Live Mode — budget time for that.
- **LinkedIn token refresh**: access tokens expire after ~60 days with no
  silent refresh in the current flow — connected LinkedIn accounts will
  eventually need reconnecting. Worth automating a reminder later.
- **No subscription/billing** — every account currently has unlimited use.
