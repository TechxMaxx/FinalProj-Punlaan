/* psgc.js — Philippine address lists from the PSGC API
 * (Philippine Standard Geographic Code, Philippine Statistics Authority).
 * Free, no API key: https://psgc.gitlab.io/api/
 *
 *   PSGC.regions()                 → [{code, name}]
 *   PSGC.provinces(regionCode)     → [{code, name}]   (empty for NCR)
 *   PSGC.cities(regionCode, provinceCode)
 *   PSGC.barangays(cityCode)
 *
 * Lists are sorted by name and cached in sessionStorage.
 */

(function () {

  const API = 'https://psgc.gitlab.io/api';

  // NCR (Metro Manila) has no provinces — cities hang directly off the region
  const NCR_REGION_CODE = '130000000';

  const memory = {};

  async function get(path) {

    if (memory[path]) return memory[path];

    const cacheKey = 'psgc:' + path;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return (memory[path] = JSON.parse(cached));
    } catch (e) { /* storage unavailable — just fetch */ }

    const response = await fetch(API + path);

    if (!response.ok) {
      throw new Error('Could not load address list (' + response.status + ').');
    }

    const list = (await response.json())
      .map(function (item) {
        return {
          code: item.code,
          // Show the familiar region name, e.g. "NCR – National Capital Region"
          name: item.regionName && item.regionName !== item.name
            ? item.regionName + ' – ' + item.name
            : item.name
        };
      })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });

    memory[path] = list;

    try { sessionStorage.setItem(cacheKey, JSON.stringify(list)); } catch (e) { /* ignore */ }

    return list;
  }

  window.PSGC = {

    NCR_REGION_CODE: NCR_REGION_CODE,

    isNCR: function (regionCode) {
      return regionCode === NCR_REGION_CODE;
    },

    regions: function () {
      return get('/regions/');
    },

    provinces: function (regionCode) {
      if (!regionCode || regionCode === NCR_REGION_CODE) return Promise.resolve([]);
      return get('/regions/' + regionCode + '/provinces/');
    },

    cities: function (regionCode, provinceCode) {
      if (regionCode === NCR_REGION_CODE) {
        return get('/regions/' + regionCode + '/cities-municipalities/');
      }
      if (!provinceCode) return Promise.resolve([]);
      return get('/provinces/' + provinceCode + '/cities-municipalities/');
    },

    barangays: function (cityCode) {
      if (!cityCode) return Promise.resolve([]);
      return get('/cities-municipalities/' + cityCode + '/barangays/');
    }
  };

})();
