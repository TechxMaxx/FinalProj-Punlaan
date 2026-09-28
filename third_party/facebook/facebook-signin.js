/* facebook-signin.js — Connects the existing "Facebook" button (#facebookBtn) to Facebook Login.
 * Clicking the button opens Facebook's login popup, then sends the
 * access token to facebook_auth.php, which verifies it and logs in / registers the user.
 * Requires third_party/social-auth.js.
 */

(function () {
  // Folder this script lives in, so PHP paths work from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, "");

  let ready = false;
  // Why the button isn't working yet (shown when clicked)
  let notReadyMessage = "Facebook login is still loading. Please try again.";

  /* ============ LOAD FACEBOOK SDK ============ */
  async function init() {
    try {
      const response = await fetch(BASE + "facebook_config.php");
      const config = await response.json();

      if (!config.app_id) {
        notReadyMessage = "Facebook login isn't set up yet: add your App ID and App Secret in third_party/facebook/facebook_config.php.";
        console.warn(notReadyMessage);
        return;
      }

      window.fbAsyncInit = () => {
        FB.init({
          appId: config.app_id,
          cookie: false,
          xfbml: false,
          version: config.version
        });
        ready = true;
      };

      const sdk = document.createElement("script");
      sdk.src = "https://connect.facebook.net/en_US/sdk.js";
      sdk.async = true;
      sdk.defer = true;
      sdk.crossOrigin = "anonymous";
      sdk.onerror = () => {
        notReadyMessage = "Could not load Facebook. Check your internet connection or turn off your ad blocker.";
      };
      document.head.appendChild(sdk);
    } catch (err) {
      // PHP didn't run — page was opened as a file or through Live Server
      notReadyMessage = "Open this page through http://localhost/punlaan/ (XAMPP Apache must be running).";
      console.error(err);
    }
  }

  init();

  /* ============ BUTTON CLICK ============ */
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("facebookBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!ready) {
        showToast(notReadyMessage, true);
        return;
      }
      if (socialStoreNameMissing()) return;

      // Must run directly in the click so the popup isn't blocked
      FB.login((response) => {
        if (response.status !== "connected") return; // user cancelled
        socialSubmit(BASE + "facebook_auth.php", response.authResponse.accessToken, "Facebook");
      }, { scope: "public_profile,email" });
    });
  });
})();
