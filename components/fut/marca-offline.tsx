/**
 * Tells the service worker this page rendered a fut for someone in it, so it
 * may keep the page for use with no signal (`public/sw.js`). It goes in the
 * page's content, not the fut's layout: the layout streams first, so a page
 * that then fails (the database down) would still carry a layout's mark and
 * be saved over the last good copy.
 */
export function MarcaOffline() {
  return <span hidden data-guardar-offline="" />;
}
