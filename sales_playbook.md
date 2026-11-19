# BuildThePulse — 10-customer discovery playbook

## The actual buyer problem

Contractors and construction sales teams may spend time searching public building-permit data for trade-relevant work. Our hypothesis: some would pay to receive *accurate, tailored and timely* permit signals without manually searching broad government datasets. Existing competitors make willingness-to-pay verification especially important.

## Who to interview

Start with Chicago-based independent roofing contractors, HVAC companies, electrical subcontractors, and building-product sales firms. Target owners or business-development managers who already prospect for new project work. Avoid messaging residential owners from permit records.

## Research interview (15 minutes)

1. How do you find new project opportunities today?
2. Have you used Chicago permit data? What was frustrating?
3. What information do you need before you decide a permit is worth following up on?
4. Which trades and areas matter to you? How often do you want alerts?
5. What's a recent opportunity you found through a permit, and what happened?
6. Would a daily curated list be more useful than this free dashboard? Why?
7. If a product reliably saved you an hour each week, would $39/month be worth testing? Ask for a pilot commitment; a polite yes is not a sale.

## A human first-contact email (send individually; no bulk automation)

Subject: Quick question about how you find Chicago construction projects

Hi [name],

I'm testing a free tool that turns Chicago's public building permits into a searchable project feed. I'm speaking with a few local contractors to learn whether trade-specific alerts would actually save them time.

Would you be open to looking at the dashboard and telling me what is missing? I'm not selling a subscription yet.

Thanks,
[Your name]

## Organic acquisition loop (not guaranteed)

1. The daily pipeline refreshes the dataset.
2. Each week, inspect a few current permit trends (trade count, wards, reported project cost) and prepare a source-linked public post.
3. Publish one helpful, original analysis on LinkedIn or an industry forum where promotion is permitted.
4. Invite visitors to test the dashboard and answer a focused feedback question.
5. Publish a credible use-case example only with consent.

Do not falsely say that you have paying customers, use fabricated testimonials, or imply city endorsement.

## Roadmap after first paid commitment

- v0.2: Saved searches and fully opt-in daily emails (Cloudflare Workers scheduled triggers + D1 + email provider free quota)
- v0.3: Stripe Checkout, subscription webhooks, and server-side premium access (do not gate only with front-end JavaScript)
- v0.4: More cities after confirming each dataset's licensing, updates, and schema
- v0.5: Professional review or an affordable separate AI API only when it improves measurable customer outcomes

## Success criteria

- 10 conversations booked/completed within 3 weeks
- 3 concrete requests for a recurring alert
- 1 paid pilot before further product expansion
- First alert trial must demonstrate reliable dates, links, precision, and opt-out

These are operating goals, not income projections.
