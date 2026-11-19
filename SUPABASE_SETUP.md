# BuildPulse — private research signup setup (free tier)

## Current state
- Public dashboard: **live** at https://buildpulse-chicago.onrender.com
- GitHub: https://github.com/amahdi1128/Project-1
- Live daily public permit collector: active
- Research signup: **not collecting submissions** until a free Supabase project is configured
- Payments, subscriptions and alert delivery: **not implemented**
- No OpenAI API usage is required.

## Files already prepared
- `sql/supabase_waitlist.sql` — private waitlist table, constraints, row-level security and no public table access.
- `supabase/functions/buildpulse-waitlist/index.ts` — validates and saves consent-based research submissions on the server.
- `supabase/config.toml` — allows this public signup endpoint to run without a user login.
- `public/waitlist-config.js` — contains only a *public function URL*, not any keys.
- `public/index.html`, `public/app.js` — prices, pilot-interest survey, consent, safe error handling.
- `public/privacy.html` — research privacy notice.

## Activate signup
1. Create or select a project on the Supabase free plan. **Verify the plan is free** and do not upgrade.
2. Run the SQL from `sql/supabase_waitlist.sql` in its SQL editor.
3. Deploy the Edge Function `buildpulse-waitlist` from `supabase/functions/buildpulse-waitlist/index.ts`.
4. Verify it has `SUPABASE_URL` and a server-only `SUPABASE_SERVICE_ROLE_KEY` (or a supported secret-key environment variable). Never place either secret in a GitHub public file or a Render static-site environment variable.
5. Edit `public/waitlist-config.js` to set the *public* Edge Function URL:
   `window.BUILDPULSE_WAITLIST_ENDPOINT = 'https://YOUR-PROJECT.supabase.co/functions/v1/buildpulse-waitlist';`
6. Before enabling, add a private support email to the privacy page for deletion/opt-out requests. Do not publish a personal contact address without consent.
7. Wait for Render to redeploy. Check that the button becomes available, send a **test** submission with consent, and inspect the Supabase table privately. The `buildpulse_waitlist` table should **not** be publicly readable.
8. Remove the test row and verify duplicate submissions do not create duplicate entries.
9. Configure an appropriate bot-protection/rate-limit strategy before broadly advertising signup. The endpoint includes basic input checks and a honeypot, but is not yet production-hardened for high-volume anonymous traffic.

Until steps 1–9 are completed and verified, **do not claim the waitlist is operational**.

## Validate whether contractors will pay
Do not take payment for features that are not implemented. The form asks the visitor what monthly price would be viable and whether they would consider a paid pilot. Treat answers as *interest*, not revenue or binding commitments.

Validation target: 10 conversations with contractors, 3 serious pilot prospects, then build only the feature that wins a credible purchase commitment. Suggested offer: Chicago rooftop/MEP permit alerts by trade and ward, with a short daily email and CSV. The city permit record by itself is not evidence that a contractor has an open bidding opportunity.

## Costs and limitations
The prototype uses GitHub, Render Static Sites and Supabase on free usage tiers. Exceeding allowances or changing to a paid tier can incur charges. There is no commercially running AI model; ChatGPT Plus does not include API credits. Stripe payment processing is not set up.
