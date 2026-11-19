# BuildThePulse — free, advertiser-supported construction intelligence

**Live site:** https://buildthepulse.onrender.com  
**Advertise:** https://buildthepulse.onrender.com/advertise.html  
**Privacy:** https://buildthepulse.onrender.com/privacy.html

BuildThePulse is a free public-data dashboard for construction professionals. It aggregates official permit records from Chicago, Washington, D.C., Philadelphia and Delaware. Visitors can filter and export the available data without payment or creating an account.

## Business model (as of November 19, 2026)

- The dashboard, filters and CSV export are **free**.
- We are testing **clearly labeled direct market sponsorships**. Advertisers can request information on the sponsorship page; actual ad inventory is not yet sold.
- An optional free-update interest list is connected to a private Supabase database. The email digest itself is **not yet being sent automatically**.
- **No paid subscription, checkout, AdSense publisher ID, programmatic ad campaign or advertising revenue is currently active.**
- Sponsor configurations live in `public/sponsors.json`. Empty means the dashboard shows an honest "Sponsorship available" placement. Add a sponsor only after agreeing on terms and obtaining approval for creative and URL.

## Markets and coverage caveats

- Chicago — City of Chicago public building permits, approximately a 30-day rolling window.
- Washington, D.C. — D.C. public building permits, recent issuance records.
- Philadelphia — city's building permits, recent issuance records.
- Delaware — state planning development-trends permit locations (annual, historical) **plus Sussex County official permits with daily issue dates**. The Sussex feed does not cover every Delaware locality. These record sets are labeled and not presented as equivalent.

Collectors: `scripts/collect.py`, `scripts/collect_markets.py`, `scripts/collect_sussex.py`. Scheduled GitHub Actions updates JSON feeds and commits changes; Render serves `public/`.

## Audience measurement (privacy-conscious and free-tier)

- `public/growth.js` records `page_view`, `market_select` and `sponsor_click` events only after the visitor consents.
- Global Privacy Control / Do Not Track are treated as an opt-out. Previous experimental privacy preferences are not reused as permission for analytics; a new v3 preference is required.
- Event rows contain **event type, market, page category, sponsor placement and timestamp**, with no visitor identifier, IP address, user agent, referrer or email in the analytics table.
- This measures **consenting event counts, not unique visitors, impressions delivered by Google, or guaranteed advertiser conversions**. Host infrastructure may separately log IP information.
- Data is stored privately in `public.buildthepulse_analytics_events`. Use `reporting/metrics.sql` in the Supabase SQL editor for private reports.
- No third-party ad trackers or AdSense scripts are installed. Adding those requires appropriate consent controls, updated policies and an approved ad account.

## Sponsor inquiry and mailing interest

- `public/advertise.html`, `public/advertise.js` — live sponsor inquiry form.
- `public/index.html`, `public/app.js` — free-update interest list (no current automated emails).
- `supabase/functions/buildthepulse-growth/index.ts` — validated sponsor inquiry and analytics endpoint.
- `supabase/functions/buildpulse-waitlist/index.ts` — free-update interest endpoint.
- Private tables: `buildthepulse_sponsor_inquiries`, `buildthepulse_analytics_events`, `buildpulse_waitlist`, `buildthepulse_privacy_requests`. RLS is enabled and anonymous table permissions are revoked. No database secrets are published to JavaScript or GitHub.
- The sponsor form is a request for information **not a purchase contract**. Leads are available in Supabase Table Editor; no CRM notifications or outbound sales sequences are running automatically.

## Local testing

```bash
python -m unittest discover -s tests -v
node --check public/app.js
node --check public/growth.js
node --check public/advertise.js
cd public && python -m http.server 8000
```

## Revenue validation

1. Build original, useful market/trade reports and obtain search/organic distribution.
2. Interview contractors to validate that BuildThePulse reaches the intended business audience.
3. Offer a transparent 30-day market sponsorship trial after real usage is measurable.
4. Record sponsor inquiries, consented event counts and any actual commercial response.
5. Consider AdSense only after site quality, audience, eligibility, consent and account approval have been confirmed. Google may reject sites without sufficient original value.

See `sales_playbook.md` for the sponsor prospecting and validation approach.

## Cost / important limitations

GitHub, Render Static Sites and Supabase currently use free tiers, subject to usage limits and future pricing changes. No OpenAI API calls or additional paid subscription are required for the present build. ChatGPT Plus does not include API credits. The project does **not** currently generate income. Advertiser contracts and privacy/compliance requirements must be evaluated before commercial scale.

## Official public data attribution

- Chicago: https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu
- D.C.: https://opendata.dc.gov/datasets/DCGIS::building-permits-in-last-30-days
- Philadelphia: https://data.phila.gov/visualizations/li-building-permits/
- Delaware: https://stateplanning.delaware.gov/development-trends/index.shtml
- Sussex County: https://map.sussexcountyde.gov/trdserver/rest/services/Permit_Points/FeatureServer/0

BuildThePulse is not affiliated with these governments. Permits may be delayed, amended or incomplete, and are not evidence of open construction bids.

## Review checks

Use Python 3.12 and Node.js 24. The [technical audit](docs/technical-audit.md)
tracks findings, priorities, and the collector adapter contract.

```bash
npm ci
python3 -m unittest discover -s tests -v
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests run against a local static server and intercept external requests.
Edge-handler tests use an in-process fake database fetch. The test suite requires
no Supabase credentials and submits no production records.
