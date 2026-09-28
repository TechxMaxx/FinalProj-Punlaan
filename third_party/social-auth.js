/* social-auth.js — Shared helpers for Google / Facebook login buttons.
 * Load before google-signin.js / facebook-signin.js.
 * Uses showToast() from register/account.js.
 */

/* ============ STORE NAME CHECK ============ */
// Everyone signs up as a buyer now; selling is applied for later in
// Profile → Selling. Kept so google-signin.js / facebook-signin.js still work.
function socialStoreNameMissing() {
  return false;
}

/* ============ SEND TOKEN TO SERVER ============ */
async function socialSubmit(url, accessToken, label) {
  // Register page has the (hidden) account type field; Login page doesn't
  const isRegisterPage = !!document.getElementById("isVendor");

  const formData = new FormData();
  formData.append("access_token", accessToken);
  formData.append("mode", isRegisterPage ? "register" : "login");
  // Login page: "Keep me signed in"
  formData.append("remember", document.getElementById("remember")?.checked ? "1" : "0");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData
    });
    const result = await response.json();

    if (result.success) {
      showToast(result.message);
      setTimeout(() => {
        // Back to the page the visitor came from (nextPage() is in account.js)
        window.location.href = nextPage();
      }, 1000);
    } else if (result.vendor_pending) {
      alert(
        (result.registered ? `Your account was created with ${label}.\n\n` : "") +
        "Your vendor application is still under review.\n\n" +
        "You will be able to access your vendor account once an administrator approves it."
      );
      if (result.registered) window.location.href = authPage("Login.html");
    } else if (result.not_registered) {
      // Login page: no Punlaan account for this provider yet
      showToast(result.message, true);
      setTimeout(() => { window.location.href = authPage("Register.html"); }, 2000);
    } else if (result.already_registered) {
      // Register page: account exists already
      showToast(result.message, true);
      setTimeout(() => { window.location.href = authPage("Login.html"); }, 2000);
    } else {
      showToast(result.message, true);
    }
  } catch (err) {
    console.error(err);
    showToast("Unable to connect to server.", true);
  }
}
