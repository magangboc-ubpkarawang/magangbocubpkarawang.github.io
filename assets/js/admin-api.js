/*
=========================================================
ADMIN-API.JS
WEBSITE PROFILE MAGANG PUSDATIN X BOC
UBP KARAWANG
=========================================================

AUTENTIKASI:
- login()
- logout()
- verifySession()
- requireSession()
- adminPing()
- changePassword()

CRUD MEMBER:
- listMembers()
- getMember()
- createMember()
- updateMember()
- deleteMember()
- restoreMember()

CRUD ALTER PROFILE:
- listAlters()
- getAlter()
- createAlter()
- updateAlter()
- deleteAlter()
- restoreAlter()

CRUD DIVISION:
- listDivisions()
- getDivision()
- createDivision()
- updateDivision()
- deleteDivision()

MEDIA DRIVE:
- listMedia()
- getMedia()
- uploadMedia()
- uploadMediaFile()
- replaceMedia()
- replaceMediaFile()
- deleteMedia()
- restoreMedia()
- auditMedia()
- validateMediaFile()
- fileToBase64()
- getMediaUploadRules()

URUTAN PEMUATAN:

1. config.js
2. admin-api.js
3. script halaman admin
=========================================================
*/

(function initializeP3RAdminApi() {
  "use strict";


  /*
  =======================================================
  KONFIGURASI
  =======================================================
  */

  const CONFIG =
    window.P3R_CONFIG &&
    typeof window.P3R_CONFIG === "object"
      ? window.P3R_CONFIG
      : {};


  const STORAGE_KEYS =
    Object.freeze({
      SESSION:
        "p3r_admin_session",

      REMEMBER:
        "p3r_admin_remember"
    });


  const DEFAULT_TIMEOUT_MS =
    20000;


  const WRITE_TIMEOUT_MS =
    30000;


  /*
  =======================================================
  KONFIGURASI MEDIA
  =======================================================

  Upload melalui Web App menggunakan Base64. Batas video
  frontend dibuat konservatif agar request tetap stabil.
  Video yang lebih besar sebaiknya memakai URL eksternal.
  =======================================================
  */

  const MEDIA_READ_TIMEOUT_MS =
    60000;


  const MEDIA_UPLOAD_TIMEOUT_MS =
    180000;


  const MEDIA_BASE64_TRANSPORT_LIMIT_BYTES =
    20 * 1024 * 1024;


  const MEDIA_UPLOAD_RULES =
    Object.freeze({
      profile:
        Object.freeze({
          label:
            "Foto profil",

          maximumBytes:
            5 * 1024 * 1024,

          mimeTypes:
            Object.freeze([
              "image/jpeg",
              "image/png",
              "image/webp"
            ]),

          extensions:
            Object.freeze([
              "jpg",
              "jpeg",
              "png",
              "webp"
            ])
        }),

      gallery:
        Object.freeze({
          label:
            "Gambar gallery",

          maximumBytes:
            8 * 1024 * 1024,

          mimeTypes:
            Object.freeze([
              "image/jpeg",
              "image/png",
              "image/webp"
            ]),

          extensions:
            Object.freeze([
              "jpg",
              "jpeg",
              "png",
              "webp"
            ])
        }),

      video:
        Object.freeze({
          label:
            "Video CV",

          maximumBytes:
            MEDIA_BASE64_TRANSPORT_LIMIT_BYTES,

          mimeTypes:
            Object.freeze([
              "video/mp4",
              "video/webm"
            ]),

          extensions:
            Object.freeze([
              "mp4",
              "webm"
            ])
        }),

      logo:
        Object.freeze({
          label:
            "Logo website",

          maximumBytes:
            5 * 1024 * 1024,

          mimeTypes:
            Object.freeze([
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/svg+xml"
            ]),

          extensions:
            Object.freeze([
              "jpg",
              "jpeg",
              "png",
              "webp",
              "svg"
            ])
        }),

      placeholder:
        Object.freeze({
          label:
            "Placeholder website",

          maximumBytes:
            5 * 1024 * 1024,

          mimeTypes:
            Object.freeze([
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/svg+xml"
            ]),

          extensions:
            Object.freeze([
              "jpg",
              "jpeg",
              "png",
              "webp",
              "svg"
            ])
        }),

      general:
        Object.freeze({
          label:
            "Media website",

          maximumBytes:
            5 * 1024 * 1024,

          mimeTypes:
            Object.freeze([
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/svg+xml"
            ]),

          extensions:
            Object.freeze([
              "jpg",
              "jpeg",
              "png",
              "webp",
              "svg"
            ])
        })
    });


  const MEDIA_EXTENSION_MIME_MAP =
    Object.freeze({
      jpg:
        "image/jpeg",

      jpeg:
        "image/jpeg",

      png:
        "image/png",

      webp:
        "image/webp",

      svg:
        "image/svg+xml",

      mp4:
        "video/mp4",

      webm:
        "video/webm"
    });


  /*
  =======================================================
  STATE
  =======================================================
  */

  const state = {
    requestController:
      null,

    requestInProgress:
      false,

    currentAction:
      "",

    lastError:
      null
  };


  /*
  =======================================================
  ERROR KHUSUS ADMIN API
  =======================================================
  */

  class P3RAdminApiError extends Error {
    constructor(
      message,
      code,
      details
    ) {
      super(
        message ||
        "Permintaan admin gagal."
      );

      this.name =
        "P3RAdminApiError";

      this.code =
        code ||
        "ADMIN_API_ERROR";

      this.details =
        details === undefined
          ? null
          : details;
    }
  }


  /*
  =======================================================
  HELPER STRING
  =======================================================
  */

  function asString(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();
  }


  /*
  =======================================================
  HELPER OBJECT
  =======================================================
  */

  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  /*
  =======================================================
  HELPER BOOLEAN
  =======================================================
  */

  function asBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    return [
      "1",
      "true",
      "yes",
      "y",
      "active",
      "aktif",
      "enabled"
    ].includes(
      asString(value)
        .toLowerCase()
    );
  }


  /*
  =======================================================
  HELPER NUMBER
  =======================================================
  */

  function asNumber(
    value,
    fallback
  ) {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      return fallback === undefined
        ? 0
        : fallback;
    }

    return numericValue;
  }


  /*
  =======================================================
  CLONE DATA
  =======================================================
  */

  function cloneData(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return value;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }


  /*
  =======================================================
  LOG
  =======================================================
  */

  function debugLog() {
    if (
      CONFIG.DEBUG !== true
    ) {
      return;
    }

    const args =
      Array.prototype.slice.call(
        arguments
      );

    args.unshift(
      "[P3R ADMIN API]"
    );

    console.info.apply(
      console,
      args
    );
  }


  function errorLog() {
    const args =
      Array.prototype.slice.call(
        arguments
      );

    args.unshift(
      "[P3R ADMIN API]"
    );

    console.error.apply(
      console,
      args
    );
  }


  /*
  =======================================================
  URL APPS SCRIPT
  =======================================================
  */

  function getApiUrl() {
    const candidates = [
      CONFIG.API_URL,
      CONFIG.APPS_SCRIPT_URL,
      CONFIG.ENDPOINT,
      CONFIG.BASE_API_URL,
      window.P3R_API_URL
    ];

    for (
      let index = 0;
      index < candidates.length;
      index++
    ) {
      const candidate =
        asString(
          candidates[index]
        );

      if (candidate) {
        return candidate;
      }
    }

    throw new P3RAdminApiError(
      "URL Google Apps Script belum tersedia di config.js.",
      "API_URL_NOT_CONFIGURED"
    );
  }


  /*
  =======================================================
  SAFE JSON PARSE
  =======================================================
  */

  function safeJsonParse(
    value,
    fallback
  ) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }


  /*
  =======================================================
  STORAGE TERSEDIA
  =======================================================
  */

  function storageAvailable(storage) {
    if (!storage) {
      return false;
    }

    const testKey =
      "__p3r_storage_test__";

    try {
      storage.setItem(
        testKey,
        "1"
      );

      storage.removeItem(
        testKey
      );

      return true;
    } catch (error) {
      return false;
    }
  }


  function getSessionStorage() {
    return storageAvailable(
      window.sessionStorage
    )
      ? window.sessionStorage
      : null;
  }


  function getLocalStorage() {
    return storageAvailable(
      window.localStorage
    )
      ? window.localStorage
      : null;
  }


  /*
  =======================================================
  NORMALISASI USER
  =======================================================
  */

  function normalizeUser(user) {
    if (!isPlainObject(user)) {
      return null;
    }

    return {
      id:
        asString(
          user.id
        ),

      name:
        asString(
          user.name
        ),

      email:
        asString(
          user.email
        ).toLowerCase(),

      role:
        asString(
          user.role
        ).toLowerCase(),

      active:
        user.active === true ||
        asBoolean(
          user.active
        )
    };
  }


  /*
  =======================================================
  NORMALISASI SESSION
  =======================================================
  */

  function normalizeSession(session) {
    if (!isPlainObject(session)) {
      return null;
    }

    const token =
      asString(
        session.token
      );

    if (!token) {
      return null;
    }

    return {
      token:
        token,

      issuedAt:
        asString(
          session.issuedAt ||
          session.issued_at
        ),

      expiresAt:
        asString(
          session.expiresAt ||
          session.expires_at
        ),

      expiresInSeconds:
        Math.max(
          0,
          asNumber(
            session.expiresInSeconds ||
            session.expires_in_seconds,
            0
          )
        ),

      user:
        normalizeUser(
          session.user
        )
    };
  }


  /*
  =======================================================
  CEK SESSION KEDALUWARSA
  =======================================================
  */

  function isSessionExpired(session) {
    if (
      !session ||
      !session.expiresAt
    ) {
      return false;
    }

    const expiresAt =
      new Date(
        session.expiresAt
      ).getTime();

    if (
      !Number.isFinite(
        expiresAt
      )
    ) {
      return false;
    }

    return (
      expiresAt <=
      Date.now()
    );
  }


  /*
  =======================================================
  EVENT AUTENTIKASI
  =======================================================
  */

  function dispatchAuthEvent(
    type,
    session
  ) {
    window.dispatchEvent(
      new CustomEvent(
        type,
        {
          detail: {
            authenticated:
              Boolean(
                session &&
                session.token
              ),

            session:
              session || null,

            user:
              session &&
              session.user
                ? session.user
                : null
          }
        }
      )
    );
  }


  /*
  =======================================================
  HAPUS SESSION
  =======================================================
  */

  function clearStoredSession(
    emitEvent
  ) {
    const sessionStorage =
      getSessionStorage();

    const localStorage =
      getLocalStorage();

    if (sessionStorage) {
      sessionStorage.removeItem(
        STORAGE_KEYS.SESSION
      );
    }

    if (localStorage) {
      localStorage.removeItem(
        STORAGE_KEYS.SESSION
      );

      localStorage.removeItem(
        STORAGE_KEYS.REMEMBER
      );
    }

    if (emitEvent !== false) {
      dispatchAuthEvent(
        "p3r:admin-logout",
        null
      );

      dispatchAuthEvent(
        "p3r:admin-session-changed",
        null
      );
    }
  }


  /*
  =======================================================
  SIMPAN SESSION
  =======================================================
  */

  function saveSession(
    session,
    remember,
    options
  ) {
    const settings =
      options || {};

    const normalized =
      normalizeSession(
        session
      );

    if (!normalized) {
      throw new P3RAdminApiError(
        "Data session dari server tidak valid.",
        "INVALID_SESSION_DATA"
      );
    }

    clearStoredSession(false);

    const localStorage =
      getLocalStorage();

    const sessionStorage =
      getSessionStorage();

    if (
      remember === true &&
      localStorage
    ) {
      localStorage.setItem(
        STORAGE_KEYS.SESSION,
        JSON.stringify(
          normalized
        )
      );

      localStorage.setItem(
        STORAGE_KEYS.REMEMBER,
        "true"
      );
    } else if (sessionStorage) {
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION,
        JSON.stringify(
          normalized
        )
      );

      if (localStorage) {
        localStorage.setItem(
          STORAGE_KEYS.REMEMBER,
          "false"
        );
      }
    } else if (localStorage) {
      localStorage.setItem(
        STORAGE_KEYS.SESSION,
        JSON.stringify(
          normalized
        )
      );

      localStorage.setItem(
        STORAGE_KEYS.REMEMBER,
        "false"
      );
    } else {
      throw new P3RAdminApiError(
        "Browser tidak mengizinkan penyimpanan session.",
        "STORAGE_UNAVAILABLE"
      );
    }

    if (
      settings.emitLogin === true
    ) {
      dispatchAuthEvent(
        "p3r:admin-login",
        normalized
      );
    }

    dispatchAuthEvent(
      "p3r:admin-session-changed",
      normalized
    );

    return normalized;
  }


  /*
  =======================================================
  MEMBACA SESSION
  =======================================================
  */

  function getStoredSession() {
    const sessionStorage =
      getSessionStorage();

    const localStorage =
      getLocalStorage();

    let rawSession =
      sessionStorage
        ? sessionStorage.getItem(
            STORAGE_KEYS.SESSION
          )
        : null;

    if (
      !rawSession &&
      localStorage
    ) {
      rawSession =
        localStorage.getItem(
          STORAGE_KEYS.SESSION
        );
    }

    if (!rawSession) {
      return null;
    }

    const parsed =
      safeJsonParse(
        rawSession,
        null
      );

    const normalized =
      normalizeSession(
        parsed
      );

    if (!normalized) {
      clearStoredSession(false);

      return null;
    }

    if (
      isSessionExpired(
        normalized
      )
    ) {
      clearStoredSession(true);

      return null;
    }

    return normalized;
  }


  /*
  =======================================================
  PREFERENSI REMEMBER
  =======================================================
  */

  function getRememberPreference() {
    const localStorage =
      getLocalStorage();

    if (!localStorage) {
      return false;
    }

    return (
      localStorage.getItem(
        STORAGE_KEYS.REMEMBER
      ) === "true"
    );
  }


  /*
  =======================================================
  TOKEN SESSION
  =======================================================
  */

  function getToken() {
    const session =
      getStoredSession();

    return session
      ? session.token
      : "";
  }


  /*
  =======================================================
  STATUS AUTENTIKASI LOKAL
  =======================================================
  */

  function isAuthenticatedLocally() {
    const session =
      getStoredSession();

    return Boolean(
      session &&
      session.token &&
      !isSessionExpired(session)
    );
  }


  /*
  =======================================================
  MEMBATALKAN REQUEST
  =======================================================
  */

  function cancelActiveRequest() {
    if (
      state.requestController
    ) {
      state.requestController.abort();

      state.requestController =
        null;
    }

    state.requestInProgress =
      false;

    state.currentAction =
      "";
  }


  /*
  =======================================================
  MEMBUAT ERROR DARI RESPONSE
  =======================================================
  */

  function createErrorFromResponse(
    response,
    fallbackMessage
  ) {
    const errorData =
      response &&
      isPlainObject(
        response.error
      )
        ? response.error
        : {};

    return new P3RAdminApiError(
      asString(
        errorData.message
      ) ||
      fallbackMessage ||
      "Permintaan admin gagal.",

      asString(
        errorData.code
      ) ||
      "ADMIN_REQUEST_FAILED",

      errorData.details === undefined
        ? null
        : errorData.details
    );
  }


  /*
  =======================================================
  ERROR SESSION
  =======================================================
  */

  function isSessionErrorCode(code) {
    return [
      "ADMIN_SESSION_INVALID",
      "ADMIN_SESSION_MISSING",
      "ADMIN_TOKEN_REQUIRED",
      "SESSION_NOT_FOUND",
      "SESSION_EXPIRED",
      "INVALID_SESSION",
      "AUTH_REQUIRED",
      "UNAUTHORIZED"
    ].includes(
      asString(code)
    );
  }


  /*
  =======================================================
  POST REQUEST
  =======================================================
  */

  async function postRequest(
    action,
    payload,
    options
  ) {
    const settings =
      options || {};

    const normalizedAction =
      asString(action);

    if (!normalizedAction) {
      throw new P3RAdminApiError(
        "Action API tidak boleh kosong.",
        "ACTION_REQUIRED"
      );
    }

    if (
      settings.cancelPrevious === true
    ) {
      cancelActiveRequest();
    }

    const controller =
      new AbortController();

    state.requestController =
      controller;

    state.requestInProgress =
      true;

    state.currentAction =
      normalizedAction;

    state.lastError =
      null;

    const timeoutMs =
      Math.max(
        1000,
        Number(
          settings.timeoutMs
        ) ||
        DEFAULT_TIMEOUT_MS
      );

    const timeoutId =
      window.setTimeout(
        function abortTimedOutRequest() {
          controller.abort();
        },
        timeoutMs
      );

    const requestBody =
      Object.assign(
        {},
        isPlainObject(payload)
          ? payload
          : {},
        {
          action:
            normalizedAction
        }
      );

    debugLog(
      "Request dimulai.",
      {
        action:
          normalizedAction
      }
    );

    try {
      const response =
        await fetch(
          getApiUrl(),
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "text/plain;charset=UTF-8"
            },

            body:
              JSON.stringify(
                requestBody
              ),

            redirect:
              "follow",

            cache:
              "no-store",

            signal:
              controller.signal
          }
        );

      if (!response.ok) {
        throw new P3RAdminApiError(
          "Server mengembalikan HTTP " +
            response.status +
            ".",
          "HTTP_ERROR",
          {
            status:
              response.status,

            statusText:
              response.statusText
          }
        );
      }

      const responseText =
        await response.text();

      let result;

      try {
        result =
          JSON.parse(
            responseText
          );
      } catch (error) {
        throw new P3RAdminApiError(
          "Server mengembalikan data yang tidak dapat dibaca.",
          "INVALID_JSON_RESPONSE",
          {
            responsePreview:
              responseText.substring(
                0,
                300
              )
          }
        );
      }

      if (
        !result ||
        result.success !== true
      ) {
        throw createErrorFromResponse(
          result
        );
      }

      debugLog(
        "Request berhasil.",
        {
          action:
            normalizedAction,

          requestId:
            result.requestId || ""
        }
      );

      return result.data;
    } catch (error) {
      let normalizedError;

      if (
        error &&
        error.name ===
        "AbortError"
      ) {
        normalizedError =
          new P3RAdminApiError(
            "Koneksi ke Google Apps Script melewati batas waktu.",
            "REQUEST_TIMEOUT"
          );
      } else if (
        error instanceof
        P3RAdminApiError
      ) {
        normalizedError =
          error;
      } else if (
        error instanceof
        TypeError
      ) {
        normalizedError =
          new P3RAdminApiError(
            "Browser tidak dapat terhubung ke Google Apps Script.",
            "NETWORK_ERROR",
            {
              originalMessage:
                error.message
            }
          );
      } else {
        normalizedError =
          new P3RAdminApiError(
            error &&
            error.message
              ? error.message
              : "Permintaan admin gagal.",

            error &&
            error.code
              ? error.code
              : "ADMIN_REQUEST_FAILED",

            error &&
            error.details !== undefined
              ? error.details
              : null
          );
      }

      state.lastError =
        normalizedError;

      if (
        isSessionErrorCode(
          normalizedError.code
        )
      ) {
        clearStoredSession(true);
      }

      errorLog(
        "Request gagal.",
        {
          action:
            normalizedAction,

          code:
            normalizedError.code,

          message:
            normalizedError.message,

          details:
            normalizedError.details
        }
      );

      throw normalizedError;
    } finally {
      window.clearTimeout(
        timeoutId
      );

      if (
        state.requestController ===
        controller
      ) {
        state.requestController =
          null;
      }

      state.requestInProgress =
        false;

      state.currentAction =
        "";
    }
  }


  /*
  =======================================================
  REQUEST DENGAN TOKEN ADMIN
  =======================================================
  */

  async function authenticatedRequest(
    action,
    payload,
    options
  ) {
    const token =
      getToken();

    if (!token) {
      throw new P3RAdminApiError(
        "Session admin belum tersedia.",
        "ADMIN_SESSION_MISSING"
      );
    }

    const requestPayload =
      Object.assign(
        {},
        isPlainObject(payload)
          ? payload
          : {},
        {
          token:
            token
        }
      );

    return postRequest(
      action,
      requestPayload,
      options
    );
  }


  /*
  =======================================================
  LOGIN
  =======================================================
  */

  async function login(
    email,
    password,
    remember
  ) {
    const normalizedEmail =
      asString(email)
        .toLowerCase();

    const normalizedPassword =
      String(
        password === null ||
        password === undefined
          ? ""
          : password
      );

    if (!normalizedEmail) {
      throw new P3RAdminApiError(
        "Email admin wajib diisi.",
        "EMAIL_REQUIRED"
      );
    }

    if (!normalizedPassword) {
      throw new P3RAdminApiError(
        "Password admin wajib diisi.",
        "PASSWORD_REQUIRED"
      );
    }

    const data =
      await postRequest(
        "login",
        {
          email:
            normalizedEmail,

          password:
            normalizedPassword
        },
        {
          cancelPrevious:
            true
        }
      );

    const session =
      data &&
      data.session
        ? data.session
        : data;

    const storedSession =
      saveSession(
        session,
        remember === true,
        {
          emitLogin:
            true
        }
      );

    return {
      success:
        true,

      message:
        asString(
          data &&
          data.message
        ) ||
        "Login admin berhasil.",

      session:
        storedSession,

      user:
        storedSession.user
    };
  }


  /*
  =======================================================
  VERIFIKASI SESSION
  =======================================================
  */

  async function verifySession() {
    const currentSession =
      getStoredSession();

    if (!currentSession) {
      return {
        success:
          false,

        authenticated:
          false,

        session:
          null,

        user:
          null
      };
    }

    try {
      const data =
        await postRequest(
          "session",
          {
            token:
              currentSession.token
          }
        );

      const authenticated =
        data &&
        (
          data.authenticated === true ||
          data.active === true ||
          data.valid === true
        );

      if (!authenticated) {
        clearStoredSession(true);

        return {
          success:
            false,

          authenticated:
            false,

          session:
            null,

          user:
            null
        };
      }

      const serverSession =
        data &&
        isPlainObject(
          data.session
        )
          ? data.session
          : data;

      const updatedSession =
        normalizeSession({
          token:
            currentSession.token,

          issuedAt:
            serverSession.issuedAt ||
            serverSession.issued_at ||
            currentSession.issuedAt,

          expiresAt:
            serverSession.expiresAt ||
            serverSession.expires_at ||
            currentSession.expiresAt,

          expiresInSeconds:
            serverSession.expiresInSeconds ||
            serverSession.expires_in_seconds ||
            currentSession.expiresInSeconds,

          user:
            serverSession.user ||
            currentSession.user
        });

      const storedSession =
        saveSession(
          updatedSession,
          getRememberPreference(),
          {
            emitLogin:
              false
          }
        );

      dispatchAuthEvent(
        "p3r:admin-session-verified",
        storedSession
      );

      return {
        success:
          true,

        authenticated:
          true,

        session:
          storedSession,

        user:
          storedSession.user
      };
    } catch (error) {
      if (
        isSessionErrorCode(
          error &&
          error.code
        )
      ) {
        clearStoredSession(true);

        return {
          success:
            false,

          authenticated:
            false,

          session:
            null,

          user:
            null,

          error:
            error
        };
      }

      throw error;
    }
  }


  /*
  =======================================================
  ADMIN PING
  =======================================================
  */

  async function adminPing() {
    return authenticatedRequest(
      "admin-ping",
      {}
    );
  }


  /*
  =======================================================
  LOGOUT
  =======================================================
  */

  async function logout(options) {
    const settings =
      options || {};

    const token =
      getToken();

    try {
      if (token) {
        await postRequest(
          "logout",
          {
            token:
              token
          },
          {
            timeoutMs:
              10000
          }
        );
      }
    } catch (error) {
      if (
        settings.throwOnError ===
        true
      ) {
        throw error;
      }

      debugLog(
        "Logout server gagal, session lokal tetap dihapus.",
        error
      );
    } finally {
      clearStoredSession(true);
    }

    return {
      success:
        true,

      message:
        "Logout berhasil."
    };
  }


  /*
  =======================================================
  UBAH PASSWORD
  =======================================================
  */

  async function changePassword(
    currentPassword,
    newPassword
  ) {
    const current =
      String(
        currentPassword === null ||
        currentPassword === undefined
          ? ""
          : currentPassword
      );

    const next =
      String(
        newPassword === null ||
        newPassword === undefined
          ? ""
          : newPassword
      );

    if (!current) {
      throw new P3RAdminApiError(
        "Password saat ini wajib diisi.",
        "CURRENT_PASSWORD_REQUIRED"
      );
    }

    if (!next) {
      throw new P3RAdminApiError(
        "Password baru wajib diisi.",
        "NEW_PASSWORD_REQUIRED"
      );
    }

    const data =
      await authenticatedRequest(
        "change-password",
        {
          currentPassword:
            current,

          newPassword:
            next
        },
        {
          timeoutMs:
            WRITE_TIMEOUT_MS
        }
      );

    clearStoredSession(true);

    return {
      success:
        true,

      message:
        asString(
          data &&
          data.message
        ) ||
        "Password berhasil diubah.",

      reloginRequired:
        Boolean(
          data &&
          data.reloginRequired
        )
    };
  }


  /*
  =======================================================
  VALIDASI ID MEMBER
  =======================================================
  */

  function requireMemberId(memberId) {
    const normalizedId =
      asString(memberId);

    if (!normalizedId) {
      throw new P3RAdminApiError(
        "ID member wajib diisi.",
        "MEMBER_ID_REQUIRED"
      );
    }

    return normalizedId;
  }


  /*
  =======================================================
  VALIDASI PAYLOAD MEMBER
  =======================================================
  */

  function requireMemberPayload(member) {
    if (!isPlainObject(member)) {
      throw new P3RAdminApiError(
        "Data member harus berupa object.",
        "MEMBER_PAYLOAD_REQUIRED"
      );
    }

    return cloneData(member);
  }


  /*
  =======================================================
  CRUD MEMBER: LIST
  =======================================================
  */

  async function listMembers(filters) {
    const source =
      isPlainObject(filters)
        ? filters
        : {};

    return authenticatedRequest(
      "members-list",
      {
        search:
          asString(
            source.search
          ),

        division:
          asString(
            source.division ||
            source.divisionKey ||
            source.division_key
          ),

        status:
          asString(
            source.status
          ),

        includeDeleted:
          source.includeDeleted === true ||
          asBoolean(
            source.include_deleted
          ),

        page:
          Math.max(
            1,
            Math.floor(
              asNumber(
                source.page,
                1
              )
            )
          ),

        pageSize:
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(
                asNumber(
                  source.pageSize ||
                  source.page_size,
                  50
                )
              )
            )
          )
      }
    );
  }


  /*
  =======================================================
  CRUD MEMBER: GET
  =======================================================
  */

  async function getMember(memberId) {
    return authenticatedRequest(
      "member-get",
      {
        memberId:
          requireMemberId(
            memberId
          )
      }
    );
  }


  /*
  =======================================================
  CRUD MEMBER: CREATE
  =======================================================
  */

  async function createMember(member) {
    return authenticatedRequest(
      "member-create",
      {
        member:
          requireMemberPayload(
            member
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD MEMBER: UPDATE
  =======================================================
  */

  async function updateMember(
    memberId,
    member
  ) {
    return authenticatedRequest(
      "member-update",
      {
        memberId:
          requireMemberId(
            memberId
          ),

        member:
          requireMemberPayload(
            member
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD MEMBER: DELETE
  =======================================================
  */

  async function deleteMember(
    memberId,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    return authenticatedRequest(
      "member-delete",
      {
        memberId:
          requireMemberId(
            memberId
          ),

        force:
          settings.force === true
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD MEMBER: RESTORE
  =======================================================
  */

  async function restoreMember(memberId) {
    return authenticatedRequest(
      "member-restore",
      {
        memberId:
          requireMemberId(
            memberId
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  VALIDASI ID ALTER
  =======================================================
  */

  function requireAlterId(alterId) {
    const normalizedId =
      asString(alterId);

    if (!normalizedId) {
      throw new P3RAdminApiError(
        "ID Alter Profile wajib diisi.",
        "ALTER_ID_REQUIRED"
      );
    }

    return normalizedId;
  }


  /*
  =======================================================
  VALIDASI PAYLOAD ALTER
  =======================================================
  */

  function requireAlterPayload(alter) {
    if (!isPlainObject(alter)) {
      throw new P3RAdminApiError(
        "Data Alter Profile harus berupa object.",
        "ALTER_PAYLOAD_REQUIRED"
      );
    }

    return cloneData(alter);
  }


  /*
  =======================================================
  CRUD ALTER: LIST
  =======================================================
  */

  async function listAlters(filters) {
    const source =
      isPlainObject(filters)
        ? filters
        : {};

    return authenticatedRequest(
      "alters-list",
      {
        search:
          asString(
            source.search
          ),

        status:
          asString(
            source.status
          ),

        theme:
          asString(
            source.theme
          ),

        division:
          asString(
            source.division ||
            source.divisionKey ||
            source.division_key
          ),

        baseId:
          asString(
            source.baseId ||
            source.base_id ||
            source.memberId ||
            source.member_id ||
            source.normalId ||
            source.normal_id
          ),

        includeDeleted:
          source.includeDeleted === true ||
          asBoolean(
            source.include_deleted
          ),

        page:
          Math.max(
            1,
            Math.floor(
              asNumber(
                source.page,
                1
              )
            )
          ),

        pageSize:
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(
                asNumber(
                  source.pageSize ||
                  source.page_size,
                  50
                )
              )
            )
          )
      }
    );
  }


  /*
  =======================================================
  CRUD ALTER: GET
  =======================================================
  */

  async function getAlter(alterId) {
    return authenticatedRequest(
      "alter-get",
      {
        alterId:
          requireAlterId(
            alterId
          )
      }
    );
  }


  /*
  =======================================================
  CRUD ALTER: CREATE
  =======================================================
  */

  async function createAlter(alter) {
    return authenticatedRequest(
      "alter-create",
      {
        alter:
          requireAlterPayload(
            alter
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD ALTER: UPDATE
  =======================================================
  */

  async function updateAlter(
    alterId,
    alter
  ) {
    return authenticatedRequest(
      "alter-update",
      {
        alterId:
          requireAlterId(
            alterId
          ),

        alter:
          requireAlterPayload(
            alter
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD ALTER: DELETE
  =======================================================
  */

  async function deleteAlter(alterId) {
    return authenticatedRequest(
      "alter-delete",
      {
        alterId:
          requireAlterId(
            alterId
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD ALTER: RESTORE
  =======================================================
  */

  async function restoreAlter(alterId) {
    return authenticatedRequest(
      "alter-restore",
      {
        alterId:
          requireAlterId(
            alterId
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  NORMALISASI KEY DIVISION
  =======================================================
  */

  function normalizeDivisionKey(value) {
    return asString(value)
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/_{2,}/g, "_")
      .replace(/^[-_]+|[-_]+$/g, "");
  }


  /*
  =======================================================
  VALIDASI KEY DIVISION
  =======================================================
  */

  function requireDivisionKey(divisionKey) {
    const normalizedKey =
      normalizeDivisionKey(
        divisionKey
      );

    if (!normalizedKey) {
      throw new P3RAdminApiError(
        "Key divisi wajib diisi.",
        "DIVISION_KEY_REQUIRED"
      );
    }

    if (
      normalizedKey.length > 64
    ) {
      throw new P3RAdminApiError(
        "Key divisi maksimal 64 karakter.",
        "DIVISION_KEY_TOO_LONG"
      );
    }

    if (
      !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(
        normalizedKey
      )
    ) {
      throw new P3RAdminApiError(
        "Format key divisi tidak valid.",
        "DIVISION_KEY_INVALID"
      );
    }

    return normalizedKey;
  }


  /*
  =======================================================
  VALIDASI PAYLOAD DIVISION
  =======================================================
  */

  function requireDivisionPayload(
    division
  ) {
    if (
      !isPlainObject(
        division
      )
    ) {
      throw new P3RAdminApiError(
        "Data divisi harus berupa object.",
        "DIVISION_PAYLOAD_REQUIRED"
      );
    }

    return cloneData(
      division
    );
  }


  /*
  =======================================================
  CRUD DIVISION: LIST
  =======================================================
  */

  async function listDivisions(filters) {
    const source =
      isPlainObject(filters)
        ? filters
        : {};

    return authenticatedRequest(
      "divisions-list",
      {
        search:
          asString(
            source.search
          ),

        page:
          Math.max(
            1,
            Math.floor(
              asNumber(
                source.page,
                1
              )
            )
          ),

        pageSize:
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(
                asNumber(
                  source.pageSize ||
                  source.page_size,
                  50
                )
              )
            )
          )
      }
    );
  }


  /*
  =======================================================
  CRUD DIVISION: GET
  =======================================================
  */

  async function getDivision(
    divisionKey
  ) {
    return authenticatedRequest(
      "division-get",
      {
        divisionKey:
          requireDivisionKey(
            divisionKey
          )
      }
    );
  }


  /*
  =======================================================
  CRUD DIVISION: CREATE
  =======================================================
  */

  async function createDivision(
    division
  ) {
    return authenticatedRequest(
      "division-create",
      {
        division:
          requireDivisionPayload(
            division
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD DIVISION: UPDATE
  =======================================================
  */

  async function updateDivision(
    divisionKey,
    division
  ) {
    return authenticatedRequest(
      "division-update",
      {
        divisionKey:
          requireDivisionKey(
            divisionKey
          ),

        division:
          requireDivisionPayload(
            division
          )
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  CRUD DIVISION: DELETE
  =======================================================

  OPTIONS:

  {
    force: false,
    replacementKey: ""
  }

  - replacementKey:
    Seluruh Member dan Alter dipindahkan ke divisi pengganti.

  - force:
    Menghapus divisi dan mengosongkan relasi yang masih memakai
    divisi tersebut.
  =======================================================
  */

  async function deleteDivision(
    divisionKey,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    const replacementKey =
      asString(
        settings.replacementKey ||
        settings.replacement_key
      );

    return authenticatedRequest(
      "division-delete",
      {
        divisionKey:
          requireDivisionKey(
            divisionKey
          ),

        options: {
          force:
            settings.force === true,

          replacementKey:
            replacementKey
              ? requireDivisionKey(
                  replacementKey
                )
              : ""
        }
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  NORMALISASI OWNER TYPE MEDIA
  =======================================================
  */

  function normalizeMediaOwnerType(value) {
    const ownerType =
      asString(value)
        .toLowerCase();

    if (
      ![
        "member",
        "alter",
        "website"
      ].includes(
        ownerType
      )
    ) {
      throw new P3RAdminApiError(
        "Jenis pemilik media tidak valid.",
        "MEDIA_OWNER_TYPE_INVALID",
        {
          ownerType:
            ownerType
        }
      );
    }

    return ownerType;
  }


  /*
  =======================================================
  NORMALISASI ASSET TYPE MEDIA
  =======================================================
  */

  function normalizeMediaAssetType(value) {
    const source =
      asString(value)
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const aliases = {
      profile:
        "profile",

      photo:
        "profile",

      profileimage:
        "profile",

      gallery:
        "gallery",

      galleryimage:
        "gallery",

      video:
        "video",

      videocv:
        "video",

      cvvideo:
        "video",

      logo:
        "logo",

      placeholder:
        "placeholder",

      general:
        "general"
    };

    const assetType =
      aliases[source] || "";

    if (
      !assetType ||
      !MEDIA_UPLOAD_RULES[
        assetType
      ]
    ) {
      throw new P3RAdminApiError(
        "Jenis media tidak valid.",
        "MEDIA_ASSET_TYPE_INVALID",
        {
          assetType:
            asString(value)
        }
      );
    }

    return assetType;
  }


  /*
  =======================================================
  VALIDASI OWNER ID MEDIA
  =======================================================
  */

  function requireMediaOwnerId(
    ownerId,
    ownerType
  ) {
    const normalizedOwnerType =
      normalizeMediaOwnerType(
        ownerType
      );

    const normalizedId =
      asString(
        ownerId ||
        (
          normalizedOwnerType ===
            "website"
            ? "website"
            : ""
        )
      )
        .toLowerCase();

    if (!normalizedId) {
      throw new P3RAdminApiError(
        "ID pemilik media wajib diisi.",
        "MEDIA_OWNER_ID_REQUIRED"
      );
    }

    if (
      normalizedId.length >
      120
    ) {
      throw new P3RAdminApiError(
        "ID pemilik media terlalu panjang.",
        "MEDIA_OWNER_ID_TOO_LONG",
        {
          maximumLength:
            120
        }
      );
    }

    return normalizedId;
  }


  /*
  =======================================================
  VALIDASI ASSET ID MEDIA
  =======================================================
  */

  function requireMediaAssetId(assetId) {
    const normalizedId =
      asString(assetId);

    if (!normalizedId) {
      throw new P3RAdminApiError(
        "ID aset media wajib diisi.",
        "MEDIA_ASSET_ID_REQUIRED"
      );
    }

    return normalizedId;
  }


  /*
  =======================================================
  FORMAT UKURAN FILE
  =======================================================
  */

  function formatMediaFileSize(bytes) {
    const value =
      Math.max(
        0,
        asNumber(
          bytes,
          0
        )
      );

    if (value < 1024) {
      return (
        Math.round(value) +
        " B"
      );
    }

    if (
      value <
      1024 * 1024
    ) {
      return (
        (
          value /
          1024
        ).toFixed(2) +
        " KB"
      );
    }

    if (
      value <
      1024 *
      1024 *
      1024
    ) {
      return (
        (
          value /
          (
            1024 *
            1024
          )
        ).toFixed(2) +
        " MB"
      );
    }

    return (
      (
        value /
        (
          1024 *
          1024 *
          1024
        )
      ).toFixed(2) +
      " GB"
    );
  }


  /*
  =======================================================
  EKSTENSI FILE MEDIA
  =======================================================
  */

  function getMediaFileExtension(fileName) {
    const normalizedName =
      asString(fileName)
        .toLowerCase();

    const lastDotIndex =
      normalizedName.lastIndexOf(
        "."
      );

    if (
      lastDotIndex < 1 ||
      lastDotIndex ===
        normalizedName.length - 1
    ) {
      return "";
    }

    return normalizedName.substring(
      lastDotIndex + 1
    );
  }


  /*
  =======================================================
  MIME TYPE FILE MEDIA
  =======================================================
  */

  function getMediaFileMimeType(
    file,
    extension
  ) {
    const explicitMimeType =
      asString(
        file &&
        file.type
      )
        .toLowerCase();

    if (explicitMimeType) {
      return explicitMimeType;
    }

    return (
      MEDIA_EXTENSION_MIME_MAP[
        extension
      ] || ""
    );
  }


  /*
  =======================================================
  RULE UPLOAD MEDIA
  =======================================================
  */

  function getMediaUploadRule(
    assetType,
    options
  ) {
    const normalizedAssetType =
      normalizeMediaAssetType(
        assetType
      );

    const baseRule =
      MEDIA_UPLOAD_RULES[
        normalizedAssetType
      ];

    const settings =
      isPlainObject(options)
        ? options
        : {};

    let maximumBytes =
      Math.max(
        1,
        asNumber(
          settings.maximumBytes ||
          settings.maxBytes,
          baseRule.maximumBytes
        )
      );

    maximumBytes =
      Math.min(
        maximumBytes,
        normalizedAssetType ===
          "video"
          ? MEDIA_BASE64_TRANSPORT_LIMIT_BYTES
          : baseRule.maximumBytes
      );

    return {
      assetType:
        normalizedAssetType,

      label:
        baseRule.label,

      maximumBytes:
        maximumBytes,

      formattedMaximum:
        formatMediaFileSize(
          maximumBytes
        ),

      mimeTypes:
        Array.from(
          baseRule.mimeTypes
        ),

      extensions:
        Array.from(
          baseRule.extensions
        )
    };
  }


  /*
  =======================================================
  SELURUH RULE UPLOAD MEDIA
  =======================================================
  */

  function getMediaUploadRules() {
    const result = {};

    Object.keys(
      MEDIA_UPLOAD_RULES
    ).forEach(
      function mapMediaRule(
        assetType
      ) {
        result[assetType] =
          getMediaUploadRule(
            assetType
          );
      }
    );

    result.transport = {
      maximumBase64SourceBytes:
        MEDIA_BASE64_TRANSPORT_LIMIT_BYTES,

      formattedMaximum:
        formatMediaFileSize(
          MEDIA_BASE64_TRANSPORT_LIMIT_BYTES
        ),

      uploadTimeoutMs:
        MEDIA_UPLOAD_TIMEOUT_MS
    };

    return result;
  }


  /*
  =======================================================
  VALIDASI FILE MEDIA
  =======================================================
  */

  function validateMediaFile(
    file,
    assetType,
    options
  ) {
    const rule =
      getMediaUploadRule(
        assetType,
        options
      );

    const isBlob =
      typeof Blob !==
        "undefined" &&
      file instanceof Blob;

    if (
      !file ||
      !isBlob
    ) {
      throw new P3RAdminApiError(
        "File media belum dipilih.",
        "MEDIA_FILE_REQUIRED"
      );
    }

    const fileName =
      asString(
        file.name
      ) ||
      "file";

    const extension =
      getMediaFileExtension(
        fileName
      );

    if (!extension) {
      throw new P3RAdminApiError(
        "File media harus memiliki ekstensi.",
        "MEDIA_FILE_EXTENSION_REQUIRED"
      );
    }

    if (
      !rule.extensions.includes(
        extension
      )
    ) {
      throw new P3RAdminApiError(
        "Ekstensi file tidak diperbolehkan untuk " +
          rule.label +
          ".",
        "MEDIA_FILE_EXTENSION_NOT_ALLOWED",
        {
          extension:
            extension,

          allowedExtensions:
            rule.extensions
        }
      );
    }

    const mimeType =
      getMediaFileMimeType(
        file,
        extension
      );

    if (!mimeType) {
      throw new P3RAdminApiError(
        "Jenis file tidak dapat dikenali.",
        "MEDIA_FILE_MIME_REQUIRED",
        {
          extension:
            extension
        }
      );
    }

    if (
      !rule.mimeTypes.includes(
        mimeType
      )
    ) {
      throw new P3RAdminApiError(
        "Jenis file tidak diperbolehkan untuk " +
          rule.label +
          ".",
        "MEDIA_FILE_MIME_NOT_ALLOWED",
        {
          mimeType:
            mimeType,

          allowedMimeTypes:
            rule.mimeTypes
        }
      );
    }

    const sizeBytes =
      Math.max(
        0,
        asNumber(
          file.size,
          0
        )
      );

    if (sizeBytes < 1) {
      throw new P3RAdminApiError(
        "File media kosong.",
        "MEDIA_FILE_EMPTY"
      );
    }

    if (
      sizeBytes >
      rule.maximumBytes
    ) {
      throw new P3RAdminApiError(
        "Ukuran " +
          rule.label +
          " maksimal " +
          rule.formattedMaximum +
          ".",
        (
          rule.assetType ===
            "video" &&
          sizeBytes >
            MEDIA_BASE64_TRANSPORT_LIMIT_BYTES
        )
          ? "MEDIA_FILE_TOO_LARGE_FOR_BASE64"
          : "MEDIA_FILE_TOO_LARGE",
        {
          sizeBytes:
            sizeBytes,

          formattedSize:
            formatMediaFileSize(
              sizeBytes
            ),

          maximumBytes:
            rule.maximumBytes,

          formattedMaximum:
            rule.formattedMaximum
        }
      );
    }

    return {
      valid:
        true,

      file:
        file,

      fileName:
        fileName,

      extension:
        extension,

      mimeType:
        mimeType,

      sizeBytes:
        sizeBytes,

      formattedSize:
        formatMediaFileSize(
          sizeBytes
        ),

      assetType:
        rule.assetType,

      label:
        rule.label,

      maximumBytes:
        rule.maximumBytes,

      formattedMaximum:
        rule.formattedMaximum
    };
  }


  /*
  =======================================================
  FILE MENJADI BASE64
  =======================================================
  */

  function fileToBase64(
    file,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    const assetType =
      normalizeMediaAssetType(
        settings.assetType ||
        settings.asset_type ||
        "profile"
      );

    const validation =
      settings.skipValidation ===
        true
        ? {
            file:
              file,

            fileName:
              asString(
                file &&
                file.name
              ) ||
              "file",

            mimeType:
              asString(
                file &&
                file.type
              ),

            sizeBytes:
              asNumber(
                file &&
                file.size,
                0
              ),

            assetType:
              assetType
          }
        : validateMediaFile(
            file,
            assetType,
            settings
          );

    return new Promise(
      function readMediaFile(
        resolve,
        reject
      ) {
        const reader =
          new FileReader();

        let settled =
          false;

        const timeoutMs =
          Math.max(
            1000,
            asNumber(
              settings.timeoutMs,
              MEDIA_READ_TIMEOUT_MS
            )
          );

        const timeoutId =
          window.setTimeout(
            function abortFileReader() {
              if (settled) {
                return;
              }

              settled =
                true;

              try {
                reader.abort();
              } catch (error) {
                debugLog(
                  "FileReader tidak dapat dibatalkan.",
                  error
                );
              }

              reject(
                new P3RAdminApiError(
                  "Pembacaan file melewati batas waktu.",
                  "MEDIA_FILE_READ_TIMEOUT"
                )
              );
            },
            timeoutMs
          );

        function finishWithError(
          error
        ) {
          if (settled) {
            return;
          }

          settled =
            true;

          window.clearTimeout(
            timeoutId
          );

          reject(
            error instanceof
              P3RAdminApiError
              ? error
              : new P3RAdminApiError(
                  "File media tidak dapat dibaca.",
                  "MEDIA_FILE_READ_FAILED",
                  {
                    originalMessage:
                      error &&
                      error.message
                        ? error.message
                        : ""
                  }
                )
          );
        }

        reader.onerror =
          function handleFileReaderError() {
            finishWithError(
              reader.error
            );
          };

        reader.onabort =
          function handleFileReaderAbort() {
            finishWithError(
              new P3RAdminApiError(
                "Pembacaan file dibatalkan.",
                "MEDIA_FILE_READ_ABORTED"
              )
            );
          };

        reader.onload =
          function handleFileReaderLoad() {
            if (settled) {
              return;
            }

            const dataUrl =
              asString(
                reader.result
              );

            const separatorIndex =
              dataUrl.indexOf(
                ","
              );

            if (
              !dataUrl.startsWith(
                "data:"
              ) ||
              separatorIndex < 0
            ) {
              finishWithError(
                new P3RAdminApiError(
                  "Hasil pembacaan Base64 tidak valid.",
                  "MEDIA_BASE64_INVALID"
                )
              );

              return;
            }

            const base64Data =
              dataUrl.substring(
                separatorIndex + 1
              );

            if (!base64Data) {
              finishWithError(
                new P3RAdminApiError(
                  "Data Base64 file kosong.",
                  "MEDIA_BASE64_EMPTY"
                )
              );

              return;
            }

            settled =
              true;

            window.clearTimeout(
              timeoutId
            );

            resolve({
              file:
                file,

              fileName:
                validation.fileName,

              mimeType:
                validation.mimeType,

              sizeBytes:
                validation.sizeBytes,

              formattedSize:
                formatMediaFileSize(
                  validation.sizeBytes
                ),

              assetType:
                validation.assetType,

              base64Data:
                base64Data,

              dataUrl:
                dataUrl
            });
          };

        try {
          reader.readAsDataURL(
            file
          );
        } catch (error) {
          finishWithError(
            error
          );
        }
      }
    );
  }


  /*
  =======================================================
  VALIDASI PAYLOAD MEDIA
  =======================================================
  */

  function requireMediaPayload(media) {
    if (
      !isPlainObject(
        media
      )
    ) {
      throw new P3RAdminApiError(
        "Data media harus berupa object.",
        "MEDIA_PAYLOAD_REQUIRED"
      );
    }

    return media;
  }


  /*
  =======================================================
  MENYIAPKAN PAYLOAD UPLOAD MEDIA
  =======================================================
  */

  async function prepareMediaUploadPayload(
    media,
    options
  ) {
    const source =
      requireMediaPayload(
        media
      );

    const settings =
      isPlainObject(options)
        ? options
        : {};

    const ownerType =
      normalizeMediaOwnerType(
        source.ownerType ||
        source.owner_type
      );

    const ownerId =
      requireMediaOwnerId(
        source.ownerId ||
        source.owner_id,
        ownerType
      );

    const assetType =
      normalizeMediaAssetType(
        source.assetType ||
        source.asset_type
      );

    let fileName =
      asString(
        source.fileName ||
        source.file_name ||
        source.name
      );

    let mimeType =
      asString(
        source.mimeType ||
        source.mime_type
      )
        .toLowerCase();

    let base64Data =
      asString(
        source.base64Data ||
        source.base64_data ||
        source.base64
      );

    let sizeBytes =
      Math.max(
        0,
        asNumber(
          source.sizeBytes ||
          source.size_bytes,
          0
        )
      );

    if (
      source.file &&
      typeof Blob !==
        "undefined" &&
      source.file instanceof Blob
    ) {
      const encoded =
        await fileToBase64(
          source.file,
          {
            assetType:
              assetType,

            maximumBytes:
              settings.maximumBytes ||
              settings.maxBytes,

            timeoutMs:
              settings.readTimeoutMs ||
              settings.read_timeout_ms
          }
        );

      fileName =
        encoded.fileName;

      mimeType =
        encoded.mimeType;

      base64Data =
        encoded.base64Data;

      sizeBytes =
        encoded.sizeBytes;
    }

    if (!fileName) {
      throw new P3RAdminApiError(
        "Nama file media wajib tersedia.",
        "MEDIA_FILE_NAME_REQUIRED"
      );
    }

    if (!mimeType) {
      const extension =
        getMediaFileExtension(
          fileName
        );

      mimeType =
        MEDIA_EXTENSION_MIME_MAP[
          extension
        ] || "";
    }

    if (!mimeType) {
      throw new P3RAdminApiError(
        "MIME type media wajib tersedia.",
        "MEDIA_MIME_TYPE_REQUIRED"
      );
    }

    if (!base64Data) {
      throw new P3RAdminApiError(
        "Data Base64 media wajib tersedia.",
        "MEDIA_BASE64_REQUIRED"
      );
    }

    return {
      ownerType:
        ownerType,

      ownerId:
        ownerId,

      assetType:
        assetType,

      fileName:
        fileName,

      mimeType:
        mimeType,

      sizeBytes:
        sizeBytes,

      base64Data:
        base64Data,

      caption:
        asString(
          source.caption
        ).substring(
          0,
          500
        ),

      updateReference:
        source.updateReference ===
          undefined &&
        source.update_reference ===
          undefined
          ? true
          : (
              source.updateReference !==
                undefined
                ? asBoolean(
                    source.updateReference
                  )
                : asBoolean(
                    source.update_reference
                  )
            ),

      trashOldFile:
        source.trashOldFile ===
          true ||
        asBoolean(
          source.trash_old_file
        )
    };
  }


  /*
  =======================================================
  MEDIA: LIST
  =======================================================
  */

  async function listMedia(filters) {
    const source =
      isPlainObject(filters)
        ? filters
        : {};

    return authenticatedRequest(
      "media-list",
      {
        search:
          asString(
            source.search
          ),

        ownerType:
          asString(
            source.ownerType ||
            source.owner_type
          ).toLowerCase(),

        ownerId:
          asString(
            source.ownerId ||
            source.owner_id
          ).toLowerCase(),

        assetType:
          asString(
            source.assetType ||
            source.asset_type
          ).toLowerCase(),

        status:
          asString(
            source.status
          ).toLowerCase(),

        migrationStatus:
          asString(
            source.migrationStatus ||
            source.migration_status
          ).toLowerCase(),

        includeDeleted:
          source.includeDeleted ===
            true ||
          asBoolean(
            source.include_deleted
          ),

        page:
          Math.max(
            1,
            Math.floor(
              asNumber(
                source.page,
                1
              )
            )
          ),

        pageSize:
          Math.min(
            200,
            Math.max(
              1,
              Math.floor(
                asNumber(
                  source.pageSize ||
                  source.page_size,
                  50
                )
              )
            )
          )
      }
    );
  }


  /*
  =======================================================
  MEDIA: GET
  =======================================================
  */

  async function getMedia(assetId) {
    return authenticatedRequest(
      "media-get",
      {
        assetId:
          requireMediaAssetId(
            assetId
          )
      }
    );
  }


  /*
  =======================================================
  MEDIA: UPLOAD
  =======================================================
  */

  async function uploadMedia(
    media,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    const payload =
      await prepareMediaUploadPayload(
        media,
        settings
      );

    return authenticatedRequest(
      "media-upload",
      {
        media:
          payload
      },
      {
        timeoutMs:
          Math.max(
            MEDIA_UPLOAD_TIMEOUT_MS,
            asNumber(
              settings.timeoutMs,
              0
            )
          ),

        cancelPrevious:
          settings.cancelPrevious ===
            true
      }
    );
  }


  /*
  =======================================================
  MEDIA: UPLOAD FILE
  =======================================================
  */

  async function uploadMediaFile(
    ownerType,
    ownerId,
    assetType,
    file,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    return uploadMedia(
      {
        ownerType:
          ownerType,

        ownerId:
          ownerId,

        assetType:
          assetType,

        file:
          file,

        caption:
          asString(
            settings.caption
          ),

        updateReference:
          settings.updateReference ===
            undefined
            ? true
            : settings.updateReference
      },
      settings
    );
  }


  /*
  =======================================================
  MEDIA: REPLACE
  =======================================================
  */

  async function replaceMedia(
    assetId,
    media,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    const payload =
      await prepareMediaUploadPayload(
        media,
        settings
      );

    payload.trashOldFile =
      settings.trashOldFile ===
        true ||
      payload.trashOldFile ===
        true;

    return authenticatedRequest(
      "media-replace",
      {
        assetId:
          requireMediaAssetId(
            assetId
          ),

        media:
          payload
      },
      {
        timeoutMs:
          Math.max(
            MEDIA_UPLOAD_TIMEOUT_MS,
            asNumber(
              settings.timeoutMs,
              0
            )
          ),

        cancelPrevious:
          settings.cancelPrevious ===
            true
      }
    );
  }


  /*
  =======================================================
  MEDIA: REPLACE FILE
  =======================================================
  */

  async function replaceMediaFile(
    assetId,
    file,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    const current =
      await getMedia(
        assetId
      );

    const asset =
      current &&
      current.asset
        ? current.asset
        : null;

    if (!asset) {
      throw new P3RAdminApiError(
        "Data aset lama tidak ditemukan.",
        "MEDIA_ASSET_NOT_FOUND"
      );
    }

    return replaceMedia(
      assetId,
      {
        ownerType:
          asset.ownerType,

        ownerId:
          asset.ownerId,

        assetType:
          asset.assetType,

        file:
          file,

        caption:
          settings.caption !==
            undefined
            ? settings.caption
            : asset.caption,

        trashOldFile:
          settings.trashOldFile ===
            true
      },
      settings
    );
  }


  /*
  =======================================================
  MEDIA: DELETE
  =======================================================
  */

  async function deleteMedia(
    assetId,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    return authenticatedRequest(
      "media-delete",
      {
        assetId:
          requireMediaAssetId(
            assetId
          ),

        options: {
          removeReference:
            settings.removeReference ===
              undefined
              ? true
              : asBoolean(
                  settings.removeReference
                ),

          trashFile:
            settings.trashFile ===
              true
        }
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  MEDIA: RESTORE
  =======================================================
  */

  async function restoreMedia(
    assetId,
    options
  ) {
    const settings =
      isPlainObject(options)
        ? options
        : {};

    return authenticatedRequest(
      "media-restore",
      {
        assetId:
          requireMediaAssetId(
            assetId
          ),

        options: {
          restoreReference:
            settings.restoreReference ===
              true,

          restoreFile:
            settings.restoreFile ===
              true
        }
      },
      {
        timeoutMs:
          WRITE_TIMEOUT_MS
      }
    );
  }


  /*
  =======================================================
  MEDIA: AUDIT
  =======================================================
  */

  async function auditMedia() {
    return authenticatedRequest(
      "media-audit",
      {},
      {
        timeoutMs:
          60000
      }
    );
  }


  /*
  =======================================================
  URL LOGIN ADMIN
  =======================================================
  */

  function getAdminLoginUrl() {
    if (
      window.P3R_PAGE_URLS &&
      typeof window.P3R_PAGE_URLS.adminLogin ===
        "function"
    ) {
      return window.P3R_PAGE_URLS.adminLogin();
    }

    return new URL(
      "./admin-login.html",
      window.location.href
    ).href;
  }


  /*
  =======================================================
  REDIRECT LOGIN
  =======================================================
  */

  function redirectToLogin(returnUrl) {
    const url =
      new URL(
        getAdminLoginUrl(),
        window.location.href
      );

    const target =
      asString(returnUrl) ||
      window.location.href;

    if (target) {
      url.searchParams.set(
        "return",
        target
      );
    }

    window.location.href =
      url.href;
  }


  /*
  =======================================================
  MEMERLUKAN SESSION
  =======================================================
  */

  async function requireSession(options) {
    const settings =
      options || {};

    const localSession =
      getStoredSession();

    if (!localSession) {
      if (
        settings.redirect !== false
      ) {
        redirectToLogin(
          settings.returnUrl
        );
      }

      return null;
    }

    if (
      settings.verify === false
    ) {
      return localSession;
    }

    const verification =
      await verifySession();

    if (
      verification.authenticated !==
      true
    ) {
      if (
        settings.redirect !== false
      ) {
        redirectToLogin(
          settings.returnUrl
        );
      }

      return null;
    }

    return verification.session;
  }


  /*
  =======================================================
  SYNC SESSION ANTAR TAB
  =======================================================
  */

  function initializeStorageListener() {
    window.addEventListener(
      "storage",
      function handleStorageChange(
        event
      ) {
        if (
          event.key !==
          STORAGE_KEYS.SESSION
        ) {
          return;
        }

        const session =
          getStoredSession();

        dispatchAuthEvent(
          "p3r:admin-session-changed",
          session
        );
      }
    );
  }


  /*
  =======================================================
  INIT SESSION
  =======================================================
  */

  function initializeStoredSession() {
    const session =
      getStoredSession();

    if (!session) {
      return;
    }

    debugLog(
      "Session lokal ditemukan.",
      {
        email:
          session.user
            ? session.user.email
            : "",

        expiresAt:
          session.expiresAt
      }
    );
  }


  /*
  =======================================================
  INIT
  =======================================================
  */

  initializeStorageListener();
  initializeStoredSession();


  /*
  =======================================================
  PUBLIC API
  =======================================================
  */

  window.P3R_ADMIN_API =
    Object.freeze({
      /*
      Authentication
      */

      login:
        login,

      logout:
        logout,

      verifySession:
        verifySession,

      requireSession:
        requireSession,

      adminPing:
        adminPing,

      changePassword:
        changePassword,


      /*
      Member CRUD
      */

      listMembers:
        listMembers,

      getMember:
        getMember,

      createMember:
        createMember,

      updateMember:
        updateMember,

      deleteMember:
        deleteMember,

      restoreMember:
        restoreMember,


      /*
      Alter CRUD
      */

      listAlters:
        listAlters,

      getAlter:
        getAlter,

      createAlter:
        createAlter,

      updateAlter:
        updateAlter,

      deleteAlter:
        deleteAlter,

      restoreAlter:
        restoreAlter,


      /*
      Division CRUD
      */

      listDivisions:
        listDivisions,

      getDivision:
        getDivision,

      createDivision:
        createDivision,

      updateDivision:
        updateDivision,

      deleteDivision:
        deleteDivision,


      /*
      Media Drive
      */

      listMedia:
        listMedia,

      getMedia:
        getMedia,

      uploadMedia:
        uploadMedia,

      uploadMediaFile:
        uploadMediaFile,

      replaceMedia:
        replaceMedia,

      replaceMediaFile:
        replaceMediaFile,

      deleteMedia:
        deleteMedia,

      restoreMedia:
        restoreMedia,

      auditMedia:
        auditMedia,

      validateMediaFile:
        validateMediaFile,

      fileToBase64:
        fileToBase64,

      getMediaUploadRules:
        getMediaUploadRules,

      formatMediaFileSize:
        formatMediaFileSize,


      /*
      Session helpers
      */

      getSession:
        getStoredSession,

      getStoredSession:
        getStoredSession,

      getToken:
        getToken,

      getStoredToken:
        getToken,

      isAuthenticated:
        isAuthenticatedLocally,

      getRememberPreference:
        getRememberPreference,

      clearSession:
        function clearSession() {
          clearStoredSession(true);
        },

      redirectToLogin:
        redirectToLogin,

      cancelRequest:
        cancelActiveRequest,


      /*
      Debug state
      */

      getState:
        function getAdminApiState() {
          return {
            requestInProgress:
              state.requestInProgress,

            currentAction:
              state.currentAction,

            authenticated:
              isAuthenticatedLocally(),

            session:
              getStoredSession(),

            memberCrudAvailable:
              true,

            alterCrudAvailable:
              true,

            divisionCrudAvailable:
              true,

            mediaAvailable:
              true,

            lastError:
              state.lastError
                ? {
                    name:
                      state.lastError.name,

                    code:
                      state.lastError.code,

                    message:
                      state.lastError.message,

                    details:
                      state.lastError.details
                  }
                : null
          };
        },

      Error:
        P3RAdminApiError
    });


  debugLog(
    "Admin API frontend berhasil dimuat.",
    {
      memberCrudAvailable:
        true,

      alterCrudAvailable:
        true,

      divisionCrudAvailable:
        true,

      mediaAvailable:
        true
    }
  );
})();