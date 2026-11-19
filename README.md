# BuildThePulse Chicago

**Live website:** https://buildpulse-chicago.onrender.com  
**Project:** Experimental $0-upfront public-data business for construction contractors.  
**Status as of November 19, 2026:** Public permit dashboard and daily data collection are live. Customer research waitlist code is prepared but deliberately **not accepting signups** until secure database storage is deployed. There are **no paid subscriptions and no revenue claims**.

## What's working
- Searchable Chicago building-permit explorer, including trade/ward/cost filtering and CSV export.
- Official public-data ingestion from City of Chicago Socrata API `ydr8-5enu`.
- Automatic permit updates via GitHub Actions daily schedule.
- Automatic Render Static Site deployment on changes to `main`.
- Original permit source links, honest classification disclaimers, and no fabricated records once live data is collected.
- Tests for the Python collector.

## Customer and positioning
Target initial buyer: Chicago roofing, HVAC, electrical and related independent contractors or trade suppliers. Hypothesis: a useful alert service with filtered opportunities could command $39/month for individuals and $99/month for teams. **These are hypothetical prices, not active paid plans.** A permit is not necessarily a job open to bid.

## Current privacy-first survey
The website now includes a research form with work email, trade, optional company, price willingness, interest in a pilot, and affirmative contact consent. The button is intentionally disabled until a secure private data store and support contact exist. No personal signup data is saved to the public GitHub repository.

The optional **Supabase integration is ready as code**:
- `sql/supabase_waitlist.sql` — database table and access controls.
- `supabase/functions/buildpulse-waitlist/index.ts` — validated server-side collection endpoint.
- `supabase/config.toml` — public endpoint JWT setting.
- `public/waitlist-config.js` — empty by default; populate only with a public function URL after setup.
- `public/privacy.html` — privacy notice.

See **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** for activation and testing instructions. Do **not** publish service-role keys or other secrets in this repository.

## Daily workflow
```text
.github/workflows/daily.yml
   -> test Python data normalization
   -> fetch last 30 days of official Chicago permit records
   -> normalize & classify by indicative trade
   -> update public/data/permits.json
   -> commit new data to GitHub
   -> Render automatically deploys changed site files
```

Test collection locally using Python 3.12+:
```sh
python -m unittest discover -s tests -v
python scripts/collect.py --days 30
cd public && python -m http.server 8000
```

**Source:** https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu

## Privacy and accuracy
Only public permit site data is exported. Contact names, phone numbers and applicant emails are excluded from permit ingestion. Classifications are heuristic; dates and project costs are provided by the city and may be revised. BuildThePulse is independent of the City of Chicago.

## Costs
The public prototype uses GitHub Actions and Render Static Sites on available free tiers. Supabase also offers a limited free plan, subject to allowances and policy changes. No commercial AI API is in use; ChatGPT Plus does not grant OpenAI API credits. Do not configure paid infrastructure without first checking pricing. Stripe checkout is **not configured** and no payment should be collected for unbuilt features.

## Next business milestone
Speak with ten real contractors, identify one repeatable alert workflow, obtain three credible pilot prospects, and then build a minimum trade-specific email-alert service. See `sales_playbook.md`.
