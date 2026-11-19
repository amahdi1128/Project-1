# BuildThePulse — direct advertiser go-to-market playbook

## Positioning
**Free for users. Supported by contextual ads.** Contractors, suppliers and construction-business operators can explore official permit activity in Chicago, D.C., Philadelphia and Delaware without a paywall.

The offer to advertisers is *relevant placement beside permit research*, not a guaranteed construction lead and never the private data of subscribers.

## First prospects
Look for legitimate businesses already selling to contractors in each market: construction supply distributors, heavy equipment and tool rental, HVAC/plumbing/electrical wholesalers, construction SaaS vendors, insurance brokers serving contractors, and trade associations.

Initial prospecting target: 10–15 plausible advertisers in each of the four markets, researched individually. Prioritize companies with local sales teams and a specific reason to reach permit-research users.

## Pilot inventory and pricing hypothesis
- **Market sponsor:** one prominently labeled contextual sponsor card for the chosen jurisdiction on the permit explorer. Test **$150 for 30 days** as an introductory, negotiable research hypothesis—not a published rate or accepted order.
- **Trade sponsor:** possible future category-based placement after proving meaningful category traffic; do not promise it before implementation.
- **Digest sponsor:** possible future placement in a free construction newsletter; not for sale until the digest exists and subscriber consent is verified.

**Important:** There is no verified external audience or conversion rate yet. Don't make traffic, sales, or lead guarantees. An applicant's permit does not necessarily represent an available contract.

## What to say in outreach
Subject: Local construction visibility — BuildThePulse

Hello,

I run BuildThePulse, a free site where construction businesses can browse publicly issued permits in [market]. We're beginning to test clearly labeled market sponsorships and thought [company] might be a relevant business for readers researching local construction activity.

We are early-stage and are not claiming a large established audience. Would you be open to a brief conversation about what type of exposure would actually be useful to your sales team?

You can see the dashboard at https://buildthepulse.onrender.com and the sponsorship information at https://buildthepulse.onrender.com/advertise.html.

Best,
BuildThePulse

Personalize the company and market references and avoid sending bulk unsolicited promotional emails. Honor applicable commercial email laws, including CAN-SPAM and Canadian CASL for outreach into Canada.

## Validation schedule
1. **Week 1:** Verify that the website works well on mobile, the four market feeds are accurate, and 20 potential advertisers are relevant. Ask 10 actual contractors whether the data workflow saves time.
2. **Week 2:** Approach 10 carefully matched sponsors individually. Ask what qualified exposure they purchase and whether they prefer market or trade targeting.
3. **Weeks 3–4:** If sufficient real interest exists, negotiate a limited 30-day contextual sponsor pilot with explicit creative approval, terms, a single placement, and no performance guarantees. Collect payment only after agreeing on a lawful billing process.
4. **Monthly:** Review consented pageviews and market selections in Supabase, evaluate lead inquiries, and disclose the limited scope of the metrics. Do not present them as unique users or total pageviews.

## Measurement
Use `reporting/metrics.sql` privately in Supabase's SQL editor. The first-party analytics count only visits from visitors who accepted optional measurement. There is no cross-site visitor ID or Google Analytics property. The source itself will not prove the number of unique contractor visitors.

When a genuine sponsor is approved, add an entry to `public/sponsors.json` for a geographic market. Use a plain, correctly labeled ad with a safe HTTPS destination. Its clicks are tracked only for visitors who opted into analytics. Editorial government permit results remain untouched.

## Before Google AdSense
- Build more original market analysis and ensure enough authentic, helpful content.
- Apply for an account and complete site verification, identity and policy review. No AdSense account is currently connected.
- Get the publisher ID and configure approved advertising placements, an appropriate consent platform where required, and ads.txt information.
- Update the privacy notice to name the actual ad network, purposes, opt-out mechanics, data sharing and retention. GPC cannot be disregarded just because the site owner accepts advertising trackers.
