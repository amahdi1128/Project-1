'use strict';
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency:'USD', maximumFractionDigits:0 });
const number = new Intl.NumberFormat('en-US');
const MARKETS = {chicago:'Chicago, IL',dc:'Washington, D.C.',philadelphia:'Philadelphia, PA',delaware:'Delaware',sussex:'Sussex County, Delaware'};
const SOURCES = {chicago:'https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu',dc:'https://opendata.dc.gov/datasets/DCGIS::building-permits-in-last-30-days',philadelphia:'https://data.phila.gov/visualizations/li-building-permits/',delaware:'https://stateplanning.delaware.gov/development-trends/index.shtml'};
const state = {items: [], filtered: [], page: 1, size: 12, meta:{}, feeds:{}, failures:[]};

function sourceLink(permit) {
  const url = new URL('https://data.cityofchicago.org/resource/ydr8-5enu.json');
  url.searchParams.set('$where', `permit_='${String(permit).replaceAll("'", "''")}'`);
  return url.toString();
}
function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function prettyDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric', timeZone:'UTC'});
}
function initFilters() {
  $('trade').replaceChildren(new Option('All trades',''));
  $('ward').replaceChildren(new Option('All areas',''));
  const trades = [...new Set(state.items.map(x => x.trade).filter(Boolean))].sort();
  trades.forEach(t => { const op=el('option','',t);op.value=t;$('trade').append(op); });
  const wards = [...new Set(state.items.map(x => x.ward).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  wards.forEach(w => {const op=el('option','',`Ward ${w}`);op.value=w;$('ward').append(op);});
}
function updateStats() {
  const items=state.filtered;
  $('stat-records').textContent=number.format(items.length);
  const cost = items.reduce((sum,x) => sum+(typeof x.cost==='number'?x.cost:0),0);
  $('stat-value').textContent=cost>=1000000?`$${(cost/1e6).toFixed(1)}M`:money.format(cost);
  $('stat-trades').textContent=String(new Set(items.map(x=>x.trade)).size);
  $('stat-date').textContent=items.length ? (items[0].date_precision==='year' ? String(items[0].permit_year) + ' (year)' : prettyDate(items[0].issue_date)) : '—';
  const enabled=Object.keys(state.feeds).length;
  $('update-status').textContent=`${enabled}/5 official data feeds available across four markets`;
}
function filter() {
  const q=$('search').value.toLowerCase().trim();
  const market=$('market').value;
  const trade=$('trade').value, ward=$('ward').value, minimum=Number($('min-cost').value);
  state.filtered = state.items.filter(p =>
    (!market || market==='all' || p.market===market) &&
    (!trade || p.trade===trade) && (!ward || String(p.ward)===ward) &&
    (!minimum || (typeof p.cost==='number' && p.cost>=minimum)) &&
    (!q || [p.address,p.description,p.trade,p.permit_type,p.id].some(v=>String(v||'').toLowerCase().includes(q)))
  );
  state.filtered.sort((a,b)=>b.issue_date.localeCompare(a.issue_date));
  state.page=1; updateStats(); render();
}
function render() {
  const tbody=$('rows'); tbody.replaceChildren();
  const offset=(state.page-1)*state.size;
  const subset=state.filtered.slice(offset,offset+state.size);
  for(const p of subset) {
    const tr=el('tr');
    tr.append(el('td','',p.date_precision==='year' ? `${p.permit_year} · year only` : prettyDate(p.issue_date)));
    const location=el('td');
    location.append(el('div','market-mini',p.scope || (MARKETS[p.market] || p.market)));
    location.append(el('div','location',p.address || 'Address not supplied'));
    location.append(el('div','desc',p.description || p.work_type || p.permit_type || 'No work description'));
    tr.append(location);
    const cat=el('td');cat.append(el('span','tag',p.trade || 'Other'));tr.append(cat);
    tr.append(el('td','cost',typeof p.cost==='number'?money.format(p.cost):'Not reported'));
    const linkCell=el('td');
    if(state.feeds[p.market]?.meta?.mode==='demo') linkCell.append(el('span','','Demo only'));
    else {
      const link=el('a','source-link','Official source ↗');
      link.href=p.market==='chicago'?sourceLink(p.id):(p.source || SOURCES[p.market]);
      link.target='_blank';link.rel='noopener noreferrer';linkCell.append(link);
    }
    tr.append(linkCell); tbody.append(tr);
  }
  $('empty-state').hidden=state.filtered.length!==0;
  $('result-count').textContent=`${number.format(state.filtered.length)} matching records · ${Object.keys(state.feeds).length} active feeds`;
  const pages=Math.max(1,Math.ceil(state.filtered.length/state.size));
  $('page-label').textContent=`Page ${state.page} of ${pages}`;
  $('prev-page').disabled=state.page<=1;
  $('next-page').disabled=state.page>=pages;
}
function csvCell(value) {
  let s = String(value ?? '');
  // Mitigate CSV formula injection when opened in Excel/Sheets.
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"','""')}"`;
}
function exportCSV() {
  const columns=['market','id','issue_date','date_precision','address','trade','permit_type','work_type','description','cost','ward','source'];
  const csv=[columns.join(','),...state.filtered.map(p=>columns.map(k=>csvCell(p[k])).join(','))].join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=el('a');a.href=url;a.download='buildpulse-north-america-permits.csv';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function validWaitlistEndpoint() {
  const raw = String(window.BUILDPULSE_WAITLIST_ENDPOINT || '').trim();
  // Only send personal data to the expressly configured Supabase project.
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/buildpulse-waitlist\/?$/.test(raw)) return null;
  return raw;
}
async function subscribe(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const note = $('form-state');
  const endpoint = validWaitlistEndpoint();
  if (!endpoint) {
    note.textContent = 'The free updates interest list is temporarily unavailable. No information has been sent.';
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  note.textContent = 'Submitting your free updates request...';
  const formData = new FormData(form);
  const data = {
    email: String(formData.get('email') || ''),
    trade: String(formData.get('trade') || ''),
    company: String(formData.get('company') || ''),
    requested_plan: String(formData.get('requested_plan') || 'not_sure'),
    wants_pilot: formData.get('wants_pilot') === 'yes',
    consent_to_contact: formData.get('consent_to_contact') === 'yes',
    website: String(formData.get('website') || ''),
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    const payload = await res.json();
    if (!res.ok || !payload.ok) throw new Error(payload.error || 'Could not save your request.');
    form.reset();
    note.textContent = 'Thank you. Your early-access interest has been recorded. No payment has been taken.';
  } catch (err) {
    note.textContent = `Your request was not confirmed. Please try again later. (${err.message})`;
  } finally {
    submit.disabled = false;
  }
}
async function start() {
  const market = new URLSearchParams(location.search).get('market');
  const selector = $('market');
  if (Array.from(selector.options).some(option => option.value === market)) {
    selector.value = market;
  }
  $('search').addEventListener('input',filter);
  ['market','trade','ward','min-cost'].forEach(id=>$(id).addEventListener('change',filter));
  $('prev-page').addEventListener('click',()=>{state.page--;render();});
  $('next-page').addEventListener('click',()=>{state.page++;render();});
  $('download-csv').addEventListener('click',exportCSV);
  const waitlistForm = $('waitlist-form');
  waitlistForm.addEventListener('submit', subscribe);
  if (!validWaitlistEndpoint()) {
    const button = waitlistForm.querySelector('button[type="submit"]');
    button.disabled = true;
    button.title = 'Free updates signup is currently unavailable';
    $('form-state').textContent = 'Free updates signup is temporarily unavailable.';
  } else {
    const button = waitlistForm.querySelector('button[type="submit"]');
    button.disabled = false;
    button.textContent = 'Join the free updates interest list →';
    $('form-state').textContent = 'No payment is required. Your email and trade are stored privately to contact you about future free updates.';
  }
  const feeds = [
    ['chicago', './data/permits.json'],
    ['dc', './data/dc.json'],
    ['philadelphia', './data/philadelphia.json'],
    ['delaware', './data/delaware.json'],
    ['sussex', './data/sussex.json'],
  ];
  const outcomes = await Promise.all(feeds.map(async ([market, path]) => {
    try {
      const res = await fetch(path, {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      if (!Array.isArray(data.items) || !data.meta || data.meta.mode!=='live') throw new Error('No verified live feed');
      return {market,data};
    } catch (error) { return {market,error:String(error)}; }
  }));
  for (const result of outcomes) {
    if (result.error) {state.failures.push(result.market); continue;}
    state.feeds[result.market] = result.data;
    const displayMarket = result.market === 'sussex' ? 'delaware' : result.market;
    state.items.push(...result.data.items.map(item=>({...item,market:displayMarket,scope:result.data.meta.scope || ''})));
  }
  state.items.sort((a,b)=>b.issue_date.localeCompare(a.issue_date));
  const freshness = $('feed-freshness');
  for (const [market, data] of Object.entries(state.feeds)) {
    const retrieved = Date.parse(data.meta.retrieved_at);
    const date = Number.isFinite(retrieved)
      ? new Date(retrieved).toISOString().slice(0, 10) : 'unknown';
    const delayed = ['chicago', 'dc', 'philadelphia', 'sussex'].includes(market)
      && Date.now() - retrieved > 3 * 86400000;
    freshness.append(el('li', '', `${MARKETS[market]}: ${date}${delayed ? ' (refresh delayed)' : ''}`));
  }
  const failed = state.failures.map(m=>MARKETS[m]).join(', ');
  if (failed) {
    $('error-banner').hidden=false;
    $('error-banner').textContent='Feeds not yet available: '+failed+'. Only available sources are shown; no records are fabricated.';
  }
  if (!state.items.length) {
    $('update-status').textContent='No live data available';
    $('result-count').textContent='0 records';
    return;
  }
  initFilters(); filter();

}
document.addEventListener('DOMContentLoaded',start);
