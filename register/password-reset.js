/* password-reset.js — ForgotPassword.html and ResetPassword.html */

(function () {

  const $ = (id) => document.getElementById(id);

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.querySelector('.auth-btn__text').hidden = loading;
    btn.querySelector('.auth-btn__loader').hidden = !loading;
  }

  function showError(box, message) {
    box.textContent = message || '';
    box.hidden = !message;
  }


  /* ============ FORGOT PASSWORD ============ */

  const forgotForm = $('forgotForm');

  if (forgotForm) {

    const btn = $('forgotBtn');
    const error = $('forgotError');

    // Pre-fill the email typed on the Login page, if any
    const fromLogin = new URLSearchParams(location.search).get('email');
    if (fromLogin) $('email').value = fromLogin;

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = $('email').value.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(error, 'Please enter a valid email address.');
        $('email').focus();
        return;
      }

      showError(error, '');
      setLoading(btn, true);

      try {
        const body = new FormData();
        body.append('email', email);

        const response = await fetch('forgot_password.php', { method: 'POST', body });
        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        $('sentMessage').textContent = result.message;

        const devBox = $('devBox');
        devBox.hidden = !result.dev_reset_link;
        if (result.dev_reset_link) {
          $('devNotice').textContent = result.dev_notice;
          $('devLink').href = result.dev_reset_link;
        }

        $('requestStep').hidden = true;
        $('sentStep').hidden = false;

      } catch (err) {
        showError(error, err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(btn, false);
      }
    });

    $('tryAgainBtn').addEventListener('click', () => {
      $('sentStep').hidden = true;
      $('requestStep').hidden = false;
      $('email').focus();
    });
  }


  /* ============ RESET PASSWORD ============ */

  const resetForm = $('resetForm');

  if (resetForm) {

    const token = new URLSearchParams(location.search).get('token') || '';
    const btn = $('resetBtn');
    const error = $('resetError');

    function show(step) {
      ['checkingStep', 'invalidStep', 'resetStep', 'doneStep'].forEach((id) => {
        $(id).hidden = id !== step;
      });
    }

    function invalid(message) {
      if (message) $('invalidMessage').textContent = message;
      show('invalidStep');
    }

    // 1. Is the link still valid?
    fetch('reset_password.php?token=' + encodeURIComponent(token))
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) return invalid(result.message);
        $('resetFor').textContent = 'For ' + result.email_hint;
        show('resetStep');
        $('newPassword').focus();
      })
      .catch(() => invalid('Could not check your link. Please refresh the page.'));

    // Show / hide password (crossed eye while hidden — setEyeIcon from account.js when loaded)
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      const input = $(b.dataset.toggle);
      if (window.setEyeIcon) setEyeIcon(b, input);
      b.addEventListener('click', () => {
        input.type = input.type === 'text' ? 'password' : 'text';
        if (window.setEyeIcon) setEyeIcon(b, input);
        else b.setAttribute('aria-label', input.type === 'text' ? 'Hide password' : 'Show password');
      });
    });

    // Strength meter (same scale as the Register page)
    $('newPassword').addEventListener('input', (e) => {
      const v = e.target.value;
      const wrap = $('passwordStrength');
      wrap.hidden = v.length === 0;
      if (!v) return;

      let score = 0;
      if (v.length >= 8) score++;
      if (v.length >= 12) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;

      const levels = [
        ['20%', '#e63946', 'Weak'], ['40%', '#f4a261', 'Fair'], ['60%', '#f4a261', 'Fair'],
        ['80%', '#52b788', 'Good'], ['100%', '#2d6a4f', 'Strong'],
      ];
      const [pct, color, text] = levels[Math.max(0, Math.min(score - 1, 4))];
      $('strengthFill').style.width = pct;
      $('strengthFill').style.background = color;
      $('strengthLabel').textContent = text;
      $('strengthLabel').style.color = color;
    });

    // 2. Save
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pass = $('newPassword').value;
      const confirm = $('confirmPassword').value;

      if (pass.length < 8) return showError(error, 'Password must be at least 8 characters.');
      if (pass !== confirm) return showError(error, 'Passwords do not match.');

      showError(error, '');
      setLoading(btn, true);

      try {
        const body = new FormData();
        body.append('token', token);
        body.append('new_password', pass);
        body.append('confirm_password', confirm);

        const response = await fetch('reset_password.php', { method: 'POST', body });
        const result = await response.json();

        if (!result.success) {
          if (/expired|invalid/i.test(result.message)) return invalid(result.message);
          throw new Error(result.message);
        }

        // Remove the token from the address bar / history
        history.replaceState(null, '', 'ResetPassword.html');
        show('doneStep');

      } catch (err) {
        showError(error, err.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(btn, false);
      }
    });
  }

})();
