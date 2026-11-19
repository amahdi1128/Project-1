// BuildThePulse free advertising prototype: private advertiser inquiries and
// opt-in aggregate audience events. No IP, user-agent, email or cookies
// are stored in the analytics table. Public endpoint: validate every field.
const ORIGINS = new Set([
  'https://buildthepulse.onrender.com',
  'https://buildpulse-chicago.onrender.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);
const MARKETS = new Set(['all','chicago','dc','philadelphia','delaware']);
const PLACEMENTS = new Set(['market','trade','newsletter','other']);
const BUDGETS = new Set(['undecided','under_250','250_500','500_plus']);
const EVENTS = new Set(['page_view','market_select','sponsor_click']);
const PATHS = new Set(['/','/advertise.html','/privacy.html']);
function respond(data:unknown,status:number,origin:string){
  return new Response(JSON.stringify(data),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type',
    Vary:'Origin'
  }});
}
function dbDetails(){
  const base=Deno.env.get('SUPABASE_URL')||'';
  let key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  try {
    const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    key=secrets.default||key;
  } catch { /* fallback */ }
  return {base,key};
}
Deno.serve(async(request:Request)=>{
  const origin=request.headers.get('origin')||'';
  if(!ORIGINS.has(origin)) return new Response('Forbidden',{status:403});
  if(request.method==='OPTIONS') return respond({ok:true},200,origin);
  if(request.method!=='POST') return respond({ok:false,error:'Method not allowed.'},405,origin);
  let body:Record<string,unknown>;
  try {
    const raw=await request.text();
    if(raw.length>4096) return respond({ok:false,error:'Request too large.'},413,origin);
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw Error('Bad payload');
    body=parsed;
  } catch { return respond({ok:false,error:'Invalid submission.'},400,origin); }
  if(String(body.website_trap||'').trim()) return respond({ok:true},200,origin);

  let table:string;
  let row:Record<string,unknown>;
  if(body.kind==='sponsor'){
    const company=String(body.company||'').trim();
    const contact_name=String(body.contact_name||'').trim();
    const email=String(body.email||'').trim().toLowerCase();
    const website=String(body.website_url||'').trim();
    const market=String(body.market||'all');
    const placement=String(body.placement||'other');
    const budget=String(body.budget||'undecided');
    const notes=String(body.notes||'').trim();
    const consent_to_contact=body.consent_to_contact===true;
    if(company.length<2||company.length>120||
       contact_name.length<2||contact_name.length>120||
       email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
       website.length>250|| (website && !/^https?:\/\/[a-z0-9.-]+(?:[/:?#][^\s]*)?$/i.test(website)) ||
       !MARKETS.has(market)||!PLACEMENTS.has(placement)||
       !BUDGETS.has(budget)||notes.length>900||!consent_to_contact) {
      return respond({ok:false,error:'Check the required fields and contact consent.'},400,origin);
    }
    table='buildthepulse_sponsor_inquiries';
    row={company,contact_name,email,website:website||null,market,placement,budget,notes:notes||null,consent_to_contact};
  } else if(body.kind==='event'){
    const event_type=String(body.event_type||'');
    const market=String(body.market||'all');
    const path=String(body.path||'/');
    const placement=String(body.placement||'').slice(0,48);
    if(!EVENTS.has(event_type)||!MARKETS.has(market)||!PATHS.has(path)||
       (event_type==='sponsor_click' && !placement)) {
      return respond({ok:false,error:'Invalid event.'},400,origin);
    }
    table='buildthepulse_analytics_events';
    row={event_type,market,path,placement:placement||null};
  } else {
    return respond({ok:false,error:'Unknown submission type.'},400,origin);
  }
  const {base,key}=dbDetails();
  if(!base||!key) return respond({ok:false,error:'Service temporarily unavailable.'},503,origin);
  const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',Prefer:'return=minimal'};
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  try {
    const res=await fetch(base+'/rest/v1/'+table,{method:'POST',headers,body:JSON.stringify(row)});
    if(!res.ok){
      // Never disclose database internals to users.
      console.error('BuildThePulse write rejected:',res.status);
      return respond({ok:false,error:'Unable to save your request.'},502,origin);
    }
    return respond({ok:true},200,origin);
  } catch {
    return respond({ok:false,error:'Service temporarily unavailable.'},503,origin);
  }
});
