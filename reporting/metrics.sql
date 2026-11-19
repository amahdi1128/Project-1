-- Private sponsor reporting. Execute only in Supabase SQL editor as owner.
-- CONSENTED events only. These are not counts of unique users or all visits.

-- 1. Aggregate activity over the past 30 days:
select date(created_at) as day, event_type, market,
       count(*) as consenting_events
from public.buildthepulse_analytics_events
where created_at >= now() - interval '30 days'
group by 1,2,3 order by 1 desc,3,2;

-- 2. The sponsor click distribution (for actual sponsors only):
select market, placement, count(*) as consenting_clicks
from public.buildthepulse_analytics_events
where event_type='sponsor_click'
  and created_at >= now() - interval '30 days'
group by 1,2 order by consenting_clicks desc;

-- 3. Incoming advertiser lead summary (no contact info exported):
select market, placement, status, count(*) as inquiries
from public.buildthepulse_sponsor_inquiries
group by 1,2,3 order by 1,2,3;

-- 4. Review leads in the Supabase Table Editor privately, not publicly.
-- select company,contact_name,email,market,placement,budget,notes,created_at
-- from public.buildthepulse_sponsor_inquiries order by created_at desc limit 30;

-- 5. Free-updates interest by trade:
select trade, count(*) as subscribers from public.buildpulse_waitlist
group by trade order by subscribers desc;
