/* google-signin.js — Connects the existing "Google" button (#googleBtn) to Google Sign-In.
 * Clicking the button opens Google's account picker popup, then sends the
 * access token to google_auth.php, which verifies it and logs in / registers the user.
 * Requires third_party/social-auth.js.
 */

(function () {
  // Folder this script lives in, so PHP paths work from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, "");

  let tokenClient = null;
  // Why the button isn't working yet (shown when clicked)
  let notReadyMessage = "Google sign-in is still loading. Please try again.";

  /* ============ LOAD GOOGLE LIBRARY ============ */
  const gsi = document.createElement("script");
  gsi.src = "https://accounts.google.com/gsi/client";
  gsi.async = true;
  gsi.defer = true;
  gsi.onload = init;
  gsi.onerror = () => {
    notReadyMessage = "Could not load Google. Check your internet connection.";
  };
  document.head.appendChild(gsi);

  async function init() {
    try {
      const response = await fetch(BASE + "google_client.php", { cache: "no-store" });
      const config = await response.json();

      if (!config.client_id) {
        notReadyMessage = "Google login isn't set up on this copy of Punlaan: third_party/google/google_config.php has no Client ID. Get the latest project files.";
        console.warn(notReadyMessage);
        return;
      }

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.client_id,
        scope: "openid email profile",
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            showToast("Google sign-in failed.", true);
            return;
          }
          socialSubmit(BASE + "google_auth.php", tokenResponse.access_token, "Google");
        },
        error_callback: (err) => {
          // User closed the popup — nothing to report
          if (err.type !== "popup_closed") showToast("Google sign-in failed.", true);
        }
      });
    } catch (err) {
      // PHP didn't run — page was opened as a file or through Live Server
      notReadyMessage = "Open this page through http://localhost/punlaan/ (XAMPP Apache must be running).";
      console.error(err);
    }
  }

  /* ============ BUTTON CLICK ============ */
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("googleBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!tokenClient) {
        showToast(notReadyMessage, true);
        return;
      }
      if (socialStoreNameMissing()) return;

      tokenClient.requestAccessToken();
    });
  });
})();
