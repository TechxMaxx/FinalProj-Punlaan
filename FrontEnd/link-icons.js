/* link-icons.js — Recognises a seller's link and picks its logo.
 *
 *   punlaanLinkInfo('https://facebook.com/mygarden')
 *     → { label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2', url, host }
 *
 * Icons come from Font Awesome 6 (already loaded on the shop pages).
 * Anything unknown shows as a website (globe).
 */

(function () {

  const SITES = [
    { match: /(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
    { match: /(^|\.)m\.me$|(^|\.)messenger\.com$/, label: 'Messenger', icon: 'fa-brands fa-facebook-messenger', color: '#0084FF' },
    { match: /(^|\.)instagram\.com$|(^|\.)instagr\.am$/, label: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E4405F' },
    { match: /(^|\.)tiktok\.com$/, label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
    { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/, label: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { match: /(^|\.)x\.com$|(^|\.)twitter\.com$/, label: 'X', icon: 'fa-brands fa-x-twitter', color: '#000000' },
    { match: /(^|\.)shopee\.ph$|(^|\.)shopee\.com/, label: 'Shopee', icon: 'fa-solid fa-bag-shopping', color: '#EE4D2D' },
    { match: /(^|\.)lazada\.com\.ph$|(^|\.)lazada\.com$/, label: 'Lazada', icon: 'fa-solid fa-cart-shopping', color: '#0F146D' },
    { match: /(^|\.)linkedin\.com$/, label: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: '#0A66C2' },
    { match: /(^|\.)pinterest\.com$|(^|\.)pin\.it$/, label: 'Pinterest', icon: 'fa-brands fa-pinterest', color: '#BD081C' },
    { match: /(^|\.)wa\.me$|(^|\.)whatsapp\.com$/, label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
    { match: /(^|\.)t\.me$|(^|\.)telegram\.me$/, label: 'Telegram', icon: 'fa-brands fa-telegram', color: '#26A5E4' },
    { match: /(^|\.)viber\.com$|(^|\.)vb\.me$/, label: 'Viber', icon: 'fa-brands fa-viber', color: '#7360F2' },
  ];

  window.punlaanLinkInfo = function (raw) {
    let url = String(raw || '').trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let host;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch (e) {
      return null;
    }
    if (!host.includes('.')) return null;

    const site = SITES.find((s) => s.match.test(host));

    return site
      ? { label: site.label, icon: site.icon, color: site.color, url, host }
      : { label: host, icon: 'fa-solid fa-globe', color: '#2d6a4f', url, host };
  };

})();
