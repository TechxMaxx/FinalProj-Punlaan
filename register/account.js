/* account.js — Login & Register page logic (front-end only) */
console.log("account.js loaded");

/* ============ PASSWORD VISIBILITY ============ */
// Hidden password → crossed-out eye; shown password → open eye
const EYE_OPEN = '<svg class="eye-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CROSSED = '<svg class="eye-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

function setEyeIcon(btn, input) {
  const hidden = input.type === 'password';
  btn.innerHTML = hidden ? EYE_CROSSED : EYE_OPEN;
  btn.setAttribute('aria-label', hidden ? 'Show password' : 'Hide password');
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  setEyeIcon(btn, input);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.auth-eye-btn').forEach((btn) => {
    const input = btn.parentElement.querySelector('input');
    if (input) setEyeIcon(btn, input);
  });
});
/* ============ PASSWORD STRENGTH ============ */
function checkPasswordStrength(value) {
  const bar = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  const wrap = document.getElementById('passwordStrength');
  if (!bar) return;

  if (value.length === 0) { wrap.hidden = true; return; }
  wrap.hidden = false;

  let score = 0;
  if (value.length >= 8)  score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const levels = [
    { pct: '20%', color: '#e63946', text: 'Weak' },
    { pct: '40%', color: '#f4a261', text: 'Fair' },
    { pct: '60%', color: '#f4a261', text: 'Fair' },
    { pct: '80%', color: '#52b788', text: 'Good' },
    { pct: '100%',color: '#2d6a4f', text: 'Strong' },
  ];
  const level = levels[Math.min(score - 1, 4)] || levels[0];
  bar.style.width = level.pct;
  bar.style.background = level.color;
  label.textContent = level.text;
  label.style.color = level.color;
}

/* ============ TOAST ============ */
let toastTimer = null;
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast toast--show' + (isError ? ' toast--error' : '');
  // Errors stay longer so they can be read; a new toast restarts the timer
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, isError ? 5000 : 3000);
}

/* ============ RETURN TO PAGE AFTER LOGIN ============ */
// guest-mode.js sends visitors here as Login.html?next=/path/to/page
// Only pages on this site are allowed (no other websites).
function nextPage() {
  const next = new URLSearchParams(window.location.search).get('next') || '';
  if (next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
    return next;
  }
  return '../FrontEnd/HOME.html';
}

// Login.html / Register.html links, keeping ?next=
function authPage(page) {
  const next = new URLSearchParams(window.location.search).get('next');
  return next ? page + '?next=' + encodeURIComponent(next) : page;
}

// Carry ?next= across the "Create one" / "Sign in" links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href="Login.html"], a[href="Register.html"]').forEach(link => {
    link.href = authPage(link.getAttribute('href'));
  });
});

/* ============ FORGOT PASSWORD LINK ============ */
// Carry the email already typed on the Login page over to the Forgot Password page
document.addEventListener('DOMContentLoaded', () => {
  const link = document.getElementById('forgotLink');
  const emailInput = document.getElementById('email');
  if (!link || !emailInput) return;
  link.addEventListener('click', () => {
    const email = emailInput.value.trim();
    link.href = 'ForgotPassword.html' + (email ? '?email=' + encodeURIComponent(email) : '');
  });
});

/* ============ LOGIN ERROR (red text under the fields) ============ */
function escapeText(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

function showLoginError(result) {
    const box = document.getElementById('loginError');
    if (!box) { showToast(result.message, true); return; }

    let html = escapeText(result.message || 'Could not sign in.');

    // Email not registered yet → offer to create an account with it
    if (result.code === 'no_account') {
        const email = document.getElementById('email').value.trim();
        const href = authPage('Register.html') + (authPage('Register.html').includes('?') ? '&' : '?') +
            'email=' + encodeURIComponent(email);
        html += ' <a href="' + escapeText(href) + '">Create an account</a>';
    }

    // "No account" belongs under the email box; other problems above Sign In
    const target = result.code === 'no_account' && document.getElementById('emailNote')
        ? document.getElementById('emailNote')
        : box;

    target.innerHTML = html;
    target.hidden = false;

    ['email', 'password'].forEach(id => {
        document.getElementById(id)?.classList.toggle('auth-input--error', result.field === id);
    });
    if (result.field) document.getElementById(result.field)?.focus();
}

function clearLoginError() {
    const box = document.getElementById('loginError');
    if (box) box.hidden = true;
    const note = document.getElementById('emailNote');
    if (note) note.hidden = true;
    ['email', 'password'].forEach(id => document.getElementById(id)?.classList.remove('auth-input--error'));
}

// Hide the error again as soon as the user edits the email or password
document.addEventListener('DOMContentLoaded', () => {
    ['email', 'password'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', clearLoginError);
    });

    // Register page opened from "Create an account" → fill in the email
    const email = new URLSearchParams(window.location.search).get('email');
    const regEmail = document.getElementById('regEmail');
    if (email && regEmail && !regEmail.value) regEmail.value = email;
});


