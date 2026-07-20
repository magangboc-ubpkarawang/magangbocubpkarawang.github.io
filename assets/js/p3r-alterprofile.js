/*
=========================================================
P3R-ALTERPROFILE.JS
WEBSITE PROFILE MAGANG PUSDATIN X BOC
UBP KARAWANG
=========================================================

Fungsi utama:
- Membaca ID alter atau ID member dari query URL.
- Mengambil data alter melalui Google Apps Script.
- Menampilkan Alter Profile.
- Menampilkan skill, expertise, video CV, dan gallery.
- Menampilkan tombol kembali ke profil normal.
- Menangani loading, error, not found, copy, share,
  animasi reveal, dan efek glitch.

Contoh URL:

alter.html?id=faisalalrico-alter

atau:

alter.html?memberId=faisalalrico

Urutan script di alter.html:

1. config.js
2. api.js
3. p3r-alterprofile.js
=========================================================
*/

(function initializeP3RAlterProfile() {
  "use strict";


  /*
  =======================================================
  STATE
  =======================================================
  */

  const state = {
    initialized: false,
    loading: false,
    loaded: false,

    alterId: "",
    memberId: "",

    alter: null,
    member: null,

    galleryIndex: 0,
    revealObserver: null,

    glitchInterval: null,
    glitchTimeout: null,

    lastError: null
  };


  /*
  =======================================================
  KONFIGURASI
  =======================================================
  */

  const CONFIG =
    window.P3R_CONFIG &&
    typeof window.P3R_CONFIG === "object"
      ? window.P3R_CONFIG
      : null;

  const PLACEHOLDER_IMG =
    window.P3R_PLACEHOLDER_IMG ||
    "./assets/img/placeholder.png";


  /*
  =======================================================
  SELECTOR
  =======================================================
  */

  function getElement(id) {
    return document.getElementById(id);
  }


  function query(selector) {
    return document.querySelector(selector);
  }


  function queryAll(selector) {
    return Array.from(
      document.querySelectorAll(selector)
    );
  }


  /*
  =======================================================
  LOG
  =======================================================
  */

  function debugLog() {
    if (
      !CONFIG ||
      CONFIG.DEBUG !== true
    ) {
      return;
    }

    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R ALTER]");

    console.info.apply(
      console,
      args
    );
  }


  function errorLog() {
    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R ALTER]");

    console.error.apply(
      console,
      args
    );
  }


  /*
  =======================================================
  HELPER DATA
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


  function normalizeEmpty(value) {
    const normalized =
      asString(value);

    if (!normalized) {
      return "";
    }

    const invalidValues = [
      "-",
      "n/a",
      "na",
      "none",
      "null",
      "undefined"
    ];

    if (
      invalidValues.indexOf(
        normalized.toLowerCase()
      ) !== -1
    ) {
      return "";
    }

    return normalized;
  }


  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function asArray(value) {
    return Array.isArray(value)
      ? value
      : [];
  }


  function toNumber(
    value,
    fallback
  ) {
    const numberValue =
      Number(value);

    if (
      !Number.isFinite(
        numberValue
      )
    ) {
      return fallback === undefined
        ? 0
        : fallback;
    }

    return numberValue;
  }


  function clampNumber(
    value,
    minimum,
    maximum
  ) {
    const min =
      minimum === undefined
        ? 0
        : minimum;

    const max =
      maximum === undefined
        ? 100
        : maximum;

    return Math.max(
      min,
      Math.min(
        max,
        toNumber(value, min)
      )
    );
  }


  /*
  =======================================================
  HTML ESCAPE
  =======================================================
  */

  function escapeHTML(value) {
    return String(
      value === null ||
      value === undefined
        ? ""
        : value
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /*
  =======================================================
  ELEMENT HELPERS
  =======================================================
  */

  function setText(
    id,
    value,
    fallback
  ) {
    const element =
      getElement(id);

    if (!element) {
      return;
    }

    const normalized =
      normalizeEmpty(value);

    const finalText =
      normalized ||
      fallback ||
      "—";

    element.textContent =
      finalText;

    if (
      element.classList.contains(
        "p3r-glitch"
      )
    ) {
      element.setAttribute(
        "data-text",
        finalText
      );
    }
  }


  function setVisible(
    element,
    visible
  ) {
    if (!element) {
      return;
    }

    element.style.display =
      visible
        ? ""
        : "none";
  }


  function setLinkDisabled(
    element,
    disabled
  ) {
    if (!element) {
      return;
    }

    if (disabled) {
      element.setAttribute(
        "aria-disabled",
        "true"
      );

      element.style.pointerEvents =
        "none";

      element.style.opacity =
        ".55";
    } else {
      element.removeAttribute(
        "aria-disabled"
      );

      element.style.pointerEvents =
        "";

      element.style.opacity =
        "";
    }
  }


  /*
  =======================================================
  QUERY PARAMETER
  =======================================================
  */

  function getUrlParameters() {
    return new URLSearchParams(
      window.location.search
    );
  }


  function readAlterParameters() {
    const parameters =
      getUrlParameters();

    return {
      alterId:
        normalizeEmpty(
          parameters.get("id") ||
          parameters.get("alterId") ||
          parameters.get("alter")
        ),

      memberId:
        normalizeEmpty(
          parameters.get("memberId") ||
          parameters.get("member") ||
          parameters.get("normalId") ||
          parameters.get("baseId")
        )
    };
  }


  /*
  =======================================================
  URL HALAMAN
  =======================================================
  */

  function getHomeUrl() {
    if (
      window.P3R_PAGE_URLS &&
      typeof window.P3R_PAGE_URLS.home ===
        "function"
    ) {
      return (
        window.P3R_PAGE_URLS.home() +
        "#roster"
      );
    }

    return "./index.html#roster";
  }


  function getProfileUrl(memberId) {
    const normalizedId =
      normalizeEmpty(memberId);

    if (
      window.P3R_PAGE_URLS &&
      typeof window.P3R_PAGE_URLS.profile ===
        "function"
    ) {
      return window.P3R_PAGE_URLS.profile(
        normalizedId
      );
    }

    return (
      "./profile.html?id=" +
      encodeURIComponent(
        normalizedId
      )
    );
  }


  function getAlterUrl(
    memberId,
    alterId
  ) {
    if (
      window.P3R_PAGE_URLS &&
      typeof window.P3R_PAGE_URLS.alter ===
        "function"
    ) {
      return window.P3R_PAGE_URLS.alter(
        memberId,
        alterId
      );
    }

    const url =
      new URL(
        "./alter.html",
        window.location.href
      );

    if (memberId) {
      url.searchParams.set(
        "memberId",
        memberId
      );
    }

    if (alterId) {
      url.searchParams.set(
        "id",
        alterId
      );
    }

    return url.href;
  }


  /*
  =======================================================
  URL MEDIA DAN GOOGLE DRIVE
  =======================================================

  Mendukung:
  - Path lokal repository.
  - URL HTTP/HTTPS biasa.
  - URL gambar Google Drive.
  - URL file Google Drive dalam format /view, /preview,
    open?id=, uc?id=, dan thumbnail?id=.
  - Data URL dan Blob URL untuk preview lokal.
  =======================================================
  */

  function isSafeMediaProtocol(value) {
    const source =
      normalizeEmpty(value);

    if (!source) {
      return false;
    }

    return !/^(?:javascript|vbscript|file):/i.test(
      source
    );
  }


  function getGoogleDriveFileId(source) {
    const value =
      normalizeEmpty(source);

    if (!value) {
      return "";
    }

    try {
      const parsedUrl =
        new URL(
          value,
          window.location.href
        );

      const hostname =
        parsedUrl.hostname
          .replace(/^www\./, "")
          .toLowerCase();

      const isGoogleDriveHost =
        hostname === "drive.google.com" ||
        hostname === "docs.google.com";

      if (!isGoogleDriveHost) {
        return "";
      }

      const pathMatch =
        parsedUrl.pathname.match(
          /\/(?:file\/d|document\/d|presentation\/d|spreadsheets\/d)\/([a-zA-Z0-9_-]{10,})/
        );

      if (
        pathMatch &&
        pathMatch[1]
      ) {
        return pathMatch[1];
      }

      const queryId =
        normalizeEmpty(
          parsedUrl.searchParams.get(
            "id"
          )
        );

      if (
        /^[a-zA-Z0-9_-]{10,}$/.test(
          queryId
        )
      ) {
        return queryId;
      }
    } catch (error) {
      const pathMatch =
        value.match(
          /\/(?:file\/d|document\/d|presentation\/d|spreadsheets\/d)\/([a-zA-Z0-9_-]{10,})/
        );

      if (
        pathMatch &&
        pathMatch[1]
      ) {
        return pathMatch[1];
      }

      const queryMatch =
        value.match(
          /[?&]id=([a-zA-Z0-9_-]{10,})/
        );

      if (
        queryMatch &&
        queryMatch[1]
      ) {
        return queryMatch[1];
      }
    }

    return "";
  }


  function isGoogleDriveUrl(source) {
    return Boolean(
      getGoogleDriveFileId(
        source
      )
    );
  }


  function createGoogleDriveImageUrl(fileId) {
    const normalizedId =
      normalizeEmpty(fileId);

    if (!normalizedId) {
      return "";
    }

    return (
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(
        normalizedId
      ) +
      "&sz=w2000"
    );
  }


  function createGoogleDrivePreviewUrl(fileId) {
    const normalizedId =
      normalizeEmpty(fileId);

    if (!normalizedId) {
      return "";
    }

    return (
      "https://drive.google.com/file/d/" +
      encodeURIComponent(
        normalizedId
      ) +
      "/preview"
    );
  }


  function toPublicUrl(source) {
    const src =
      normalizeEmpty(source);

    if (
      !src ||
      !isSafeMediaProtocol(src)
    ) {
      return "";
    }

    if (
      src.startsWith("//")
    ) {
      return (
        window.location.protocol +
        src
      );
    }

    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:") ||
      src.startsWith("blob:")
    ) {
      return src;
    }

    const cleanPath =
      src
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    if (!cleanPath) {
      return "";
    }

    if (
      CONFIG &&
      typeof CONFIG.resolveSiteUrl ===
        "function"
    ) {
      return CONFIG.resolveSiteUrl(
        cleanPath
      );
    }

    return (
      "./" +
      cleanPath
    );
  }


  function toPublicImageUrl(source) {
    const src =
      normalizeEmpty(source);

    if (!src) {
      return PLACEHOLDER_IMG;
    }

    const driveFileId =
      getGoogleDriveFileId(
        src
      );

    if (driveFileId) {
      return createGoogleDriveImageUrl(
        driveFileId
      );
    }

    return (
      toPublicUrl(src) ||
      PLACEHOLDER_IMG
    );
  }


  function safePhoto(source) {
    return toPublicImageUrl(
      source
    );
  }


  /*
  =======================================================
  NORMALISASI MEMBER
  =======================================================
  */

  function normalizeMember(member) {
    if (!isPlainObject(member)) {
      return null;
    }

    return Object.assign(
      {},
      member,
      {
        id:
          normalizeEmpty(member.id),

        name:
          normalizeEmpty(member.name),

        photo:
          normalizeEmpty(member.photo),

        role:
          normalizeEmpty(member.role),

        division:
          normalizeEmpty(
            member.division
          )
      }
    );
  }


  /*
  =======================================================
  NORMALISASI ALTER
  =======================================================
  */

  function normalizeAlter(alter) {
    if (!isPlainObject(alter)) {
      return null;
    }

    const stats =
      isPlainObject(alter.stats)
        ? alter.stats
        : {};

    const expertise =
      isPlainObject(alter.expertise)
        ? alter.expertise
        : {};

    return Object.assign(
      {},
      alter,
      {
        id:
          normalizeEmpty(alter.id),

        normalId:
          normalizeEmpty(
            alter.normalId ||
            alter.normal_id ||
            alter.baseId ||
            alter.base_id ||
            alter.memberId ||
            alter.member_id
          ),

        baseId:
          normalizeEmpty(
            alter.baseId ||
            alter.base_id ||
            alter.normalId ||
            alter.normal_id
          ),

        profileType:
          normalizeEmpty(
            alter.profileType ||
            alter.profile_type
          ) || "alter",

        theme:
          normalizeEmpty(
            alter.theme
          ) || "dark-hour",

        name:
          normalizeEmpty(
            alter.name
          ),

        role:
          normalizeEmpty(
            alter.role
          ),

        division:
          normalizeEmpty(
            alter.division
          ),

        divisionKey:
          normalizeEmpty(
            alter.divisionKey ||
            alter.division_key
          ),

        mainRole:
          normalizeEmpty(
            alter.mainRole ||
            alter.main_role
          ),

        tagline:
          normalizeEmpty(
            alter.tagline
          ),

        bio:
          normalizeEmpty(
            alter.bio
          ),

        photo:
          normalizeEmpty(
            alter.photo
          ),

        videoCV:
          normalizeEmpty(
            alter.videoCV ||
            alter.video_cv
          ),

        status:
          normalizeEmpty(
            alter.status
          ),

        joinDate:
          normalizeEmpty(
            alter.joinDate ||
            alter.join_date
          ),

        signature:
          normalizeEmpty(
            alter.signature
          ),

        stats:
          stats,

        skills:
          asArray(alter.skills),

        expertise:
          expertise,

        gallery:
          asArray(alter.gallery)
      }
    );
  }


  /*
  =======================================================
  NORMALISASI EXPERTISE
  =======================================================
  */

  function normalizeExpertise(expertise) {
    const source =
      isPlainObject(expertise)
        ? expertise
        : {};

    return {
      playstyle:
        normalizeEmpty(
          source.playstyle ||
          source.play_style
        ),

      strength:
        asArray(
          source.strength ||
          source.strengths
        ),

      rolePool:
        asArray(
          source.rolePool ||
          source.role_pool
        ),

      mains:
        asArray(
          source.mains ||
          source.main_tools ||
          source.tools
        ),

      achievement:
        normalizeEmpty(
          source.achievement ||
          source.achievements
        )
    };
  }


  /*
  =======================================================
  SYSTEM STATUS PANEL
  =======================================================
  */

  function ensureSystemStatusPanel() {
    let panel =
      getElement(
        "alterSystemStatus"
      );

    if (panel) {
      return panel;
    }

    const main =
      query(".p3r-alter-main");

    if (!main) {
      return null;
    }

    main.insertAdjacentHTML(
      "afterbegin",
      `
        <section
          class="container pt-4"
          id="alterSystemStatus"
          style="display:none"
          aria-live="polite"
        >
          <div class="p3r-panel">
            <div
              class="p3r-panel-title"
              id="alterSystemStatusTitle"
            >
              <span class="p3r-panel-title-dot"></span>
              ALTER SYSTEM
            </div>

            <div
              class="p3r-muted mt-2"
              id="alterSystemStatusMessage"
            >
              Menyiapkan data alter.
            </div>

            <div
              class="mt-3"
              id="alterSystemStatusActions"
              style="display:none"
            >
              <button
                class="p3r-btn"
                id="alterRetryButton"
                type="button"
              >
                RETRY CONNECTION
              </button>

              <a
                class="p3r-btn p3r-btn-ghost"
                id="alterStatusBackButton"
                href="./index.html#roster"
              >
                BACK TO ROSTER
              </a>
            </div>
          </div>
        </section>
      `
    );

    panel =
      getElement(
        "alterSystemStatus"
      );

    const retryButton =
      getElement(
        "alterRetryButton"
      );

    if (
      retryButton &&
      retryButton.dataset.listenerReady !==
        "1"
    ) {
      retryButton.dataset.listenerReady =
        "1";

      retryButton.addEventListener(
        "click",
        function retryAlter() {
          loadAlterProfile();
        }
      );
    }

    const backButton =
      getElement(
        "alterStatusBackButton"
      );

    if (backButton) {
      backButton.href =
        getHomeUrl();
    }

    return panel;
  }


  function showSystemStatus(
    title,
    message,
    options
  ) {
    const settings =
      options || {};

    const panel =
      ensureSystemStatusPanel();

    if (!panel) {
      return;
    }

    panel.style.display =
      "";

    setText(
      "alterSystemStatusTitle",
      title,
      "ALTER SYSTEM"
    );

    setText(
      "alterSystemStatusMessage",
      message,
      "Memproses data."
    );

    const actions =
      getElement(
        "alterSystemStatusActions"
      );

    if (actions) {
      actions.style.display =
        settings.showActions === true
          ? ""
          : "none";
    }

    const retryButton =
      getElement(
        "alterRetryButton"
      );

    if (retryButton) {
      retryButton.style.display =
        settings.showRetry === true
          ? ""
          : "none";
    }
  }


  function hideSystemStatus() {
    const panel =
      getElement(
        "alterSystemStatus"
      );

    if (panel) {
      panel.style.display =
        "none";
    }
  }


  /*
  =======================================================
  LOADING STATE
  =======================================================
  */

  function setLoadingState(loading) {
    state.loading =
      Boolean(loading);

    const alterStage =
      query(".p3r-alter-stage");

    const alterDetails =
      query(".p3r-alter-details");

    if (alterStage) {
      alterStage.setAttribute(
        "aria-busy",
        loading
          ? "true"
          : "false"
      );
    }

    if (alterDetails) {
      alterDetails.setAttribute(
        "aria-busy",
        loading
          ? "true"
          : "false"
      );
    }

    setLinkDisabled(
      getElement("copyLinkBtn"),
      loading
    );

    setLinkDisabled(
      getElement("shareBtn"),
      loading
    );

    setLinkDisabled(
      getElement("normalBtn"),
      loading
    );

    setLinkDisabled(
      getElement("backToNormalBtn"),
      loading
    );

    if (loading) {
      showSystemStatus(
        "LOADING ALTER DATA",
        "Mengambil Alter Profile dari Google Spreadsheet.",
        {
          showActions: false,
          showRetry: false
        }
      );

      setText(
        "name",
        "INITIALIZING..."
      );

      setText(
        "bio",
        "Menghubungkan Dark Hour dossier dengan database."
      );
    }
  }


  /*
  =======================================================
  COPY LINK
  =======================================================
  */

  async function copyText(text) {
    if (
      window.isSecureContext &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText ===
        "function"
    ) {
      await navigator.clipboard.writeText(
        text
      );

      return;
    }

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      text;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position =
      "fixed";

    textarea.style.left =
      "-9999px";

    textarea.style.top =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();

    const successful =
      document.execCommand(
        "copy"
      );

    textarea.remove();

    if (!successful) {
      throw new Error(
        "Copy fallback gagal."
      );
    }
  }


  async function copyCurrentLink(button) {
    try {
      await copyText(
        window.location.href
      );

      if (button) {
        const previousText =
          button.textContent;

        button.textContent =
          "COPIED";

        window.setTimeout(
          function restoreButtonText() {
            button.textContent =
              previousText;
          },
          1200
        );
      }
    } catch (error) {
      window.prompt(
        "Salin link Alter Profile:",
        window.location.href
      );
    }
  }


  /*
  =======================================================
  SHARE ALTER
  =======================================================
  */

  async function shareAlter(button) {
    const alter =
      state.alter;

    const shareData = {
      title:
        alter && alter.name
          ? "Alter Profile — " +
            alter.name
          : "PUSDATIN X BOC Alter Profile",

      text:
        alter && alter.tagline
          ? alter.tagline
          : "Lihat Alter Profile anggota PUSDATIN X BOC UBP Karawang.",

      url:
        window.location.href
    };

    if (
      navigator.share &&
      window.isSecureContext
    ) {
      try {
        await navigator.share(
          shareData
        );

        return;
      } catch (error) {
        if (
          error &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    await copyCurrentLink(
      button
    );
  }


  /*
  =======================================================
  GLITCH EFFECT
  =======================================================
  */

  function triggerGlitch() {
    const body =
      document.body;

    if (
      !body.classList.contains(
        "p3r-alter-page"
      )
    ) {
      return;
    }

    body.classList.add(
      "is-glitch"
    );

    if (state.glitchTimeout) {
      window.clearTimeout(
        state.glitchTimeout
      );
    }

    state.glitchTimeout =
      window.setTimeout(
        function removeGlitch() {
          body.classList.remove(
            "is-glitch"
          );
        },
        120 + Math.random() * 140
      );
  }


  function initAlterGlitch() {
    const body =
      document.body;

    if (
      !body.classList.contains(
        "p3r-alter-page"
      )
    ) {
      return;
    }

    if (
      body.dataset.glitchInit ===
      "1"
    ) {
      return;
    }

    body.dataset.glitchInit =
      "1";

    state.glitchInterval =
      window.setInterval(
        function randomGlitch() {
          if (document.hidden) {
            return;
          }

          if (
            Math.random() <
            0.22
          ) {
            triggerGlitch();
          }
        },
        900
      );

    window.addEventListener(
      "click",
      triggerGlitch,
      {
        passive: true
      }
    );

    document.addEventListener(
      "visibilitychange",
      function handleVisibilityChange() {
        if (document.hidden) {
          body.classList.remove(
            "is-glitch"
          );
        }
      }
    );
  }


  function stopAlterGlitch() {
    if (state.glitchInterval) {
      window.clearInterval(
        state.glitchInterval
      );

      state.glitchInterval =
        null;
    }

    if (state.glitchTimeout) {
      window.clearTimeout(
        state.glitchTimeout
      );

      state.glitchTimeout =
        null;
    }

    document.body.classList.remove(
      "is-glitch"
    );
  }


  /*
  =======================================================
  VIDEO EMBED
  =======================================================
  */

  function toYouTubeEmbed(url) {
    const source =
      normalizeEmpty(url);

    if (!source) {
      return "";
    }

    try {
      const parsedUrl =
        new URL(source);

      const hostname =
        parsedUrl.hostname
          .replace(/^www\./, "")
          .toLowerCase();

      if (
        hostname === "youtu.be"
      ) {
        const videoId =
          parsedUrl.pathname
            .replace(/^\/+/, "")
            .split("/")[0];

        return videoId
          ? "https://www.youtube.com/embed/" +
              encodeURIComponent(
                videoId
              )
          : "";
      }

      if (
        hostname === "youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "music.youtube.com"
      ) {
        if (
          parsedUrl.pathname.startsWith(
            "/embed/"
          )
        ) {
          const videoId =
            parsedUrl.pathname
              .split("/embed/")[1]
              .split("/")[0];

          return videoId
            ? "https://www.youtube.com/embed/" +
                encodeURIComponent(
                  videoId
                )
            : "";
        }

        if (
          parsedUrl.pathname.startsWith(
            "/shorts/"
          )
        ) {
          const videoId =
            parsedUrl.pathname
              .split("/shorts/")[1]
              .split("/")[0];

          return videoId
            ? "https://www.youtube.com/embed/" +
                encodeURIComponent(
                  videoId
                )
            : "";
        }

        const videoId =
          parsedUrl.searchParams.get(
            "v"
          );

        return videoId
          ? "https://www.youtube.com/embed/" +
              encodeURIComponent(
                videoId
              )
          : "";
      }
    } catch (error) {
      return "";
    }

    return "";
  }


  function toVimeoEmbed(url) {
    const source =
      normalizeEmpty(url);

    if (!source) {
      return "";
    }

    try {
      const parsedUrl =
        new URL(source);

      const hostname =
        parsedUrl.hostname
          .replace(/^www\./, "")
          .toLowerCase();

      if (
        hostname !== "vimeo.com" &&
        hostname !== "player.vimeo.com"
      ) {
        return "";
      }

      const match =
        parsedUrl.pathname.match(
          /(?:\/video)?\/(\d+)/
        );

      return (
        match &&
        match[1]
      )
        ? "https://player.vimeo.com/video/" +
            encodeURIComponent(
              match[1]
            )
        : "";
    } catch (error) {
      return "";
    }
  }


  function getVideoType(url) {
    const normalized =
      asString(url)
        .toLowerCase();

    const pathname =
      normalized
        .split("?")[0]
        .split("#")[0];

    if (
      pathname.endsWith(".webm")
    ) {
      return "video/webm";
    }

    if (
      pathname.endsWith(".ogg") ||
      pathname.endsWith(".ogv")
    ) {
      return "video/ogg";
    }

    if (
      pathname.endsWith(".mov")
    ) {
      return "video/quicktime";
    }

    return "video/mp4";
  }


  function renderVideoIframe(
    wrapper,
    source,
    title
  ) {
    wrapper.innerHTML = `
      <iframe
        src="${escapeHTML(source)}"
        title="${escapeHTML(title)}"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
          web-share
        "
        allowfullscreen
      ></iframe>
    `;
  }


  function renderDirectVideo(
    wrapper,
    source,
    title
  ) {
    wrapper.innerHTML = `
      <video
        controls
        preload="metadata"
        playsinline
        aria-label="${escapeHTML(title)}"
      >
        <source
          src="${escapeHTML(source)}"
          type="${escapeHTML(
            getVideoType(source)
          )}"
        >

        Browser tidak mendukung pemutar video.
      </video>
    `;
  }


  /*
  =======================================================
  VIDEO CV
  =======================================================
  */

  function renderVideoCV(videoUrl) {
    const wrapper =
      getElement("videoWrap");

    const note =
      getElement("videoNote");

    if (
      !wrapper ||
      !note
    ) {
      return;
    }

    const panel =
      wrapper.closest(
        ".p3r-panel"
      );

    const source =
      normalizeEmpty(videoUrl);

    if (
      !source ||
      !isSafeMediaProtocol(source)
    ) {
      setVisible(
        panel,
        false
      );

      wrapper.innerHTML =
        "";

      note.textContent =
        "—";

      return;
    }

    setVisible(
      panel,
      true
    );

    const youtubeEmbed =
      toYouTubeEmbed(
        source
      );

    if (youtubeEmbed) {
      note.textContent =
        "Alter Video CV melalui YouTube.";

      renderVideoIframe(
        wrapper,
        youtubeEmbed,
        "Alter Video CV"
      );

      return;
    }

    const vimeoEmbed =
      toVimeoEmbed(
        source
      );

    if (vimeoEmbed) {
      note.textContent =
        "Alter Video CV melalui Vimeo.";

      renderVideoIframe(
        wrapper,
        vimeoEmbed,
        "Alter Video CV"
      );

      return;
    }

    const driveFileId =
      getGoogleDriveFileId(
        source
      );

    if (driveFileId) {
      note.textContent =
        "Alter Video CV melalui Google Drive.";

      renderVideoIframe(
        wrapper,
        createGoogleDrivePreviewUrl(
          driveFileId
        ),
        "Alter Video CV Google Drive"
      );

      return;
    }

    const publicUrl =
      toPublicUrl(
        source
      );

    if (!publicUrl) {
      setVisible(
        panel,
        false
      );

      wrapper.innerHTML =
        "";

      note.textContent =
        "—";

      return;
    }

    note.textContent =
      "Alter Video CV.";

    renderDirectVideo(
      wrapper,
      publicUrl,
      "Alter Video CV"
    );
  }


  /*
  =======================================================
  SKILLS
  =======================================================
  */

  function normalizeSkill(skill) {
    if (!isPlainObject(skill)) {
      return null;
    }

    const name =
      normalizeEmpty(
        skill.name ||
        skill.label ||
        skill.title
      );

    if (!name) {
      return null;
    }

    return {
      name:
        name,

      value:
        clampNumber(
          skill.value ||
          skill.score ||
          skill.level
        )
    };
  }


  function renderSkills(skills) {
    const wrapper =
      getElement("skillsWrap");

    if (!wrapper) {
      return;
    }

    const list =
      asArray(skills)
        .map(normalizeSkill)
        .filter(Boolean);

    if (!list.length) {
      wrapper.innerHTML = `
        <div class="p3r-skill">
          <div class="p3r-skill-top">
            <div>NO DATA</div>
            <div>0/100</div>
          </div>

          <div class="p3r-bar">
            <span style="width:0%"></span>
          </div>
        </div>
      `;

      setText(
        "skillHint",
        "Overall: 0/100"
      );

      return;
    }

    wrapper.innerHTML =
      list
        .map(
          function createSkill(skill) {
            return `
              <div class="p3r-skill">
                <div class="p3r-skill-top">
                  <div>
                    ${escapeHTML(
                      skill.name
                    )}
                  </div>

                  <div>
                    ${skill.value}/100
                  </div>
                </div>

                <div class="p3r-bar">
                  <span
                    data-alter-skill-bar="${skill.value}"
                    style="width:0%"
                  ></span>
                </div>
              </div>
            `;
          }
        )
        .join("");

    window.requestAnimationFrame(
      function animateSkillBars() {
        queryAll(
          "[data-alter-skill-bar]"
        ).forEach(
          function animateBar(bar) {
            const value =
              clampNumber(
                bar.getAttribute(
                  "data-alter-skill-bar"
                )
              );

            bar.style.width =
              value + "%";
          }
        );
      }
    );

    const total =
      list.reduce(
        function sumSkills(
          sum,
          skill
        ) {
          return (
            sum +
            skill.value
          );
        },
        0
      );

    const overall =
      Math.round(
        total /
        Math.max(
          list.length,
          1
        )
      );

    setText(
      "skillHint",
      "Overall: " +
        overall +
        "/100"
    );
  }


  /*
  =======================================================
  TAGS
  =======================================================
  */

  function normalizeTagValue(item) {
    if (
      isPlainObject(item)
    ) {
      return normalizeEmpty(
        item.name ||
        item.label ||
        item.title ||
        item.value
      );
    }

    return normalizeEmpty(
      item
    );
  }


  function renderTags(
    containerId,
    values
  ) {
    const element =
      getElement(containerId);

    if (!element) {
      return;
    }

    const items =
      asArray(values)
        .map(normalizeTagValue)
        .filter(Boolean);

    if (!items.length) {
      element.innerHTML = `
        <span class="p3r-tag">
          NO DATA
        </span>
      `;

      return;
    }

    element.innerHTML =
      items
        .map(
          function createTag(item) {
            return `
              <span class="p3r-tag">
                ${escapeHTML(item)}
              </span>
            `;
          }
        )
        .join("");
  }


  /*
  =======================================================
  GALLERY
  =======================================================
  */

  function normalizeGallery(gallery) {
    return asArray(gallery)
      .map(
        function normalizeGalleryItem(
          item
        ) {
          if (
            typeof item === "string"
          ) {
            return {
              src:
                normalizeEmpty(item),

              caption:
                ""
            };
          }

          if (!isPlainObject(item)) {
            return null;
          }

          return {
            src:
              normalizeEmpty(
                item.src ||
                item.url ||
                item.image ||
                item.path
              ),

            caption:
              normalizeEmpty(
                item.caption ||
                item.title ||
                item.description
              )
          };
        }
      )
      .filter(
        function filterGalleryItem(
          item
        ) {
          return (
            item &&
            item.src
          );
        }
      );
  }


  function renderGallery(gallery) {
    const panel =
      getElement("galleryPanel");

    const track =
      getElement("gTrack");

    const dots =
      getElement("gDots");

    const caption =
      getElement("gCap");

    const previousButton =
      getElement("gPrev");

    const nextButton =
      getElement("gNext");

    const viewport =
      getElement("gViewport");

    if (
      !panel ||
      !track ||
      !dots ||
      !caption ||
      !previousButton ||
      !nextButton ||
      !viewport
    ) {
      return;
    }

    const items =
      normalizeGallery(
        gallery
      );

    if (!items.length) {
      panel.style.display =
        "none";

      track.innerHTML =
        "";

      dots.innerHTML =
        "";

      caption.textContent =
        "";

      return;
    }

    panel.style.display =
      "";

    state.galleryIndex =
      0;


    function normalizeIndex(index) {
      if (index < 0) {
        return items.length - 1;
      }

      if (
        index >=
        items.length
      ) {
        return 0;
      }

      return index;
    }


    function goToSlide(index) {
      state.galleryIndex =
        normalizeIndex(index);

      track.style.transform =
        "translateX(-" +
        state.galleryIndex * 100 +
        "%)";

      caption.textContent =
        items[
          state.galleryIndex
        ].caption || "";

      dots
        .querySelectorAll(
          ".p3r-g-dot"
        )
        .forEach(
          function updateDot(
            dot,
            dotIndex
          ) {
            dot.classList.toggle(
              "is-on",
              dotIndex ===
                state.galleryIndex
            );
          }
        );
    }


    track.innerHTML =
      items
        .map(
          function createSlide(item) {
            return `
              <div class="p3r-g-slide">
                <img
                  src="${escapeHTML(
                    toPublicImageUrl(
                      item.src
                    )
                  )}"
                  alt="${escapeHTML(
                    item.caption ||
                    "Alter gallery"
                  )}"
                  loading="lazy"
                  decoding="async"
                  onerror="
                    this.onerror=null;
                    this.src='${escapeHTML(
                      PLACEHOLDER_IMG
                    )}';
                  "
                >
              </div>
            `;
          }
        )
        .join("");


    dots.innerHTML =
      items
        .map(
          function createDot(
            item,
            index
          ) {
            const activeClass =
              index === 0
                ? "is-on"
                : "";

            return `
              <button
                class="p3r-g-dot ${activeClass}"
                type="button"
                data-alter-gallery-dot="${index}"
                aria-label="Buka gambar ${index + 1}"
              ></button>
            `;
          }
        )
        .join("");


    dots
      .querySelectorAll(
        "[data-alter-gallery-dot]"
      )
      .forEach(
        function bindGalleryDot(
          dot
        ) {
          dot.addEventListener(
            "click",
            function selectGalleryDot() {
              goToSlide(
                Number(
                  dot.getAttribute(
                    "data-alter-gallery-dot"
                  )
                ) || 0
              );
            }
          );
        }
      );


    previousButton.onclick =
      function previousSlide() {
        goToSlide(
          state.galleryIndex -
          1
        );
      };


    nextButton.onclick =
      function nextSlide() {
        goToSlide(
          state.galleryIndex +
          1
        );
      };


    let touchStartX =
      null;


    viewport.ontouchstart =
      function handleTouchStart(
        event
      ) {
        touchStartX =
          event.touches &&
          event.touches[0]
            ? event.touches[0]
                .clientX
            : null;
      };


    viewport.ontouchend =
      function handleTouchEnd(
        event
      ) {
        if (
          touchStartX === null
        ) {
          return;
        }

        const endX =
          event.changedTouches &&
          event.changedTouches[0]
            ? event.changedTouches[0]
                .clientX
            : touchStartX;

        const difference =
          endX -
          touchStartX;

        touchStartX =
          null;

        if (
          Math.abs(difference) <
          40
        ) {
          return;
        }

        if (difference > 0) {
          goToSlide(
            state.galleryIndex -
            1
          );
        } else {
          goToSlide(
            state.galleryIndex +
            1
          );
        }
      };


    const multipleItems =
      items.length > 1;

    previousButton.style.display =
      multipleItems
        ? ""
        : "none";

    nextButton.style.display =
      multipleItems
        ? ""
        : "none";

    dots.style.display =
      multipleItems
        ? ""
        : "none";

    goToSlide(0);
  }


  /*
  =======================================================
  TOMBOL NORMAL PROFILE
  =======================================================
  */

  function resolveNormalMemberId(
    alter,
    member
  ) {
    return normalizeEmpty(
      member && member.id
    ) ||
    normalizeEmpty(
      alter && alter.normalId
    ) ||
    normalizeEmpty(
      alter && alter.baseId
    ) ||
    state.memberId;
  }


  function renderNormalButtons(
    alter,
    member
  ) {
    const normalButton =
      getElement("normalBtn");

    const backButton =
      getElement(
        "backToNormalBtn"
      );

    const normalMemberId =
      resolveNormalMemberId(
        alter,
        member
      );

    if (!normalMemberId) {
      if (normalButton) {
        normalButton.style.display =
          "none";

        normalButton.removeAttribute(
          "href"
        );
      }

      if (backButton) {
        backButton.href =
          getHomeUrl();

        backButton.textContent =
          "BACK";
      }

      return;
    }

    const profileUrl =
      getProfileUrl(
        normalMemberId
      );

    if (normalButton) {
      normalButton.style.display =
        "";

      normalButton.href =
        profileUrl;

      normalButton.title =
        "Kembali ke profil normal";

      normalButton.textContent =
        "NORMAL";
    }

    if (backButton) {
      backButton.href =
        profileUrl;

      backButton.title =
        "Kembali ke profil normal";
    }
  }


  /*
  =======================================================
  RENDER ALTER PROFILE
  =======================================================
  */

  function renderAlterProfile(
    alter,
    member
  ) {
    state.alter =
      alter;

    state.member =
      member;

    window.ALTER =
      alter;

    window.MEMBER =
      member;

    window.NORMAL_ID =
      resolveNormalMemberId(
        alter,
        member
      );

    document.title =
      "PUSDATIN X BOC — ALTER — " +
      (
        alter.name ||
        "Profile"
      );


    const photo =
      getElement("photo");

    if (photo) {
      photo.src =
        safePhoto(
          alter.photo
        );

      photo.alt =
        "Foto " +
        (
          alter.name ||
          "Alter"
        );

      photo.onerror =
        function handlePhotoError() {
          photo.onerror =
            null;

          photo.src =
            PLACEHOLDER_IMG;
        };
    }


    const stats =
      isPlainObject(alter.stats)
        ? alter.stats
        : {};

    const expertise =
      normalizeExpertise(
        alter.expertise
      );


    setText(
      "name",
      alter.name
    );

    setText(
      "role",
      alter.role
    );

    setText(
      "division",
      alter.division
    );

    setText(
      "mainRole",
      alter.mainRole
    );

    setText(
      "status",
      alter.status
    );

    setText(
      "tagline",
      alter.tagline
    );

    setText(
      "bio",
      alter.bio
    );

    setText(
      "rank",
      stats.rank
    );

    setText(
      "level",
      stats.level
    );

    setText(
      "winrate",
      stats.winrate
    );

    setText(
      "joinDate",
      alter.joinDate
    );

    setText(
      "signature",
      alter.signature
    );


    renderNormalButtons(
      alter,
      member
    );

    renderSkills(
      alter.skills
    );

    renderVideoCV(
      alter.videoCV
    );

    renderGallery(
      alter.gallery
    );


    setText(
      "playstyle",
      expertise.playstyle
    );

    renderTags(
      "strengthTags",
      expertise.strength
    );

    renderTags(
      "rolePool",
      expertise.rolePool
    );

    renderTags(
      "mains",
      expertise.mains
    );

    setText(
      "achievement",
      expertise.achievement
    );


    hideSystemStatus();

    setLinkDisabled(
      getElement("copyLinkBtn"),
      false
    );

    setLinkDisabled(
      getElement("shareBtn"),
      false
    );

    setLinkDisabled(
      getElement("normalBtn"),
      false
    );

    setLinkDisabled(
      getElement(
        "backToNormalBtn"
      ),
      false
    );


    initAlterGlitch();

    window.setTimeout(
      triggerGlitch,
      250
    );


    debugLog(
      "Alter Profile berhasil dirender.",
      {
        alterId:
          alter.id,

        alterName:
          alter.name,

        normalMemberId:
          resolveNormalMemberId(
            alter,
            member
          )
      }
    );
  }


  /*
  =======================================================
  HIDE OPTIONAL PANELS
  =======================================================
  */

  function hideOptionalPanels() {
    const galleryPanel =
      getElement(
        "galleryPanel"
      );

    if (galleryPanel) {
      galleryPanel.style.display =
        "none";
    }

    const videoWrapper =
      getElement(
        "videoWrap"
      );

    const videoPanel =
      videoWrapper
        ? videoWrapper.closest(
            ".p3r-panel"
          )
        : null;

    if (videoPanel) {
      videoPanel.style.display =
        "none";
    }

    const normalButton =
      getElement(
        "normalBtn"
      );

    if (normalButton) {
      normalButton.style.display =
        "none";
    }
  }


  /*
  =======================================================
  NOT FOUND
  =======================================================
  */

  function renderNotFound(message) {
    stopAlterGlitch();
    hideOptionalPanels();

    setText(
      "name",
      "ALTER NOT FOUND"
    );

    setText(
      "role",
      "—"
    );

    setText(
      "division",
      "—"
    );

    setText(
      "mainRole",
      "—"
    );

    setText(
      "status",
      "UNAVAILABLE"
    );

    setText(
      "rank",
      "—"
    );

    setText(
      "level",
      "—"
    );

    setText(
      "winrate",
      "—"
    );

    setText(
      "tagline",
      "DARK HOUR DATA UNAVAILABLE"
    );

    setText(
      "bio",
      message ||
      "Data Alter Profile tidak ditemukan."
    );

    const photo =
      getElement("photo");

    if (photo) {
      photo.src =
        PLACEHOLDER_IMG;
    }

    const backButton =
      getElement(
        "backToNormalBtn"
      );

    if (backButton) {
      backButton.href =
        state.memberId
          ? getProfileUrl(
              state.memberId
            )
          : getHomeUrl();
    }

    showSystemStatus(
      "ALTER NOT FOUND",
      message ||
      "Data alter tidak ditemukan di database.",
      {
        showActions: true,
        showRetry: false
      }
    );
  }


  /*
  =======================================================
  ERROR
  =======================================================
  */

  function getFriendlyErrorMessage(
    error
  ) {
    if (!error) {
      return (
        "Terjadi kesalahan yang tidak diketahui."
      );
    }

    if (
      error.code ===
      "MISSING_ALTER_PARAMETER"
    ) {
      return (
        "Parameter ID alter atau ID member tidak ditemukan pada URL."
      );
    }

    if (
      error.code ===
      "REQUEST_TIMEOUT"
    ) {
      return (
        "Koneksi ke database melewati batas waktu."
      );
    }

    if (
      error.code ===
      "NETWORK_ERROR"
    ) {
      return (
        "Browser tidak dapat terhubung ke Google Apps Script."
      );
    }

    if (
      error.code ===
      "NOT_FOUND" ||
      error.code ===
      "ALTER_NOT_FOUND"
    ) {
      return (
        "Alter Profile tidak ditemukan di database."
      );
    }

    if (
      error.code ===
      "INVALID_JSON_RESPONSE"
    ) {
      return (
        "Server mengembalikan data yang tidak dapat dibaca."
      );
    }

    return (
      normalizeEmpty(
        error.message
      ) ||
      "Alter Profile gagal dimuat dari database."
    );
  }


  function renderError(error) {
    state.lastError =
      error;

    const message =
      getFriendlyErrorMessage(
        error
      );

    stopAlterGlitch();
    hideOptionalPanels();

    setText(
      "name",
      "CONNECTION ERROR"
    );

    setText(
      "tagline",
      "DARK HOUR SYSTEM OFFLINE"
    );

    setText(
      "bio",
      message
    );

    const photo =
      getElement("photo");

    if (photo) {
      photo.src =
        PLACEHOLDER_IMG;
    }

    showSystemStatus(
      "ALTER LOAD FAILED",
      message,
      {
        showActions: true,
        showRetry: true
      }
    );
  }


  /*
  =======================================================
  REVEAL ANIMATION
  =======================================================
  */

  function initReveal() {
    const nodes =
      queryAll(
        ".p3r-reveal"
      );

    if (
      !(
        "IntersectionObserver" in
        window
      )
    ) {
      nodes.forEach(
        function revealImmediately(
          node
        ) {
          node.classList.add(
            "is-in"
          );
        }
      );

      return;
    }

    if (
      !state.revealObserver
    ) {
      state.revealObserver =
        new IntersectionObserver(
          function revealEntries(
            entries
          ) {
            entries.forEach(
              function revealEntry(
                entry
              ) {
                if (
                  !entry.isIntersecting
                ) {
                  return;
                }

                entry.target.classList.add(
                  "is-in"
                );

                state.revealObserver.unobserve(
                  entry.target
                );
              }
            );
          },
          {
            threshold: 0.12
          }
        );
    }

    nodes.forEach(
      function observeNode(node) {
        state.revealObserver.observe(
          node
        );
      }
    );
  }


  /*
  =======================================================
  BUTTON LISTENERS
  =======================================================
  */

  function setupButtons() {
    const copyButton =
      getElement(
        "copyLinkBtn"
      );

    if (
      copyButton &&
      copyButton.dataset.listenerReady !==
        "1"
    ) {
      copyButton.dataset.listenerReady =
        "1";

      copyButton.addEventListener(
        "click",
        function handleCopy(event) {
          event.preventDefault();

          copyCurrentLink(
            copyButton
          );
        }
      );
    }


    const shareButton =
      getElement(
        "shareBtn"
      );

    if (
      shareButton &&
      shareButton.dataset.listenerReady !==
        "1"
    ) {
      shareButton.dataset.listenerReady =
        "1";

      shareButton.addEventListener(
        "click",
        function handleShare(event) {
          event.preventDefault();

          shareAlter(
            shareButton
          );
        }
      );
    }


    const normalButton =
      getElement(
        "normalBtn"
      );

    if (
      normalButton &&
      normalButton.dataset.listenerReady !==
        "1"
    ) {
      normalButton.dataset.listenerReady =
        "1";

      normalButton.addEventListener(
        "click",
        function handleNormalButton() {
          stopAlterGlitch();
        }
      );
    }


    const backButton =
      getElement(
        "backToNormalBtn"
      );

    if (
      backButton &&
      backButton.dataset.listenerReady !==
        "1"
    ) {
      backButton.dataset.listenerReady =
        "1";

      backButton.addEventListener(
        "click",
        function handleBackButton() {
          stopAlterGlitch();
        }
      );
    }
  }


  /*
  =======================================================
  LOAD ALTER PROFILE
  =======================================================
  */

  async function loadAlterProfile() {
    if (state.loading) {
      return;
    }

    const parameters =
      readAlterParameters();

    state.alterId =
      parameters.alterId;

    state.memberId =
      parameters.memberId;

    if (
      !state.alterId &&
      !state.memberId
    ) {
      state.loaded =
        false;

      renderNotFound(
        "URL harus memiliki parameter seperti alter.html?memberId=faisalalrico atau alter.html?id=id-alter."
      );

      return;
    }

    setLoadingState(true);

    try {
      if (
        !window.P3R_API ||
        typeof window.P3R_API.getAlter !==
          "function"
      ) {
        throw new Error(
          "P3R_API belum tersedia. Pastikan config.js dan api.js dimuat sebelum p3r-alterprofile.js."
        );
      }

      const response =
        await window.P3R_API.getAlter({
          id:
            state.alterId,

          memberId:
            state.memberId
        });

      const alter =
        normalizeAlter(
          response &&
          response.alter
        );

      const member =
        normalizeMember(
          response &&
          response.member
        );

      if (!alter) {
        state.loaded =
          false;

        renderNotFound(
          state.memberId
            ? "Alter Profile untuk member " +
              state.memberId +
              " tidak ditemukan."
            : "Alter Profile dengan ID " +
              state.alterId +
              " tidak ditemukan."
        );

        return;
      }

      state.loaded =
        true;

      state.lastError =
        null;

      renderAlterProfile(
        alter,
        member
      );

      window.dispatchEvent(
        new CustomEvent(
          "p3r:alter-rendered",
          {
            detail: {
              alter:
                alter,

              member:
                member
            }
          }
        )
      );
    } catch (error) {
      state.loaded =
        false;

      errorLog(
        "Gagal memuat Alter Profile.",
        error
      );

      renderError(
        error
      );
    } finally {
      state.loading =
        false;
    }
  }


  /*
  =======================================================
  INIT
  =======================================================
  */

  function initAlterProfile() {
    if (state.initialized) {
      return;
    }

    state.initialized =
      true;

    const year =
      getElement("year");

    if (year) {
      year.textContent =
        String(
          new Date().getFullYear()
        );
    }

    ensureSystemStatusPanel();
    setupButtons();
    initReveal();
    loadAlterProfile();
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initAlterProfile,
      {
        once: true
      }
    );
  } else {
    initAlterProfile();
  }


  /*
  =======================================================
  CLEANUP
  =======================================================
  */

  window.addEventListener(
    "beforeunload",
    stopAlterGlitch
  );


  /*
  =======================================================
  PUBLIC API
  =======================================================
  */

  window.P3R_ALTER_PROFILE =
    Object.freeze({
      reload:
        loadAlterProfile,

      triggerGlitch:
        triggerGlitch,

      stopGlitch:
        stopAlterGlitch,

      getAlterUrl:
        getAlterUrl,

      getProfileUrl:
        getProfileUrl,

      getState:
        function getAlterState() {
          return {
            initialized:
              state.initialized,

            loading:
              state.loading,

            loaded:
              state.loaded,

            alterId:
              state.alterId,

            memberId:
              state.memberId,

            alter:
              state.alter,

            member:
              state.member,

            lastError:
              state.lastError
                ? {
                    message:
                      state.lastError.message,

                    code:
                      state.lastError.code ||
                      ""
                  }
                : null
          };
        }
    });
})();