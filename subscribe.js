//
// Hero Download CTA flow:
//   1. User clicks "Download for Mac" — browser handles the .dmg via the
//      href + download attribute; we don't preventDefault.
//   2. A compact subscribe form fades in *below* the meta row. The
//      Download button stays visible — re-clicks still work.
//   3. On form submit we POST to /api/subscribe and show a success line.
//      Errors surface inline; the input stays so the user can retry.
//
// Intentionally not revealed on page load — the primary CTA is the
// download, the subscribe ask is a post-engagement second step.
//

(function () {
  const cta = document.querySelector('.hero-cta .cta');
  const subscribe = document.querySelector('.subscribe');
  const form = document.querySelector('.subscribe-form');
  const input = form && form.querySelector('.subscribe-input');
  const submit = form && form.querySelector('.subscribe-submit');
  const errorEl = document.querySelector('.subscribe-error');
  const successEl = document.querySelector('.subscribe-success');

  if (!cta || !subscribe || !form || !input || !submit || !errorEl || !successEl) return;

  let revealed = false;

  cta.addEventListener('click', function () {
    // Count every download click; the .dmg lives on another subdomain and
    // the `download` attribute keeps this page alive, so the beacon sends.
    if (window.plausible) window.plausible('Download');
    if (revealed) return;
    revealed = true;
    subscribe.hidden = false;
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();

    const email = input.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('That doesn\'t look like a valid email.');
      return;
    }

    const originalText = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'site_hero' }),
      });

      const data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        showError(data.error || 'Something went wrong. Try again.');
        submit.disabled = false;
        submit.textContent = originalText;
        return;
      }

      subscribe.hidden = true;
      successEl.hidden = false;

      if (window.plausible) {
        window.plausible('Subscribe', { props: { source: 'site_hero' } });
      }
    } catch (err) {
      showError('Network error. Try again.');
      submit.disabled = false;
      submit.textContent = originalText;
    }
  });
})();
