'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('sponsor-form');
  const state=document.getElementById('sponsor-form-status');
  if(!form||!state)return;
  const prefill=new URLSearchParams(location.search).get('market')||'';
  if(['all','chicago','dc','philadelphia','delaware'].includes(prefill)){
    form.elements.namedItem('market').value=prefill;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;
    state.textContent='Submitting your sponsorship inquiry...';
    const data=new FormData(form);
    const payload={
      kind:'sponsor',company:String(data.get('company')||''),
      contact_name:String(data.get('contact_name')||''),
      email:String(data.get('email')||''),
      website_url:String(data.get('website_url')||''),
      market:String(data.get('market')||'all'),
      placement:String(data.get('placement')||'market'),
      budget:String(data.get('budget')||'undecided'),
      notes:String(data.get('notes')||''),
      consent_to_contact:data.get('consent_to_contact')==='yes',
      website_trap:String(data.get('website_trap')||''),
    };
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('https://lsryeakefctcsdhasuek.supabase.co/functions/v1/buildthepulse-growth',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),signal:controller.signal,
      });
      const result=await response.json();
      if(!response.ok||result.ok!==true)throw Error(result.error||'Could not save inquiry');
      form.reset();
      state.textContent='Thank you. Your inquiry was received. There is no payment or binding order.';
    }catch(error){
      state.textContent='Your inquiry could not be confirmed. Please try again. ('+
        String(error.message||error)+')';
    }finally{clearTimeout(timer);button.disabled=false;}
  });
  form.querySelector('button[type=submit]').disabled = false;
});
