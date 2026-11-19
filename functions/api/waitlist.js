// Cloudflare Pages Function. Requires D1 database binding named DB and schema.sql migration.
const allowed = new Set(['All trades','Roofing','HVAC','Plumbing','Electrical','Windows & Doors','Concrete','Demolition','New Construction','Renovation']);
export async function onRequestPost({ request, env }) {
  if (!env.DB) return Response.json({ok:false,error:'Waitlist is not configured yet.'}, {status:503});
  let body;
  try { body = await request.json(); } catch { return Response.json({ok:false,error:'Invalid request.'},{status:400}); }
  if (body.website) return Response.json({ok:true}); // honeypot spam trap
  const email = String(body.email || '').trim().toLowerCase();
  const trade = String(body.trade || 'All trades');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowed.has(trade)) {
    return Response.json({ok:false,error:'Enter a valid email and trade.'},{status:400});
  }
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO waitlist (email,trade) VALUES (?,?)').bind(email, trade).run();
    return Response.json({ok:true});
  } catch {
    return Response.json({ok:false,error:'Unable to save your request.'},{status:500});
  }
}
