// Privacy-rights request inbox for BuildThePulse. No public table reads.
// Entries are unverified pending identity checks by the operator.
const ORIGINS = new Set(['https://buildthepulse.onrender.com','https://buildpulse-chicago.onrender.com']);
const TYPES = new Set(['access','delete','correct','opt_out','limit','other']);
function answer(obj:unknown, status:number, origin:string) {
  return new Response(JSON.stringify(obj), {status,headers:{
    'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type','Vary':'Origin',
  }});
}
Deno.serve(async req => {
  const origin=req.headers.get('origin')||'';
  if(!ORIGINS.has(origin)) return new Response('Forbidden',{status:403});
  if(req.method==='OPTIONS') return answer({ok:true},200,origin);
  if(req.method!=='POST') return answer({ok:false,error:'Method not allowed'},405,origin);
  let data:Record<string,unknown>;
  try {
    const raw=await req.text();
    if(raw.length>4000) return answer({ok:false,error:'Request too large'},413,origin);
    data=JSON.parse(raw);
    if(!data || typeof data!=='object' || Array.isArray(data)) throw Error('Invalid data');
  } catch {return answer({ok:false,error:'Invalid request'},400,origin);}
  if(String(data.website||'')) return answer({ok:true},200,origin);
  const email=String(data.email||'').trim().toLowerCase();
  const request_type=String(data.request_type||'');
  const jurisdiction=String(data.jurisdiction||'').trim().slice(0,80);
  const details=String(data.details||'').trim().slice(0,1000);
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !TYPES.has(request_type)){
    return answer({ok:false,error:'Please provide a valid email and request type.'},400,origin);
  }
  const base=Deno.env.get('SUPABASE_URL')||'';
  let secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  try{ const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');secret=keys.default||secret;}catch{}
  if(!base||!secret)return answer({ok:false,error:'Service unavailable'},503,origin);
  const headers:Record<string,string>={apikey:secret,'Content-Type':'application/json',Prefer:'return=minimal'};
  if(!secret.startsWith('sb_secret_')) headers.Authorization='Bearer '+secret;
  try{
    const res=await fetch(base+'/rest/v1/buildthepulse_privacy_requests',{method:'POST',headers,
      body:JSON.stringify({email,request_type,jurisdiction,details})});
    if(!res.ok) return answer({ok:false,error:'Unable to save your request'},502,origin);
    return answer({ok:true,message:'Request received. Additional identity verification may be required.'},200,origin);
  }catch {return answer({ok:false,error:'Service unavailable'},503,origin);}
});
