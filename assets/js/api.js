/*
=========================================================
API.JS
WEBSITE PROFILE MAGANG PUSDATIN X BOC
UBP KARAWANG
=========================================================

Fungsi utama:
- Menghubungkan GitHub Pages dengan Google Apps Script.
- Mengambil data home, member, alter, dan divisions.
- Menangani timeout dan error API.
- Menyimpan cache data home di localStorage.
- Mengisi variabel global yang dipakai frontend lama.

Urutan pemanggilan script di HTML:

1. config.js
2. api.js
3. p3r-home.js / p3r-profile.js / p3r-alterprofile.js
=========================================================
*/

(function initializeP3RApi() {
  "use strict";


  /*
  =======================================================
  VALIDASI CONFIG
  =======================================================
  */

  if (
    !window.P3R_CONFIG ||
    typeof window.P3R_CONFIG !== "object"
  ) {
    console.error(
      "[P3R API] P3R_CONFIG tidak ditemukan. " +
      "Pastikan config.js dimuat sebelum api.js."
    );

    return;
  }


  const CONFIG =
    window.P3R_CONFIG;

  const API_URL =
    String(CONFIG.API_URL || "").trim();

  const REQUEST_TIMEOUT_MS =
    Number(CONFIG.REQUEST_TIMEOUT_MS) || 20000;


  if (!API_URL) {
    console.error(
      "[P3R API] API_URL kosong pada config.js."
    );

    return;
  }


  /*
  =======================================================
  LOGGING
  =======================================================
  */

  function debugLog() {
    if (!CONFIG.DEBUG) {
      return;
    }

    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R API]");

    console.info.apply(
      console,
      args
    );
  }


  function errorLog() {
    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R API]");

    console.error.apply(
      console,
      args
    );
  }


  /*
  =======================================================
  HELPER VALUE
  =======================================================
  */

  function isEmptyValue(value) {
    return (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    );
  }


  function asString(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();
  }


  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  /*
  =======================================================
  MEMBUAT URL API
  =======================================================
  */

  function buildApiUrl(
    action,
    parameters
  ) {
    const url =
      new URL(API_URL);

    const normalizedAction =
      asString(action);

    if (normalizedAction) {
      url.searchParams.set(
        "action",
        normalizedAction
      );
    }

    const params =
      parameters || {};

    Object.keys(params).forEach(
      function appendParameter(key) {
        const value =
          params[key];

        if (isEmptyValue(value)) {
          return;
        }

        url.searchParams.set(
          key,
          String(value)
        );
      }
    );

    return url.href;
  }


  /*
  =======================================================
  MEMBUAT ERROR
  =======================================================
  */

  function createApiError(
    message,
    options
  ) {
    const settings =
      options || {};

    const error =
      new Error(
        message ||
        "Terjadi kesalahan saat mengakses API."
      );

    error.name =
      settings.name ||
      "P3RApiError";

    error.code =
      settings.code ||
      "API_ERROR";

    error.status =
      settings.status || 0;

    error.action =
      settings.action || "";

    error.details =
      settings.details || null;

    error.payload =
      settings.payload || null;

    return error;
  }


  /*
  =======================================================
  PARSE JSON RESPONSE
  =======================================================
  */

  function parseJsonText(
    responseText,
    action
  ) {
    const text =
      asString(responseText);

    if (!text) {
      throw createApiError(
        "Server mengembalikan respons kosong.",
        {
          code:
            "EMPTY_RESPONSE",

          action:
            action
        }
      );
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw createApiError(
        "Respons server bukan JSON yang valid.",
        {
          code:
            "INVALID_JSON_RESPONSE",

          action:
            action,

          details:
            error.message,

          payload:
            text.slice(0, 500)
        }
      );
    }
  }


  /*
  =======================================================
  REQUEST GET
  =======================================================

  Tidak menggunakan custom header agar tidak memicu
  preflight CORS yang tidak diperlukan.

  Google Apps Script ContentService dapat melakukan
  redirect. Fetch browser akan mengikuti redirect
  tersebut secara otomatis.
  =======================================================
  */

  async function request(
    action,
    parameters,
    options
  ) {
    const settings =
      options || {};

    const requestParameters =
      Object.assign(
        {},
        parameters || {}
      );

    if (settings.cacheBust === true) {
      requestParameters._timestamp =
        Date.now();
    }

    const requestUrl =
      buildApiUrl(
        action,
        requestParameters
      );

    const hasAbortController =
      typeof AbortController !==
      "undefined";

    const controller =
      hasAbortController
        ? new AbortController()
        : null;

    let timeoutId = null;

    if (controller) {
      timeoutId =
        window.setTimeout(
          function abortRequest() {
            controller.abort();
          },
          settings.timeout ||
            REQUEST_TIMEOUT_MS
        );
    }

    debugLog(
      "Request dimulai.",
      {
        action:
          action,

        url:
          requestUrl
      }
    );

    try {
      const response =
        await fetch(
          requestUrl,
          {
            method:
              "GET",

            redirect:
              "follow",

            credentials:
              "omit",

            cache:
              "no-store",

            signal:
              controller
                ? controller.signal
                : undefined
          }
        );

      const responseText =
        await response.text();

      if (!response.ok) {
        throw createApiError(
          "Server mengembalikan HTTP " +
          response.status +
          ".",
          {
            code:
              "HTTP_ERROR",

            status:
              response.status,

            action:
              action,

            payload:
              responseText.slice(
                0,
                500
              )
          }
        );
      }

      const payload =
        parseJsonText(
          responseText,
          action
        );

      if (
        !payload ||
        payload.success !== true
      ) {
        const apiError =
          payload &&
          payload.error
            ? payload.error
            : {};

        throw createApiError(
          apiError.message ||
          "API gagal memproses permintaan.",
          {
            code:
              apiError.code ||
              "API_RESPONSE_ERROR",

            status:
              response.status,

            action:
              action,

            details:
              apiError.details ||
              null,

            payload:
              payload
          }
        );
      }

      debugLog(
        "Request berhasil.",
        {
          action:
            action,

          generatedAt:
            payload.generatedAt ||
            null
        }
      );

      return payload.data;
    } catch (error) {
      if (
        error &&
        error.name ===
        "AbortError"
      ) {
        const timeoutError =
          createApiError(
            "Permintaan ke server melebihi batas waktu.",
            {
              name:
                "P3RTimeoutError",

              code:
                "REQUEST_TIMEOUT",

              action:
                action
            }
          );

        errorLog(
          timeoutError
        );

        throw timeoutError;
      }

      if (
        error &&
        error.name ===
        "TypeError"
      ) {
        const networkError =
          createApiError(
            "Tidak dapat terhubung ke API. Periksa koneksi internet atau deployment Apps Script.",
            {
              name:
                "P3RNetworkError",

              code:
                "NETWORK_ERROR",

              action:
                action,

              details:
                error.message
            }
          );

        errorLog(
          networkError
        );

        throw networkError;
      }

      errorLog(
        error
      );

      throw error;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(
          timeoutId
        );
      }
    }
  }


  /*
  =======================================================
  LOCAL STORAGE
  =======================================================
  */

  function canUseLocalStorage() {
    try {
      const testKey =
        "__p3r_storage_test__";

      window.localStorage.setItem(
        testKey,
        "1"
      );

      window.localStorage.removeItem(
        testKey
      );

      return true;
    } catch (error) {
      return false;
    }
  }


  const localStorageAvailable =
    canUseLocalStorage();


  function getCacheConfig() {
    return (
      CONFIG.CACHE &&
      typeof CONFIG.CACHE === "object"
    )
      ? CONFIG.CACHE
      : {};
  }


  function isCacheEnabled() {
    const cacheConfig =
      getCacheConfig();

    return (
      cacheConfig.ENABLED === true &&
      localStorageAvailable
    );
  }


  function readHomeCache() {
    if (!isCacheEnabled()) {
      return null;
    }

    const cacheConfig =
      getCacheConfig();

    try {
      const cachedText =
        window.localStorage.getItem(
          cacheConfig.HOME_KEY
        );

      const cachedTimestamp =
        Number(
          window.localStorage.getItem(
            cacheConfig.HOME_TIMESTAMP_KEY
          )
        );

      if (
        !cachedText ||
        !Number.isFinite(
          cachedTimestamp
        )
      ) {
        return null;
      }

      const cacheAge =
        Date.now() -
        cachedTimestamp;

      const ttl =
        Number(
          cacheConfig.TTL_MS
        ) || 0;

      if (
        ttl > 0 &&
        cacheAge > ttl
      ) {
        clearHomeCache();

        return null;
      }

      const parsed =
        JSON.parse(cachedText);

      if (!isPlainObject(parsed)) {
        clearHomeCache();

        return null;
      }

      debugLog(
        "Data home diambil dari cache.",
        {
          ageMs:
            cacheAge
        }
      );

      return parsed;
    } catch (error) {
      console.warn(
        "[P3R API] Cache home tidak dapat dibaca.",
        error
      );

      clearHomeCache();

      return null;
    }
  }


  function writeHomeCache(data) {
    if (!isCacheEnabled()) {
      return;
    }

    const cacheConfig =
      getCacheConfig();

    try {
      window.localStorage.setItem(
        cacheConfig.HOME_KEY,
        JSON.stringify(data)
      );

      window.localStorage.setItem(
        cacheConfig.HOME_TIMESTAMP_KEY,
        String(Date.now())
      );

      debugLog(
        "Data home disimpan ke cache."
      );
    } catch (error) {
      console.warn(
        "[P3R API] Data home tidak dapat disimpan ke cache.",
        error
      );
    }
  }


  function clearHomeCache() {
    if (!localStorageAvailable) {
      return;
    }

    const cacheConfig =
      getCacheConfig();

    try {
      if (cacheConfig.HOME_KEY) {
        window.localStorage.removeItem(
          cacheConfig.HOME_KEY
        );
      }

      if (
        cacheConfig.HOME_TIMESTAMP_KEY
      ) {
        window.localStorage.removeItem(
          cacheConfig.HOME_TIMESTAMP_KEY
        );
      }

      debugLog(
        "Cache home dihapus."
      );
    } catch (error) {
      console.warn(
        "[P3R API] Cache home tidak dapat dihapus.",
        error
      );
    }
  }


  /*
  =======================================================
  NORMALISASI DATA HOME
  =======================================================
  */

  function normalizeHomeData(data) {
    const source =
      isPlainObject(data)
        ? data
        : {};

    const members =
      Array.isArray(source.members)
        ? source.members
        : [];

    const alters =
      Array.isArray(source.alters)
        ? source.alters
        : [];

    const divisions =
      Array.isArray(source.divisions)
        ? source.divisions
        : [];

    const sourceSummary =
      isPlainObject(source.summary)
        ? source.summary
        : {};

    return {
      members:
        members,

      alters:
        alters,

      divisions:
        divisions,

      summary: {
        totalMembers:
          Number.isFinite(
            Number(
              sourceSummary.totalMembers
            )
          )
            ? Number(
                sourceSummary.totalMembers
              )
            : members.length,

        totalAlters:
          Number.isFinite(
            Number(
              sourceSummary.totalAlters
            )
          )
            ? Number(
                sourceSummary.totalAlters
              )
            : alters.length,

        totalDivisions:
          Number.isFinite(
            Number(
              sourceSummary.totalDivisions
            )
          )
            ? Number(
                sourceSummary.totalDivisions
              )
            : divisions.length
      }
    };
  }


  /*
  =======================================================
  PING
  =======================================================
  */

  async function ping() {
    return request(
      CONFIG.API_ACTIONS.PING,
      {},
      {
        cacheBust:
          true
      }
    );
  }


  /*
  =======================================================
  HOME
  =======================================================
  */

  async function getHomeData(options) {
    const settings =
      options || {};

    const forceRefresh =
      settings.forceRefresh === true;

    if (!forceRefresh) {
      const cached =
        readHomeCache();

      if (cached) {
        return normalizeHomeData(
          cached
        );
      }
    }

    const data =
      await request(
        CONFIG.API_ACTIONS.HOME,
        {},
        {
          cacheBust:
            forceRefresh
        }
      );

    const normalized =
      normalizeHomeData(
        data
      );

    writeHomeCache(
      normalized
    );

    return normalized;
  }


  /*
  =======================================================
  MEMBERS
  =======================================================
  */

  async function getMembers(options) {
    const settings =
      options || {};

    const data =
      await request(
        CONFIG.API_ACTIONS.MEMBERS,
        {
          division:
            settings.division || "",

          search:
            settings.search || ""
        },
        {
          cacheBust:
            settings.forceRefresh ===
            true
        }
      );

    return {
      members:
        Array.isArray(
          data &&
          data.members
        )
          ? data.members
          : [],

      total:
        Number(
          data &&
          data.total
        ) || 0,

      filter:
        isPlainObject(
          data &&
          data.filter
        )
          ? data.filter
          : {}
    };
  }


  /*
  =======================================================
  MEMBER
  =======================================================
  */

  async function getMember(memberId) {
    const normalizedId =
      asString(memberId);

    if (!normalizedId) {
      throw createApiError(
        "ID member wajib diisi.",
        {
          code:
            "MISSING_MEMBER_ID",

          action:
            CONFIG.API_ACTIONS.MEMBER
        }
      );
    }

    const data =
      await request(
        CONFIG.API_ACTIONS.MEMBER,
        {
          id:
            normalizedId
        }
      );

    return {
      member:
        isPlainObject(
          data &&
          data.member
        )
          ? data.member
          : null,

      alter:
        isPlainObject(
          data &&
          data.alter
        )
          ? data.alter
          : null
    };
  }


  /*
  =======================================================
  ALTERS
  =======================================================
  */

  async function getAlters() {
    const data =
      await request(
        CONFIG.API_ACTIONS.ALTERS
      );

    return {
      alters:
        Array.isArray(
          data &&
          data.alters
        )
          ? data.alters
          : [],

      total:
        Number(
          data &&
          data.total
        ) || 0
    };
  }


  /*
  =======================================================
  ALTER
  =======================================================
  */

  async function getAlter(options) {
    const settings =
      options || {};

    const alterId =
      asString(
        settings.id
      );

    const memberId =
      asString(
        settings.memberId
      );

    if (
      !alterId &&
      !memberId
    ) {
      throw createApiError(
        "ID alter atau ID member wajib diisi.",
        {
          code:
            "MISSING_ALTER_PARAMETER",

          action:
            CONFIG.API_ACTIONS.ALTER
        }
      );
    }

    const data =
      await request(
        CONFIG.API_ACTIONS.ALTER,
        {
          id:
            alterId,

          memberId:
            memberId
        }
      );

    return {
      alter:
        isPlainObject(
          data &&
          data.alter
        )
          ? data.alter
          : null,

      member:
        isPlainObject(
          data &&
          data.member
        )
          ? data.member
          : null
    };
  }


  /*
  =======================================================
  DIVISIONS
  =======================================================
  */

  async function getDivisions() {
    const data =
      await request(
        CONFIG.API_ACTIONS.DIVISIONS
      );

    return {
      divisions:
        Array.isArray(
          data &&
          data.divisions
        )
          ? data.divisions
          : [],

      total:
        Number(
          data &&
          data.total
        ) || 0
    };
  }


  /*
  =======================================================
  MENGISI VARIABEL GLOBAL HOME
  =======================================================

  Fungsi ini mempertahankan kompatibilitas dengan
  p3r-home.js lama yang membaca:

  window.MEMBERS
  window.ALTERS
  window.DIVISIONS
  =======================================================
  */

  async function loadHomeGlobals(options) {
    const homeData =
      await getHomeData(
        options
      );

    window.MEMBERS =
      homeData.members;

    window.ALTERS =
      homeData.alters;

    window.DIVISIONS =
      homeData.divisions;

    window.P3R_HOME_SUMMARY =
      homeData.summary;

    const event =
      new CustomEvent(
        "p3r:home-data-ready",
        {
          detail:
            homeData
        }
      );

    window.dispatchEvent(
      event
    );

    debugLog(
      "Variabel global home berhasil diisi.",
      homeData.summary
    );

    return homeData;
  }


  /*
  =======================================================
  PUBLIC API
  =======================================================
  */

  window.P3R_API =
    Object.freeze({
      buildApiUrl:
        buildApiUrl,

      request:
        request,

      ping:
        ping,

      getHomeData:
        getHomeData,

      getMembers:
        getMembers,

      getMember:
        getMember,

      getAlters:
        getAlters,

      getAlter:
        getAlter,

      getDivisions:
        getDivisions,

      loadHomeGlobals:
        loadHomeGlobals,

      clearHomeCache:
        clearHomeCache
    });


  /*
  =======================================================
  EVENT API READY
  =======================================================
  */

  window.dispatchEvent(
    new CustomEvent(
      "p3r:api-ready",
      {
        detail: {
          apiUrl:
            API_URL,

          version:
            CONFIG.APP_VERSION
        }
      }
    )
  );


  debugLog(
    "API frontend berhasil dimuat.",
    {
      apiUrl:
        API_URL,

      timeout:
        REQUEST_TIMEOUT_MS,

      cacheEnabled:
        isCacheEnabled()
    }
  );
})();