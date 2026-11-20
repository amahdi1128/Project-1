/* BuildThePulse privacy controls. Optional first-party audience measurement only after consent; no third-party ad tags installed. */
(() => {
  'use strict';
  const KEY = 'buildthepulse_privacy_choice_v3';
  const gpc = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const banner = document.getElementById('privacy-banner');
  const modal = document.getElementById('privacy-modal');
  const analyticsBox = document.getElementById('privacy-optional');
  const status = document.getElementById('privacy-status');

  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      return data && data.version === 3 && typeof data.optional === 'boolean' ? data : null;
    } catch { return null; }
  }
  function effective(data) {
    return !!(data && data.optional === true && !gpc);
  }
  function apply(data) {
    window.BuildThePulsePrivacy = Object.freeze({
      optionalAllowed: effective(data),
      globalPrivacyControl: gpc,
      thirdPartyAnalyticsEnabled: false,
      advertisingEnabled: false,
      sessionReplayEnabled: false,
    });
    if (analyticsBox) analyticsBox.checked = effective(data);
    if (status) status.textContent = gpc
      ? 'Your browser privacy signal is active; optional tracking is refused.'
      : 'Optional first-party audience measurement is '+(effective(data)?'enabled.':'off.')+' No third-party ad trackers are installed.';
    if (banner) banner.hidden = !!data || gpc;
    document.dispatchEvent(new CustomEvent('buildthepulse:privacychange',{detail:{analyticsAllowed:effective(data)}}));
  }
  function save(optional) {
    const record = {version: 3, optional: !gpc && optional === true, updatedAt: new Date().toISOString()};
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch { /* storage denied */ }
    apply(record);
    closeModal();
  }
  let trigger;
  function openModal() {
    if (!modal || modal.open) return;
    trigger = document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.showModal();
    (gpc ? document.getElementById('privacy-close') : analyticsBox)?.focus();
  }
  function closeModal() {
    if (!modal?.open) return;
    modal.close();
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    if (trigger && trigger !== document.body && !trigger.closest('[hidden]')) trigger.focus();
    else document.getElementById('privacy-settings-button')?.focus();
  }
  document.getElementById('privacy-reject')?.addEventListener('click', () => save(false));
  document.getElementById('privacy-accept')?.addEventListener('click', () => save(true));
  document.getElementById('privacy-settings')?.addEventListener('click', openModal);
  document.getElementById('privacy-settings-button')?.addEventListener('click', openModal);
  document.getElementById('privacy-save')?.addEventListener('click', () => save(!!analyticsBox?.checked));
  document.getElementById('privacy-close')?.addEventListener('click', closeModal);
  document.getElementById('privacy-modal')?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  modal?.addEventListener('cancel', event => {
    event.preventDefault();
    closeModal();
  });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) apply(read());
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) apply(read());
  });
  if (analyticsBox && gpc) { analyticsBox.checked = false; analyticsBox.disabled = true; }
  if (gpc && !read()) save(false);
  else apply(read());
  if (location.hash === '#privacy-choices') openModal();
  window.addEventListener('hashchange', () => {
    if (location.hash === '#privacy-choices') openModal();
  });
})();