/* ============ EMAIL CHECK WHILE TYPING ============
   Login:    "No account found with this email. Create an account"
   Register: "This email already has an account. Sign in"
   Runs when the person leaves the email box (or pauses typing). */
document.addEventListener('DOMContentLoaded', () => {
    const loginEmail = document.getElementById('email');
    const regEmail = document.getElementById('regEmail');
    const input = loginEmail || regEmail;
    if (!input || !input.closest('form')) return;

    const isLogin = input === loginEmail;

    // Red note right under the email box
    const note = document.createElement('div');
    note.className = 'auth-error auth-error--field';
    note.id = 'emailNote';
    note.hidden = true;
    note.setAttribute('role', 'alert');
    input.closest('.auth-field').appendChild(note);

    // Sign-in page opened from "Sign in instead" → fill in the email
    const fromLink = new URLSearchParams(window.location.search).get('email');
    if (isLogin && fromLink && !input.value) input.value = fromLink;

    let timer = null;
    let lastChecked = '';

    function hide() {
        note.hidden = true;
        input.classList.remove('auth-input--error');
    }

    async function check() {
        const value = input.value.trim();
        if (value === lastChecked) return;
        lastChecked = value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { hide(); return; }

        const data = new FormData();
        data.append('email', value);
        let result;
        try {
            result = await (await fetch('check_email.php', { method: 'POST', body: data })).json();
        } catch (e) { return; }
        if (!result.success || input.value.trim() !== value) return;

        const withNext = (page) => {
            const url = authPage(page);
            return url + (url.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(value);
        };

        if (isLogin && !result.exists) {
            note.innerHTML = 'No account found with this email. ' +
                '<a href="' + escapeText(withNext('Register.html')) + '">Create an account</a>';
        } else if (!isLogin && result.exists) {
            note.innerHTML = 'This email already has an account. ' +
                '<a href="' + escapeText(withNext('Login.html')) + '">Sign in instead</a>';
        } else {
            hide();
            return;
        }

        note.hidden = false;
        input.classList.add('auth-input--error');
    }

    input.addEventListener('blur', check);
    input.addEventListener('input', () => {
        hide();
        clearTimeout(timer);
        timer = setTimeout(check, 900);
    });

    // Filled in already (e.g. from "Create an account" or the browser)
    if (input.value.trim()) check();
});

/* ============ LOGIN ============ */
async function handleLogin(e) {
    e.preventDefault();
    clearLoginError();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    const text = btn.querySelector(".auth-btn__text");
    const loader = btn.querySelector(".auth-btn__loader");
    btn.disabled = true;
    text.hidden = true;
    loader.hidden = false;
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("remember", document.getElementById("remember")?.checked ? "1" : "0");
    try {
        const response = await fetch("login.php", {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        console.log(result);
        if (result.success) {
            showToast(result.message);
            setTimeout(() => {
                window.location.href = nextPage();
            }, 1000);
        } else if (result.verify) {
            // Email not verified yet → the 6-digit code page
            window.location.href = authPage('VerifyEmail.html');
            return;
        } else {
            if (result.vendor_pending) {

    alert(
        "Your vendor application is still under review.\n\n" +
        "You will be able to access your vendor account once an administrator approves it.\n\n" +
        "Soon you'll also be able to upload your verification documents here."
    );

}
else {

    showLoginError(result);

}
        }
    } catch (err) {
        console.error(err);
        showToast("Unable to connect to server.", true);
    }
    btn.disabled = false;
    text.hidden = false;
    loader.hidden = true;
}
/* ============ REGISTER ============ */
async function handleRegister(e) {
console.log("Register button clicked");
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if(password !== confirmPassword){
        showToast("Passwords do not match.", true);
        return;
    }
    const btn = document.getElementById("registerBtn");
    const text = btn.querySelector(".auth-btn__text");
    const loader = btn.querySelector(".auth-btn__loader");
    btn.disabled = true;
    text.hidden = true;
    loader.hidden = false;
    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("email", email);
    formData.append("password", password);

   try {

    console.log("Sending request...");

    try {

    console.log("Sending request...");

    const response = await fetch("register.php", {
        method: "POST",
        body: formData
    });

    console.log("Status:", response.status);

    const result = await response.json();

    console.log("Server returned:", result);

    if (result.success) {

        showToast(result.message);

        // New email sign-ups confirm the address with a 6-digit code
        setTimeout(() => {
            window.location.href = authPage(result.verify ? "VerifyEmail.html" : "Login.html");
        }, 1200);

        if (result.verify) return;

    } else {

        showToast(result.message, true);

    }

} catch (error) {

    console.error(error);
    showToast("Unable to connect to server.", true);

}
} catch (error) {

    console.error(error);

}

    btn.disabled = false;
    text.hidden = false;
    loader.hidden = true;
}
 