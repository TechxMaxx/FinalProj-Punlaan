/* auth-transition.js — which way the sign-in pages slide (see account.css
   "PAGE TRANSITION"). Going deeper (Sign in → Register → Verify) slides
   forward; going back slides the other way. Loaded in <head> so it runs
   before the new page is shown. Browsers without view transitions ignore it. */
(function () {
  'use strict';

  // Sign in = 0 · Register / Forgot password = 1 · Verify / Reset = 2
  function step(path) {
    if (/Register|ForgotPassword/i.test(path)) return 1;
    if (/VerifyEmail|ResetPassword/i.test(path)) return 2;
    return 0;
  }

  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return;

    const from = window.navigation && navigation.activation && navigation.activation.from;
    if (!from || !from.url) return;

    const back = step(new URL(from.url).pathname) > step(location.pathname);
    event.viewTransition.types.add(back ? 'back' : 'forward');
  });
})();
