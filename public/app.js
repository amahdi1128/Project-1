'use strict';
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency:'USD', maximumFractionDigits:0 });
const number = new Intl.NumberFormat('en-US');
const state = {items: [], filtered: [], page: 1, size: 12, meta:{}};

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
  const trades = [...new Set(state.items.map(x => x.trade).filter(Boolean))].sort();
  trades.forEach(t => { const op=el('option','',t);op.value=t;$('trade').append(op); });
  const wards = [...new Set(state.items.map(x => x.ward).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
  wards.forEach(w => {const op=el('option','',`Ward ${w}`);op.value=w;$('ward').append(op);});
}
function updateStats() {
  const items=state.items;
  $('stat-records').textContent=number.format(items.length);
  const cost = items.reduce((sum,x) => sum+(typeof x.cost==='number'?x.cost:0),0);
  $('stat-value').textContent=cost>=1000000?`$${(cost/1e6).toFixed(1)}M`:money.format(cost);
  $('stat-trades').textContent=String(new Set(items.map(x=>x.trade)).size);
  $('stat-date').textContent=state.meta.mode==='demo'?'Demo':prettyDate(items[0]?.issue_date);
  $('update-status').textContent=state.meta.mode==='demo'?'Preview dataset':`Retrieved ${new Date(state.meta.retrieved_at).toLocaleString('en-US')}`;
}
function filter() {
  const q=$('search').value.toLowerCase().trim();
  const trade=$('trade').value, ward=$('ward').value, minimum=Number($('min-cost').value);
  state.filtered = state.items.filter(p =>
    (!trade || p.trade===trade) && (!ward || String(p.ward)===ward) &&
    (!minimum || (typeof p.cost==='number' && p.cost>=minimum)) &&
    (!q || [p.address,p.description,p.trade,p.permit_type,p.id].some(v=>String(v||'').toLowerCase().includes(q)))
  );
  state.page=1; render();
}
function render() {
  const tbody=$('rows'); tbody.replaceChildren();
  const offset=(state.page-1)*state.size;
  const subset=state.filtered.slice(offset,offset+state.size);
  for(const p of subset) {
    const tr=el('tr');
    tr.append(el('td','',prettyDate(p.issue_date)));
    const location=el('td');
    location.append(el('div','location',p.address || 'Address not supplied'));
    location.append(el('div','desc',p.description || p.work_type || p.permit_type || 'No work description'));
    tr.append(location);
    const cat=el('td');cat.append(el('span','tag',p.trade || 'Other'));tr.append(cat);
    tr.append(el('td','cost',typeof p.cost==='number'?money.format(p.cost):'Not reported'));
    const linkCell=el('td');
    if(state.meta.mode==='demo') linkCell.append(el('span','','Demo only'));
    else {
      const link=el('a','source-link','City record ↗'); link.href=sourceLink(p.id);link.target='_blank';link.rel='noopener noreferrer';linkCell.append(link);
    }
    tr.append(linkCell); tbody.append(tr);
  }
  $('empty-state').hidden=state.filtered.length!==0;
  $('result-count').textContent=`${number.format(state.filtered.length)} matching records`;
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
  const columns=['id','issue_date','address','trade','permit_type','work_type','description','cost','ward'];
  const csv=[columns.join(','),...state.filtered.map(p=>columns.map(k=>csvCell(p[k])).join(','))].join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=el('a');a.href=url;a.download=`buildpulse-chicago-${state.meta.mode==='demo'?'DEMO':'permits'}.csv`;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function subscribe(event) {
  event.preventDefault();
  const form=event.currentTarget;
  const note=$('form-state');
  note.textContent='Submitting...';
  const data=Object.fromEntries(new FormData(form).entries());
  try {
    const res=await fetch('./api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const payload=await res.json();
    if(!res.ok||!payload.ok) throw new Error(payload.error||'Unable to subscribe.');
    form.reset();note.textContent='Thanks. Your early-access request has been saved.';
  } catch(err) {
    note.textContent=`Signups are not active yet: ${err.message}. The site owner must configure Cloudflare D1.`;
  }
}
async function start() {
  $('search').addEventListener('input',filter);
  ['trade','ward','min-cost'].forEach(id=>$(id).addEventListener('change',filter));
  $('prev-page').addEventListener('click',()=>{state.page--;render();});
  $('next-page').addEventListener('click',()=>{state.page++;render();});
  $('download-csv').addEventListener('click',exportCSV);
  $('waitlist-form').addEventListener('submit',subscribe);
  try {
    const res=await fetch('./data/permits.json',{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(!Array.isArray(data.items)||!data.meta) throw new Error('Invalid data format');
    state.items=data.items;state.meta=data.meta;
    if(data.meta.mode==='demo') $('demo-banner').hidden=false;
    initFilters();updateStats();filter();
  } catch(err) {
    $('update-status').textContent='Data unavailable';
    $('error-banner').hidden=false;
    $('error-banner').textContent=`Could not load permit feed (${err.message}). If opening from a local file, run python -m http.server 8000 inside the public folder and open http://localhost:8000/`;
    $('result-count').textContent='0 records';
  }
}
document.addEventListener('DOMContentLoaded',start);
