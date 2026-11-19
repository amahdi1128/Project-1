/* BuildThePulse: contextual sponsorships and strictly opt-in aggregate analytics.
 * No persistent user ID, fingerprint, IP address, cookies, or full URL is sent.
 * Google advertising tags are NOT loaded until separately configured and approved.
 */
'use strict';
(() => {
  const API='https://lsryeakefctcsdhasuek.supabase.co/functions/v1/buildthepulse-growth';
  const MARKETS={all:'North America',chicago:'Chicago',dc:'Washington, D.C.',philadelphia:'Philadelphia',delaware:'Delaware'};
  let pageLogged=false;
  let sponsors={};
  const $=id=>document.getElementById(id);
  const allowed=()=>window.BuildThePulsePrivacy?.optionalAllowed===true
      && navigator.globalPrivacyControl!==true;
  const currentMarket=()=>MARKETS[$('market')?.value] ? $('market').value : 'all';
  function track(event_type,market='all',placement=''){
    if(!allowed()) return;
    const path=['/advertise.html','/privacy.html'].includes(location.pathname)?location.pathname:'/';
    const body=JSON.stringify({kind:'event',event_type,market,path,placement});
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body,
      keepalive:true,credentials:'omit'}).catch(()=>{});
  }
  function firstPageView(){
    if(!pageLogged && allowed()){
      pageLogged=true;
      track('page_view',currentMarket());
    }
  }
  function safeSponsor(raw) {
    if(!raw || typeof raw!=='object' || !raw.name || !raw.url) return null;
    try{
      const u=new URL(String(raw.url));
      if(u.protocol!=='https:')return null;
      return {name:String(raw.name).slice(0,85),
        description:String(raw.description||'').slice(0,210),
        url:u.href};
    }catch {return null;}
  }
  function renderSlot(){
    const slot=$('sponsor-slot');
    if(!slot)return;
    const market=currentMarket();
    const sponsor=safeSponsor(sponsors[market]||sponsors.all);
    const label=$('sponsor-label'),brand=$('sponsor-brand'),
      copy=$('sponsor-copy'),link=$('sponsor-link');
    if(!label||!brand||!copy||!link)return;
    if(sponsor){
      label.textContent='PAID ADVERTISEMENT · '+MARKETS[market].toUpperCase();
      brand.textContent=sponsor.name;copy.textContent=sponsor.description;
      link.textContent='Visit sponsor ↗';
      link.href=sponsor.url;link.target='_blank';link.rel='noopener noreferrer sponsored';
      link.dataset.sponsorPlacement=market;
    }else{
      label.textContent='SPONSORSHIP AVAILABLE · '+MARKETS[market].toUpperCase();
      brand.textContent='Put your business in front of construction professionals';
      copy.textContent='Reach visitors researching permits in '+MARKETS[market]+'. Get in touch about sponsoring this market. No advertiser is currently displayed in this space.';
      link.textContent='Advertise in this market ↗';
      link.href='./advertise.html?market='+encodeURIComponent(market);
      link.removeAttribute('target');link.removeAttribute('rel');
      delete link.dataset.sponsorPlacement;
    }
  }
  function start(){
    firstPageView();
    document.addEventListener('buildthepulse:privacychange',firstPageView);
    const selector=$('market');
    if(selector)selector.addEventListener('change',()=>{
      renderSlot();
      track('market_select',currentMarket());
    });
    const sponsorLink=$('sponsor-link');
    if(sponsorLink)sponsorLink.addEventListener('click',()=>{
      if(sponsorLink.dataset.sponsorPlacement){
        track('sponsor_click',currentMarket(),sponsorLink.dataset.sponsorPlacement);
      }
    });
    fetch('./sponsors.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(d=>{
      sponsors=d?.sponsors||{};renderSlot();
    }).catch(renderSlot);
  }
  document.addEventListener('DOMContentLoaded',start);
  window.BuildThePulseAnalytics={track};
})();
