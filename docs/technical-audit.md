# BuildThePulse technical audit

Reviewed the static site, five checked-in feeds and their collectors, three
Supabase handlers, SQL and GitHub Actions. Recommendations preserve free search
and CSV export, contextual sponsorship and the forest-green and warm-brown
palette. Production Render settings, live database policies and production logs
were outside this source audit. Validate those separately before rollout.

| Priority | Source finding and consequence | Action and acceptance criteria |
| --- | --- | --- |
| P0 | Growth and privacy workflows POST synthetic emails, sponsor inquiries, analytics and rights requests into the hosted database. The bootstrap workflow can also copy archived source over current files and push it. | This branch removes those workflows. A credential-free PR workflow runs mocked endpoint contract tests, collector tests and desktop/mobile browser checks. Check with the operator whether old CI rows need cleanup through the established retention process. |
| P0 | Advertise described analytics as unused while loading the analytics script. It shared its stored choice with the dashboard. Open tabs retained withdrawn consent until reload. | This branch makes disclosures consistent, requires a fresh v3 preference, synchronizes changes across tabs and refreshes consent when restoring cached pages. Browser checks cover deny, explicit allow, cross-tab withdrawal and GPC. |
| P0 | Sponsor and rights forms defaulted to GET when JS failed, placing named form fields in the URL. Public handlers buffered request bodies before measuring them and analytics accepted arbitrary placement text despite the stated limited schema. | This branch disables submit until JS initializes, uses POST as the HTML fallback, bounds JSON request streams and restricts analytics placement to the market dimension. Contract tests verify rejected payloads cannot reach the database. |
| P1 | Public Edge Functions use privileged writes. CORS limits browser access but is insufficient for authentication, abuse prevention or proof of consent. Honeypots alone leave sponsor, privacy, waitlist and reporting quotas exposed. | Remove explicit localhost permission in this branch. Before relying on audience counts for sales, add a durable, privacy-reviewed rate limit, short retention for abuse data, write timeouts and least-privilege database write roles where supported. Test anonymous denial, rate-limit behavior and outage handling in isolated Supabase. |
| P1 | Philadelphia could publish a capped feed as complete. ArcGIS collectors assumed full-size pages and Sussex treated missing or future dates as evidence it could stop scanning. Date validation also accepted impossible calendar dates. | This branch adds shared bounded pagination, transfer-limit handling, deterministic tie-break ordering and calendar validation, with fixture-based regressions. Confirm source field names and live pagination in an isolated read-only run before relying on new feeds. Offset pagination can still drift while a source changes. |
| P1 | A failure in one required collector could block publication of every other successful refresh. Old files still appeared active without a visible retrieval date. | This branch allows independent refreshes, keeps prior files for failures, reports required failures after publishing successful feeds, and shows timestamp and delayed-refresh indicators for daily feeds. Add per-feed alerts, record-count drift checks and last-success metrics. |
| P1 | The repository only includes Supabase DDL for the waitlist and explicit JWT settings for that function. Sponsor, analytics and rights storage described in the docs cannot be reproduced or verified from source alone. The Cloudflare/D1 waitlist path and setup notes add ambiguity. | Inventory deployed schema and configuration through authorized read-only access. Capture versioned migrations and RLS/grants assertions without secrets, test against disposable Supabase, and retire the alternate backend after confirming it is unused. |
| P1 | Free-text permit descriptions may contain incidental personal information even though explicit applicant fields are excluded. Residential addresses and parcel IDs also warrant a publication review. Retention timelines and privacy request ownership are underspecified. | Define and test a data minimization policy for descriptions and locations. Assign an inbox owner, identity verification workflow and retention schedule for inquiries, analytics and rights requests. Keep raw personal data out of CI, fixtures and Git history. |
| P1 | The privacy overlay did not contain keyboard focus. The wide permit table depended on horizontal scrolling without a keyboard-focusable region. The advertising header overflowed at 320 CSS pixels, causing mobile Chromium to misalign touch targets in the consent banner. Dense filters and pagination also need a narrow layout. | This branch uses a native modal with focus restoration, adds a labeled scroll region and stacks filters and wraps the header action at narrow widths. Chromium checks desktop and mobile layouts. Add real-device Safari and Firefox, zoom, screen-reader and contrast checks. |
| P2 | The five checked-in JSON feeds total about 7.55 MB uncompressed and download before results render. Filters scan the entire in-memory array, and browser caching is bypassed. Geographic subdivisions are presented as wards even for Philadelphia districts and Delaware counties. Annual statewide data and daily Sussex data can describe overlapping activity. | Use a lightweight feed manifest and cacheable, independently loaded market snapshots. Display source-specific area labels and separate annual trends from daily permit counts; document deduplication and coverage limits. Define mobile payload and first-result budgets before adding markets. |
| P2 | Daily feeds commit generated snapshots to the serving branch, coupling data refresh, repository growth and deploys. Render headers, preview strategy and rollback are not versioned here. | Keep the static site and free tier. Add a versioned deployment contract and isolate feed publishing from source releases when volume warrants it. Rehearse rollback, verify CSP and other response headers on staging, and apply branch protections with a dedicated approach for feed publication. |

## Adding a jurisdiction

1. Start with an official source and document licensing, available dates,
   geography, update cadence, stable record identifiers and privacy exclusions.
2. Implement a fetch adapter returning records and a continuation flag through
   `scripts/pagination.py`. For ArcGIS, reuse `arcgis_rows` with a field allowlist
   and a stable sort ending in a unique source key. Offset-based adapters need an
   explicit end signal or a terminal probe at their cap.
3. Normalize into the current feed schema. Preserve source identity, issue date
   precision, currency semantics and coverage. Avoid treating a fee as a
   construction value or an annual indicator as an issue date. Prefer deterministic
   duplicate selection and stable ordering.
4. Add sanitized fixtures for partial pages, duplicates, invalid dates, schema
   drift, caps and empty responses. Validate before the atomic write. Preserve
   the prior snapshot when the refresh cannot establish completeness.
5. As adapter count grows, move source metadata and output paths into a shared
   registry and generate a client feed manifest. Add a dry-run CLI, freshness and
   count reporting, per-source retry budgets and a contract test for each adapter.
   Pilot one jurisdiction before generalizing beyond the existing API families.

## Validation and rollout

The checked-in snapshots contain 17,289 records, with zero duplicate IDs
within individual feeds. Only Chicago carries reported costs, with values on
2,332 of its 2,716 records. Treat totals as reported Chicago values for the
selected records and keep cross-market comparisons explicit.

Review the PR checks, then validate collector source-field compatibility and
the Edge Functions in isolated staging. The cloud environment denied the
read-only municipal API probes. The Edge Function tests use Node's web APIs
and a mocked Supabase write, so they do not verify deployed JWT, RLS or quotas.
