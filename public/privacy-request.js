'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('privacy-request-form');
  const status = document.getElementById('privacy-request-status');
  if (!form || !status) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    if (button) button.disabled = true;
    status.textContent = 'Submitting securely...';
    const entries = Object.fromEntries(new FormData(form).entries());
    const payload = {
      email: String(entries.email || ''),
      request_type: String(entries.request_type || ''),
      jurisdiction: String(entries.jurisdiction || ''),
      details: String(entries.details || ''),
      website: String(entries.website || ''),
    };
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 12000);
    try {
      const res = await fetch('https://lsryeakefctcsdhasuek.supabase.co/functions/v1/buildthepulse-privacy', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),signal:abort.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Unable to submit');
      form.reset();
      status.textContent='Your request was received for review. You may be asked to verify your identity before it can be fulfilled.';
    } catch (error) {
      status.textContent='Your request was not confirmed. Please try again. (' + String(error.message || error) + ')';
    } finally {clearTimeout(timeout);if(button)button.disabled=false;}
  });
});
