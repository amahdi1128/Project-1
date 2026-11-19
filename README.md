# BuildPulse Chicago — free, nonlegal data-business MVP

**Status:** working code package, **not deployed**, **not earning revenue**, **no paid subscriptions implemented**.

BuildPulse is a small public-data dashboard for Chicago building permits. It targets contractors, trade suppliers, and small construction sales teams. The dashboard runs as static files, and the data collector uses only the Python standard library.

## What works today

- Responsive public website with source attribution and explicit demonstration-mode disclosure.
- Search permits by location/description/ID, filter by trade, ward, and minimum reported cost.
- Sort newest first, paginate, export matching permits to CSV.
- Python collector fetches real records from the Chicago official Socrata dataset `ydr8-5enu`, normalizes public fields and applies transparent rule-based trade categories.
- A GitHub Actions workflow schedules a daily refresh and commits `public/data/permits.json` when it changes.
- Optional Cloudflare Pages Function saves user-provided work emails and trade preferences to a free Cloudflare D1 waitlist.
- Unit tests covering classification, normalization, and malformed costs.

## What is **not** implemented

- **No live production website** until you deploy it.
- **No payment processing, premium access, subscription billing, or automatic customer acquisition.** The $39/$99 plans shown are research concepts only.
- **No paid AI model integration.** ChatGPT Plus helps build and review code, but is *not* an OpenAI API key and does not enable unattended AI inference.
- **No automated paid email alerts.** This is a possible next feature after customer validation.
- A separate domain is optional. The default `*.pages.dev` subdomain can be free.

## Run locally (no credit card, no dependencies)

From the extracted project root:

```sh
python -m unittest discover -s tests -v
cd public
python -m http.server 8000
```

Go to `http://localhost:8000/` in your browser. The included six rows are explicitly labeled **fictional demo records**. They are not scraped facts.

To replace them with real Chicago permit data, from the project root, with internet access:

```sh
python scripts/collect.py --days 30
```

The collector fetches the city's actual published data and saves `public/data/permits.json`; refresh the browser to see the real data. **This coding sandbox cannot reach the API, so no live rows have been fabricated or bundled.**

## Deploy at $0 additional recurring software cost (subject to free-tier limits)

### 1. GitHub (free account)

1. Create an empty **public** repository with a simple name such as `buildpulse-chicago`.
2. Upload all project files, **including the hidden `.github/workflows/daily.yml` folder**. If dragging files in your browser, ensure hidden files are included.
3. Go to **Actions**. Enable workflows if GitHub asks you to approve them.
4. Open **Refresh Chicago permits** and click **Run workflow** for an initial collection.
5. Inspect the action log. If the city API is temporarily unavailable, the collector deliberately fails without replacing the existing dataset. Retry when available.
6. Visit the repository and verify `public/data/permits.json` contains `"mode":"live"`.

GitHub standard hosted runners are free for public repositories within GitHub's policy and usage rules, but GitHub can change its terms. Scheduled workflows are best-effort and may run late. GitHub can disable inactivity-related workflows in public repositories; periodically check runs.

### 2. Cloudflare Pages (free plan)

1. Create a free Cloudflare account.
2. Open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select your GitHub repository.
4. Build framework: **None**. Build command: **leave empty**. Build output directory: **`public`**.
5. Deploy. Cloudflare gives you an address similar to `https://buildpulse-chicago.pages.dev` (the actual subdomain depends on availability).
6. Open the site; make sure the data banner says real data, and the newest issue date is reasonable.

**Do not use GitHub Pages as your paid SaaS storefront.** Use Cloudflare Pages; GitHub Pages' usage policies restrict running online businesses.

### 3. Optional: enable free waitlist capture via D1

