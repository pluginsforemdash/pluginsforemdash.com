# Go-Live Instructions: pluginsforemdash.com

Step-by-step guide to take the site from local development to production.

---

## Table of Contents

1. [Switch to Cloudflare Adapter](#1-switch-to-cloudflare-adapter)
2. [Cloudflare Infrastructure Setup](#2-cloudflare-infrastructure-setup)
3. [Wrangler Configuration](#3-wrangler-configuration)
4. [Domain & DNS Setup](#4-domain--dns-setup)
5. [Email Setup](#5-email-setup)
6. [Deploy the Site](#6-deploy-the-site)
7. [EmDash First-Time Setup](#7-emdash-first-time-setup)
8. [Stripe Setup](#8-stripe-setup)
9. [Create Products in EmDash](#9-create-products-in-emdash)
10. [Platform API (api.pluginsforemdash.com)](#10-platform-api)
11. [Publish Plugins to npm](#11-publish-plugins-to-npm)
12. [Pre-Launch Checklist](#12-pre-launch-checklist)

---

## 1. Switch to Cloudflare Adapter

Replace the Node adapter with the Cloudflare adapter.

```bash
cd /home/hamoudy/Desktop/pluginsforemdash
npm uninstall @astrojs/node
npm install @astrojs/cloudflare
```

Update `astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import emdash from 'emdash/astro';
import cloudflare from '@astrojs/cloudflare';
import { commercePlugin } from 'emdash-plugin-commerce';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    emdash({
      plugins: [commercePlugin({ currency: 'usd' })],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['emdash'],
      },
    },
  },
});
```

- [ ] `@astrojs/node` uninstalled
- [ ] `@astrojs/cloudflare` installed
- [ ] `astro.config.mjs` updated with cloudflare adapter

---

## 2. Cloudflare Infrastructure Setup

Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and create the required resources.

### Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### Create D1 Database

```bash
wrangler d1 create pluginsforemdash-db
```

Save the output `database_id` -- you will need it for `wrangler.jsonc`.

### Create R2 Bucket

```bash
wrangler r2 bucket create pluginsforemdash-media
```

### Create KV Namespace

```bash
wrangler kv namespace create SESSIONS
```

Save the output `id` -- you will need it for `wrangler.jsonc`.

- [ ] Wrangler installed and authenticated
- [ ] D1 database created (save `database_id`)
- [ ] R2 bucket created
- [ ] KV namespace created (save `id`)

---

## 3. Wrangler Configuration

Create `wrangler.jsonc` in the project root (`/home/hamoudy/Desktop/pluginsforemdash/wrangler.jsonc`):

```jsonc
{
  "name": "pluginsforemdash",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "dist/_worker.js",
  "assets": {
    "directory": "dist/client"
  },

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pluginsforemdash-db",
      "database_id": "<YOUR_D1_DATABASE_ID>"
    }
  ],

  // R2 Storage (media uploads)
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "pluginsforemdash-media"
    }
  ],

  // KV Namespace (sessions)
  "kv_namespaces": [
    {
      "binding": "SESSIONS",
      "id": "<YOUR_KV_NAMESPACE_ID>"
    }
  ],

  // Environment variables (set secrets via wrangler secret)
  "vars": {
    "SITE_URL": "https://pluginsforemdash.com"
  }
}
```

Replace `<YOUR_D1_DATABASE_ID>` and `<YOUR_KV_NAMESPACE_ID>` with the values from Step 2.

### Set Secrets

Do not put secret values in `wrangler.jsonc`. Use `wrangler secret` instead:

```bash
wrangler secret put STRIPE_SECRET_KEY
# paste: sk_live_...

wrangler secret put STRIPE_WEBHOOK_SECRET
# paste: whsec_...

wrangler secret put RESEND_API_KEY
# paste: re_...
```

- [ ] `wrangler.jsonc` created with correct bindings
- [ ] D1 database ID filled in
- [ ] KV namespace ID filled in
- [ ] Secrets set via `wrangler secret put`

---

## 4. Domain & DNS Setup

### Add Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Add a Site** > enter `pluginsforemdash.com`
2. Select a plan (Free works fine for Workers/Pages)
3. Cloudflare will provide two nameservers (e.g., `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
4. Go to your domain registrar and update the nameservers to the ones Cloudflare provided
5. Wait for DNS propagation (can take up to 24 hours, usually much faster)

### Configure DNS Records

In Cloudflare DNS settings for `pluginsforemdash.com`:

| Type  | Name | Content                    | Proxy |
|-------|------|----------------------------|-------|
| CNAME | @    | pluginsforemdash.workers.dev | Proxied |
| CNAME | www  | pluginsforemdash.com       | Proxied |
| CNAME | api  | pluginsforemdash-api.workers.dev | Proxied |

> If deploying via Cloudflare Pages instead of Workers, the CNAME for `@` will point to your Pages project URL (e.g., `pluginsforemdash.pages.dev`).

### Add Custom Domain to Worker

```bash
wrangler domains add pluginsforemdash.com
```

Or configure via Dashboard > Workers & Pages > your worker > Settings > Domains & Routes.

### Enable SSL

Cloudflare provides SSL automatically. In the Cloudflare Dashboard:

1. Go to **SSL/TLS** > set mode to **Full (strict)**
2. Enable **Always Use HTTPS** under SSL/TLS > Edge Certificates

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS records configured
- [ ] Custom domain attached to Worker
- [ ] SSL set to Full (strict)

---

## 5. Email Setup

### Set Up Resend

1. Create an account at [resend.com](https://resend.com)
2. Go to **Domains** > **Add Domain** > enter `pluginsforemdash.com`
3. Add the DNS records Resend provides (MX, TXT/SPF, DKIM) to your Cloudflare DNS
4. Wait for domain verification in Resend
5. Create an API key in Resend and save it

### Required Email Addresses

Configure these sender addresses in Resend:

- `hello@pluginsforemdash.com` -- general contact / support
- `notifications@pluginsforemdash.com` -- transactional emails (order confirmations, license keys)

### Add Resend API Key as a Secret

```bash
wrangler secret put RESEND_API_KEY
# paste your Resend API key
```

### Cloudflare Email Routing (for receiving email)

To receive email at `hello@pluginsforemdash.com`:

1. Go to Cloudflare Dashboard > **Email** > **Email Routing**
2. Enable email routing for `pluginsforemdash.com`
3. Add a route: `hello@pluginsforemdash.com` -> forward to your personal email

- [ ] Resend account created
- [ ] Domain verified in Resend
- [ ] DNS records added (MX, SPF, DKIM)
- [ ] Resend API key saved as Wrangler secret
- [ ] Email routing configured for receiving mail

---

## 6. Deploy the Site

### Build and Deploy

```bash
cd /home/hamoudy/Desktop/pluginsforemdash

# Build the Astro site
npm run build

# Deploy to Cloudflare Workers
wrangler deploy
```

### Verify Deployment

```bash
# Check the deployment is live
curl -I https://pluginsforemdash.com
```

You should see a `200` response with Cloudflare headers.

- [ ] Site builds without errors
- [ ] `wrangler deploy` succeeds
- [ ] Site loads at https://pluginsforemdash.com

---

## 7. EmDash First-Time Setup

Once the site is deployed:

1. Visit **https://pluginsforemdash.com/_emdash/admin**
2. Complete the setup wizard:
   - Create your admin account (email + password)
   - Set site name: "Plugins for EmDash"
3. After setup, log in to the admin dashboard

- [ ] Admin account created via setup wizard
- [ ] Admin dashboard accessible

---

## 8. Stripe Setup

### Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification

### Get API Keys

1. In Stripe Dashboard, go to **Developers** > **API keys**
2. Copy your **live** keys:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### Create Webhook Endpoint

1. Go to **Developers** > **Webhooks** > **Add endpoint**
2. Set the endpoint URL to:
   ```
   https://pluginsforemdash.com/_emdash/api/plugins/commerce/storefront/webhook/stripe
   ```
3. Under **Events to send**, select:
   - `checkout.session.completed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (`whsec_...`)

### Enter Keys in EmDash

1. Go to **https://pluginsforemdash.com/_emdash/admin**
2. Navigate to **Commerce** > **Settings**
3. Enter:
   - Stripe Publishable Key: `pk_live_...`
   - Stripe Secret Key: `sk_live_...`
   - Stripe Webhook Signing Secret: `whsec_...`

### Update Wrangler Secrets

If not already done:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

- [ ] Stripe account created and verified
- [ ] Live API keys obtained
- [ ] Webhook endpoint created with correct URL
- [ ] `checkout.session.completed` event selected
- [ ] Signing secret copied
- [ ] Keys entered in EmDash Commerce settings
- [ ] Secrets set in Wrangler

---

## 9. Create Products in EmDash

Navigate to **https://pluginsforemdash.com/_emdash/admin** > **Commerce** > **Products** and create each product:

| Product Name           | Price (monthly) | Price (cents) | Type    | Status |
|------------------------|-----------------|---------------|---------|--------|
| Forms Pro              | $10/mo          | 1000          | digital | active |
| Forms Pro CRM          | $29/mo          | 2900          | digital | active |
| Commerce Pro           | $29/mo          | 2900          | digital | active |
| Commerce Pro Connect   | $19/mo          | 1900          | digital | active |

For each product:

1. Click **Add Product**
2. Enter the product name
3. Set the price in cents (e.g., `1000` for $10)
4. Set type to **digital**
5. Set status to **active**
6. Save

- [ ] "Forms Pro" created ($10/mo, 1000 cents, digital, active)
- [ ] "Forms Pro CRM" created ($29/mo, 2900 cents, digital, active)
- [ ] "Commerce Pro" created ($29/mo, 2900 cents, digital, active)
- [ ] "Commerce Pro Connect" created ($19/mo, 1900 cents, digital, active)

---

## 10. Platform API

The platform API at `api.pluginsforemdash.com` is a separate Cloudflare Worker that handles:

- License key validation
- Email relay
- Stripe Connect OAuth (for Commerce Pro Connect tier)

### Stripe Connect Setup (for Pro Connect tier)

1. Go to [dashboard.stripe.com/connect](https://dashboard.stripe.com/connect)
2. Register as a Connect platform
3. Set the OAuth redirect URI to:
   ```
   https://api.pluginsforemdash.com/connect/oauth/callback
   ```
4. Save the Connect client ID and OAuth credentials

### Deploy the Platform API

The platform API needs to be built and deployed as a separate Cloudflare Worker:

```bash
# Create a new Worker project for the API
mkdir -p /home/hamoudy/Desktop/pluginsforemdash-api
cd /home/hamoudy/Desktop/pluginsforemdash-api

# Initialize and configure, then deploy
wrangler deploy
```

### DNS

Make sure the `api` CNAME record from Step 4 points to this Worker:

```
api.pluginsforemdash.com -> pluginsforemdash-api.workers.dev
```

- [ ] Platform API Worker created
- [ ] Stripe Connect registered (if using Pro Connect)
- [ ] OAuth redirect URI configured
- [ ] API deployed and accessible at `api.pluginsforemdash.com`

---

## 11. Publish Plugins to npm

Before publishing, make sure you are logged in to npm:

```bash
npm login
```

### Publish emdash-plugin-forms

```bash
cd /home/hamoudy/Desktop/emdash-plugin-forms
npm publish
```

This publishes `emdash-plugin-forms@0.2.0`.

### Publish emdash-plugin-commerce

```bash
cd /home/hamoudy/Desktop/emdash-plugin-commerce
npm publish
```

This publishes `emdash-plugin-commerce@0.3.0`.

### After Publishing

Update `package.json` in the main site to use the published packages instead of local file references:

```json
{
  "dependencies": {
    "emdash-plugin-commerce": "^0.3.0"
  }
}
```

Replace:
```json
"emdash-plugin-commerce": "file:../emdash-plugin-commerce"
```

With:
```json
"emdash-plugin-commerce": "^0.3.0"
```

Then run:

```bash
cd /home/hamoudy/Desktop/pluginsforemdash
npm install
```

Users of the plugins will install with:

```bash
npm install emdash-plugin-forms emdash-plugin-commerce
```

- [ ] Logged in to npm
- [ ] `emdash-plugin-forms` published
- [ ] `emdash-plugin-commerce` published
- [ ] Site `package.json` updated to use published packages (not `file:` references)

---

## 12. Pre-Launch Checklist

### Test with Stripe Test Keys First

Before going live with real payments, test the full checkout flow using Stripe test keys:

1. In Stripe Dashboard, toggle to **Test mode**
2. Copy test keys (`pk_test_...`, `sk_test_...`)
3. Enter test keys in EmDash Commerce settings
4. Create a test webhook endpoint with the same URL
5. Run through the checkout flow:
   - [ ] Add a product to cart
   - [ ] Complete checkout with test card `4242 4242 4242 4242`
   - [ ] Verify webhook receives `checkout.session.completed`
   - [ ] Verify order appears in EmDash admin > Commerce > Orders
   - [ ] Verify `/order/success` confirmation page renders correctly
6. Switch back to live keys when testing is complete

### Final Verification

- [ ] Site loads at https://pluginsforemdash.com
- [ ] SSL certificate active (padlock in browser)
- [ ] Admin accessible at https://pluginsforemdash.com/_emdash/admin
- [ ] All four products visible on the site
- [ ] Buy page (`/buy`) renders correctly
- [ ] Checkout flow completes with live Stripe keys
- [ ] Webhook receives events (check Stripe Dashboard > Developers > Webhooks > Recent events)
- [ ] Order confirmation page (`/order/success`) displays correctly
- [ ] Email delivery working (order confirmations sent)
- [ ] `api.pluginsforemdash.com` responds correctly
- [ ] Plugins installable from npm

### Monitoring

- **Stripe Dashboard**: Monitor payments, failed charges, and webhook delivery at [dashboard.stripe.com](https://dashboard.stripe.com)
- **Cloudflare Dashboard**: Monitor Worker analytics, errors, and request logs
- **Resend Dashboard**: Monitor email delivery at [resend.com](https://resend.com)

### Post-Launch

- [ ] Submit sitemap to Google Search Console: `https://pluginsforemdash.com/sitemap.xml`
- [ ] Announce on social media / relevant channels
- [ ] Monitor error logs for the first 48 hours

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Live site | https://pluginsforemdash.com |
| Admin panel | https://pluginsforemdash.com/_emdash/admin |
| Platform API | https://api.pluginsforemdash.com |
| Stripe Dashboard | https://dashboard.stripe.com |
| Cloudflare Dashboard | https://dash.cloudflare.com |
| Resend Dashboard | https://resend.com |
| GitHub repo | https://github.com/pluginsforemdash/pluginsforemdash.com |
| Stripe webhook URL | `https://pluginsforemdash.com/_emdash/api/plugins/commerce/storefront/webhook/stripe` |
