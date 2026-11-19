import { readSubmission, submissionErrors } from '../_shared/request.ts';

// BuildThePulse free bulletin interest endpoint — deploy as a Supabase Edge Function.
// No service-role or secret key should ever be embedded in the website.
const ORIGINS = new Set([
  'https://buildthepulse.onrender.com',
  'https://buildpulse-chicago.onrender.com',
]);
const TRADES = new Set([
  'All trades','Roofing','HVAC','Plumbing','Electrical','Windows & Doors',
  'Concrete','Demolition','New Construction','Renovation',
]);
const PRICES = new Set(['not_sure','no','19','39','79','99_plus']);

function reply(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin',
    },
  });
}
Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  if (!ORIGINS.has(origin)) return new Response('Forbidden', { status: 403 });
  if (request.method === 'OPTIONS') return reply({ ok: true }, 200, origin);
  if (request.method !== 'POST') return reply({ ok: false, error: 'Method not allowed.' }, 405, origin);
  const submission = await readSubmission(request, 8192);
  if ('status' in submission) {
    return reply({ ok: false, error: submissionErrors[submission.status] }, submission.status, origin);
  }
  const { body: body } = submission;
  // Passive anti-bot trap. Add rate limiting and CAPTCHA if spam grows.
  if (String(body.website || '').trim()) return reply({ ok: true }, 200, origin);

  const email = String(body.email || '').trim().toLowerCase();
  const trade = String(body.trade || '');
  const requested_plan = String(body.requested_plan || '');
  const company = String(body.company || '').trim().slice(0, 120);
  const wants_pilot = body.wants_pilot === true;
  const consent_to_contact = body.consent_to_contact === true;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !TRADES.has(trade) || !PRICES.has(requested_plan) || !consent_to_contact
  ) {
    return reply({ ok: false, error: 'Check your email, trade, pricing selection, and consent.' }, 400, origin);
  }
  const base = Deno.env.get('SUPABASE_URL') || '';
  let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    secret = keys.default || secret;
  } catch { /* fall back to legacy service-role key */ }
  if (!base || !secret) return reply({ ok: false, error: 'Registration is temporarily unavailable.' }, 503, origin);
  try {
    const headers: Record<string, string> = {
      apikey: secret,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    };
    if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
    const response = await fetch(base + '/rest/v1/buildpulse_waitlist?on_conflict=email', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, trade, company: company || null, requested_plan, wants_pilot, consent_to_contact }),
    });
    if (!response.ok) return reply({ ok: false, error: 'Registration could not be saved.' }, 502, origin);
    return reply({ ok: true }, 200, origin);
  } catch {
    return reply({ ok: false, error: 'Registration is temporarily unavailable.' }, 503, origin);
  }
});