1. Cloudflare dashboard → Workers & Pages → D1 → create a database (name e.g. `buildpulse-waitlist`).
2. Execute the statement in `sql/schema.sql` using the D1 console (database must exist before the code works).
3. Pages project → Settings → Bindings → add **D1 database**, variable name exactly **`DB`**, select the new database.
4. Redeploy the Pages project and submit a test email through the website.
5. Check the D1 database for the row. The site does not send a confirmation email or marketing mail; add affirmative email consent and unsubscribe infrastructure before marketing emails.

Until D1 is configured, the waitlist form clearly reports an error. Do **not** claim registrations are working until tested.

## Product positioning and market test

**Buyer:** small Chicago roofing/HVAC/electrical subcontractors, general contractors, construction suppliers, and commercial property service firms.

**Pitch:** "Filter recently issued Chicago building permits by trade and reported project value in seconds instead of navigating raw city data."

**Initial validation targets, not forecasts:**
- Interview 10 people who actively track construction leads.
- Get 3 users to say which alerts, filtering, and exports would be worth paying for.
- Ask whether $39/month for matched daily alerts and $99/month for a team feed is credible.
- Secure at least one explicit paid pilot commitment **before** developing a paywall.

**Potential monetization once validated:** Stripe Payment Links for checkout (no upfront fee, transaction fees apply), Stripe webhooks for access, a customer account system, and opt-in alert emails. These do not exist in the current prototype; do not collect payment for a nonexistent service.

**Growth channels:** publish weekly permit statistics using verified aggregate counts, invite legitimate trade businesses to test searches, demonstrate the time saved, and ask happy users for referrals. Avoid automated unsolicited residential outreach and be mindful of email marketing laws and privacy.

**Important limitation:** there are already construction-permit data products. A public-data dashboard by itself is unlikely to command high subscription prices. Validate a narrow workflow customers find genuinely useful (e.g., reviewed trade-specific alerts, frequency, trends, territory filters) before charging.

## Privacy and data accuracy

The collector excludes permit contact names, phone numbers, applicant emails, and other personal contact fields. It retains permit site street addresses from the official data because they are project locations; do not use the service to harass homeowners. The public permit data can be revised or delayed, and project valuations are reported estimates. Automatic trade classification is heuristic and may be wrong. Always include the City of Chicago source attribution and avoid implying official endorsement.

This is market intelligence, not a guarantee of a job, available contract, or bid invitation.

## Files

```
.github/workflows/daily.yml  Automated morning refresh
scripts/collect.py          Free data collection / normalization / classification
public/index.html           Responsive landing page and data explorer
public/styles.css           Site design
public/app.js               Filtering, pagination, CSV export, waitlist form
public/data/permits.json    Explicit demo feed; replaced by collector when run online
functions/api/waitlist.js   Optional Cloudflare Pages waitlist endpoint
sql/schema.sql              Optional D1 schema
sales_playbook.md           Early customer-discovery scripts and marketing plan
tests/test_collect.py       Offline tests
```

## Troubleshooting

- **Blank dashboard opened by double-clicking HTML:** use `python -m http.server 8000`, because browser security can block `fetch()` for `file://` URLs.
- **City API returns error:** check that dataset `ydr8-5enu` is still published and field names haven't changed. Existing JSON is not overwritten when a fetch fails.
- **Only demo records after deployment:** run the GitHub workflow manually, check that it has `contents: write` permission, and that the automated commit was pushed. Cloudflare should redeploy following a repo update; trigger a manual redeploy if necessary.
- **Waitlist 503 error:** D1 database and `DB` Pages binding have not been configured.
- **Actions schedule doesn't run:** public repo schedules are not guaranteed at the exact specified minute and may be disabled if the repository becomes inactive. Trigger it manually.

## Data and references

- City of Chicago dataset: https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu
- Socrata API: https://data.cityofchicago.org/resource/ydr8-5enu.json
- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
- Cloudflare Pages free limits: https://developers.cloudflare.com/pages/platform/limits/

**Built as a $0-upfront prototype using public data and free software tiers.** This is not a launched company, validated offer, or automated revenue stream yet.
