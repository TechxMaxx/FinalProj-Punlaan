/* verify-email.js — the 6-digit code page (VerifyEmail.html).
   Talks to verify_email.php. Typing / pasting fills the boxes; the code
   is sent automatically once all 6 digits are in. */
(function () {
  'use strict';

  const boxes = Array.from(document.querySelectorAll('.code-box'));
  const form = document.getElementById('verifyForm');
  const btn = document.getElementById('verifyBtn');
  const errorBox = document.getElementById('verifyError');
  const okBox = document.getElementById('verifyOk');
  const resendBtn = document.getElementById('resendBtn');
  let countdown = null;
  let busy = false;

  async function api(action, extra) {
    const response = await fetch('verify_email.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action }, extra || {}))
    });
    return response.json();
  }

  function code() {
    return boxes.map(b => b.value).join('');
  }

  function showError(message) {
    okBox.hidden = true;
    errorBox.textContent = message;
    errorBox.hidden = false;
    boxes.forEach(b => b.classList.add('code-box--error'));
  }

  function showOk(message) {
    errorBox.hidden = true;
    okBox.textContent = message;
    okBox.hidden = false;
  }

  function clearMessages() {
    errorBox.hidden = true;
    boxes.forEach(b => b.classList.remove('code-box--error'));
  }

  function update() {
    btn.disabled = busy || code().length !== 6;
  }

  function fill(from, digits) {
    digits.split('').forEach((d, i) => { if (boxes[from + i]) boxes[from + i].value = d; });
    const next = Math.min(from + digits.length, boxes.length - 1);
    boxes[next].focus();
    update();
    if (code().length === 6) submit();
  }

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      clearMessages();
      const digits = box.value.replace(/\D/g, '');
      box.value = '';
      if (digits) fill(i, digits.slice(0, boxes.length - i));
      else update();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        boxes[i - 1].value = '';
        boxes[i - 1].focus();
        update();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        boxes[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (!digits) return;
      e.preventDefault();
      clearMessages();
      fill(0, digits.slice(0, 6));
    });

    box.addEventListener('focus', () => box.select());
  });

  async function submit() {
    if (busy || code().length !== 6) return;
    busy = true;
    update();
    btn.querySelector('.auth-btn__text').hidden = true;
    btn.querySelector('.auth-btn__loader').hidden = false;

    try {
      const result = await api('verify', { code: code() });
      if (result.success) {
        showOk(result.message);
        setTimeout(() => { window.location.href = nextPage(); }, 900);
        return;
      }
      showError(result.message || 'That code isn\'t right.');
      boxes.forEach(b => { b.value = ''; });
      boxes[0].focus();
    } catch (e) {
      showError('Unable to connect. Please try again.');
    }

    busy = false;
    update();
    btn.querySelector('.auth-btn__text').hidden = false;
    btn.querySelector('.auth-btn__loader').hidden = true;
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });

  /* "Resend in 0:45" countdown */
  function startCountdown(seconds) {
    clearInterval(countdown);
    let left = Math.max(0, Number(seconds) || 0);

    const tick = () => {
      if (left <= 0) {
        clearInterval(countdown);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
        return;
      }
      resendBtn.disabled = true;
      resendBtn.textContent = 'Resend in ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      left--;
    };
    tick();
    countdown = setInterval(tick, 1000);
  }

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    clearMessages();
    try {
      const result = await api('resend');
      if (result.success) showOk(result.message);
      else showError(result.message);
      startCountdown(result.resend_in || 0);
    } catch (e) {
      showError('Unable to connect. Please try again.');
      startCountdown(0);
    }
  });

  document.getElementById('cancelBtn').addEventListener('click', async () => {
    try { await api('cancel'); } catch (e) { /* leave anyway */ }
    window.location.href = authPage('Login.html');
  });

  /* Start: who are we verifying? */
  (async () => {
    try {
      const status = await api('status');
      if (!status.success) {
        showError(status.message);
        boxes.forEach(b => { b.disabled = true; });
        resendBtn.disabled = true;
        return;
      }
      if (!status.pending) {
        window.location.href = nextPage();
        return;
      }
      document.getElementById('verifyEmail').textContent = status.email;
      startCountdown(status.resend_in);
      boxes[0].focus();
    } catch (e) {
      showError('Unable to connect. Please refresh the page.');
    }
  })();
})();
