/*
=========================================================
P3R-PROFILE.JS
WEBSITE PROFILE MAGANG PUSDATIN X BOC
UBP KARAWANG
=========================================================

Fungsi utama:
- Membaca ID member dari query URL.
- Mengambil profil member dari Google Apps Script.
- Mengisi halaman profile.html.
- Menampilkan skill, video CV, gallery, dan expertise.
- Menampilkan tombol Alter jika profil memiliki alter.
- Menangani loading, error, not found, copy, dan share.

Contoh URL:

profile.html?id=faisalalrico

Urutan script di profile.html:

1. config.js
2. api.js
3. p3r-profile.js
=========================================================
*/

(function initializeP3RProfile() {
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

    memberId: "",
    member: null,
    alter: null,

    galleryIndex: 0,
    revealObserver: null,

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

    args.unshift("[P3R PROFILE]");

    console.info.apply(
      console,
      args
    );
  }


  function errorLog() {
    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R PROFILE]");

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


  function toNumber(
    value,
    fallback
  ) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return fallback === undefined
        ? 0
        : fallback;
    }

    return number;
  }


  function clampNumber(
    value,
    min,
    max
  ) {
    const minimum =
      min === undefined
        ? 0
        : min;

    const maximum =
      max === undefined
        ? 100
        : max;

    const number =
      toNumber(
        value,
        minimum
      );

    return Math.max(
      minimum,
      Math.min(
        maximum,
        number
      )
    );
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


  function asBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    const normalized =
      asString(value).toLowerCase();

    return [
      "1",
      "true",
      "yes",
      "active",
      "enabled",
      "aktif"
    ].indexOf(normalized) !== -1;
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
  SET ELEMENT
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

    element.textContent =
      normalized ||
      fallback ||
      "—";
  }


  function setElementVisible(
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
    link,
    disabled
  ) {
    if (!link) {
      return;
    }

    if (disabled) {
      link.setAttribute(
        "aria-disabled",
        "true"
      );

      link.style.pointerEvents =
        "none";

      link.style.opacity =
        ".55";
    } else {
      link.removeAttribute(
        "aria-disabled"
      );

      link.style.pointerEvents =
        "";

      link.style.opacity =
        "";
    }
  }


  /*
  =======================================================
  MEMBACA PARAMETER URL
  =======================================================
  */

  function getUrlParameters() {
    return new URLSearchParams(
      window.location.search
    );
  }


  function getMemberIdFromUrl() {
    const parameters =
      getUrlParameters();

    return normalizeEmpty(
      parameters.get("id") ||
      parameters.get("memberId") ||
      parameters.get("member")
    );
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
    if (
      window.P3R_PAGE_URLS &&
      typeof window.P3R_PAGE_URLS.profile ===
        "function"
    ) {
      return window.P3R_PAGE_URLS.profile(
        memberId
      );
    }

    return (
      "./profile.html?id=" +
      encodeURIComponent(
        asString(memberId)
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
  URL ASET DAN GOOGLE DRIVE
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

    const stats =
      isPlainObject(member.stats)
        ? member.stats
        : {};

    const expertise =
      isPlainObject(member.expertise)
        ? member.expertise
        : {};

    const alterPointer =
      isPlainObject(member.alter)
        ? member.alter
        : {};

    return Object.assign(
      {},
      member,
      {
        id:
          normalizeEmpty(member.id),

        profileType:
          normalizeEmpty(
            member.profileType ||
            member.profile_type
          ) || "normal",

        name:
          normalizeEmpty(member.name),

        role:
          normalizeEmpty(member.role),

        division:
          normalizeEmpty(
            member.division
          ),

        divisionKey:
          normalizeEmpty(
            member.divisionKey ||
            member.division_key
          ),

        mainRole:
          normalizeEmpty(
            member.mainRole ||
            member.main_role
          ),

        tagline:
          normalizeEmpty(
            member.tagline
          ),

        bio:
          normalizeEmpty(member.bio),

        photo:
          normalizeEmpty(
            member.photo
          ),

        videoCV:
          normalizeEmpty(
            member.videoCV ||
            member.video_cv
          ),

        status:
          normalizeEmpty(
            member.status
          ),

        joinDate:
          normalizeEmpty(
            member.joinDate ||
            member.join_date
          ),

        signature:
          normalizeEmpty(
            member.signature
          ),

        stats:
          stats,

        skills:
          asArray(member.skills),

        expertise:
          expertise,

        gallery:
          asArray(member.gallery),

        alter:
          {
            enabled:
              asBoolean(
                alterPointer.enabled
              ),

            alterId:
              normalizeEmpty(
                alterPointer.alterId ||
                alterPointer.alter_id ||
                alterPointer.id
              ),

            label:
              normalizeEmpty(
                alterPointer.label
              ) || "ALTER",

            hint:
              normalizeEmpty(
                alterPointer.hint
              )
          }
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

    return Object.assign(
      {},
      alter,
      {
        id:
          normalizeEmpty(alter.id),

        baseId:
          normalizeEmpty(
            alter.baseId ||
            alter.base_id ||
            alter.normalId ||
            alter.normal_id
          ),

        name:
          normalizeEmpty(
            alter.name
          ),

        theme:
          normalizeEmpty(
            alter.theme
          )
      }
    );
  }


  /*
  =======================================================
  DATA PROFILE
  =======================================================
  */

  function getStats(member) {
    return (
      member &&
      isPlainObject(member.stats)
    )
      ? member.stats
      : {};
  }


  function getExpertise(member) {
    const raw =
      member &&
      isPlainObject(
        member.expertise
      )
        ? member.expertise
        : {};

    return {
      playstyle:
        normalizeEmpty(
          raw.playstyle ||
          raw.play_style
        ),

      strength:
        asArray(
          raw.strength ||
          raw.strengths
        ),

      rolePool:
        asArray(
          raw.rolePool ||
          raw.role_pool
        ),

      mains:
        asArray(
          raw.mains ||
          raw.main_tools ||
          raw.tools
        ),

      achievement:
        normalizeEmpty(
          raw.achievement ||
          raw.achievements
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
        "profileSystemStatus"
      );

    if (panel) {
      return panel;
    }

    const main =
      query(".p3r-profile-main");

    if (!main) {
      return null;
    }

    main.insertAdjacentHTML(
      "afterbegin",
      `
        <section
          class="container pt-4"
          id="profileSystemStatus"
          style="display:none"
          aria-live="polite"
        >
          <div class="p3r-panel">
            <div
              class="p3r-panel-title"
              id="profileSystemStatusTitle"
            >
              <span class="p3r-panel-title-dot"></span>
              PROFILE SYSTEM
            </div>

            <div
              class="p3r-muted mt-2"
              id="profileSystemStatusMessage"
            >
              Menyiapkan data profil.
            </div>

            <div
              class="mt-3"
              id="profileSystemStatusActions"
              style="display:none"
            >
              <button
                class="p3r-btn"
                id="profileRetryButton"
                type="button"
              >
                RETRY
              </button>

              <a
                class="p3r-btn p3r-btn-ghost"
                id="profileBackButton"
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
        "profileSystemStatus"
      );

    const retryButton =
      getElement(
        "profileRetryButton"
      );

    if (retryButton) {
      retryButton.addEventListener(
        "click",
        function retryProfile() {
          loadProfile();
        }
      );
    }

    const backButton =
      getElement(
        "profileBackButton"
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

    panel.style.display = "";

    setText(
      "profileSystemStatusTitle",
      title,
      "PROFILE SYSTEM"
    );

    setText(
      "profileSystemStatusMessage",
      message,
      "Memproses data."
    );

    const actions =
      getElement(
        "profileSystemStatusActions"
      );

    if (actions) {
      actions.style.display =
        settings.showActions
          ? ""
          : "none";
    }

    const retryButton =
      getElement(
        "profileRetryButton"
      );

    if (retryButton) {
      retryButton.style.display =
        settings.showRetry
          ? ""
          : "none";
    }
  }


  function hideSystemStatus() {
    const panel =
      getElement(
        "profileSystemStatus"
      );

    if (panel) {
      panel.style.display =
        "none";
    }
  }


  /*
  =======================================================
  LOADING
  =======================================================
  */

  function setLoadingState(loading) {
    state.loading =
      Boolean(loading);

    const profileStage =
      query(".p3r-profile-stage");

    const details =
      query(".p3r-profile-details");

    if (profileStage) {
      profileStage.setAttribute(
        "aria-busy",
        loading
          ? "true"
          : "false"
      );
    }

    if (details) {
      details.setAttribute(
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
      getElement("alterBtn"),
      loading
    );

    if (loading) {
      showSystemStatus(
        "LOADING PLAYER DATA",
        "Mengambil data profil dari Google Spreadsheet.",
        {
          showActions: false,
          showRetry: false
        }
      );

      setText(
        "name",
        "LOADING..."
      );

      setText(
        "bio",
        "Menghubungkan halaman profil dengan database."
      );
    }
  }


  /*
  =======================================================
  COPY LINK
  =======================================================
  */

  async function copyText(
    text
  ) {
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
        const oldText =
          button.textContent;

        button.textContent =
          "COPIED";

        window.setTimeout(
          function restoreButtonText() {
            button.textContent =
              oldText;
          },
          1200
        );
      }
    } catch (error) {
      window.prompt(
        "Salin link profil:",
        window.location.href
      );
    }
  }


  /*
  =======================================================
  SHARE PROFILE
  =======================================================
  */

  async function shareProfile(button) {
    const member =
      state.member;

    const shareData = {
      title:
        member && member.name
          ? "Profil " + member.name
          : "PUSDATIN X BOC Profile",

      text:
        member && member.tagline
          ? member.tagline
          : "Lihat profil anggota PUSDATIN X BOC UBP Karawang.",

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
      setElementVisible(
        panel,
        false
      );

      wrapper.innerHTML =
        "";

      note.textContent =
        "—";

      return;
    }

    setElementVisible(
      panel,
      true
    );

    const youtubeEmbed =
      toYouTubeEmbed(
        source
      );

    if (youtubeEmbed) {
      note.textContent =
        "Video CV melalui YouTube.";

      renderVideoIframe(
        wrapper,
        youtubeEmbed,
        "Video CV"
      );

      return;
    }

    const vimeoEmbed =
      toVimeoEmbed(
        source
      );

    if (vimeoEmbed) {
      note.textContent =
        "Video CV melalui Vimeo.";

      renderVideoIframe(
        wrapper,
        vimeoEmbed,
        "Video CV"
      );

      return;
    }

    const driveFileId =
      getGoogleDriveFileId(
        source
      );

    if (driveFileId) {
      note.textContent =
        "Video CV melalui Google Drive.";

      renderVideoIframe(
        wrapper,
        createGoogleDrivePreviewUrl(
          driveFileId
        ),
        "Video CV Google Drive"
      );

      return;
    }

    const publicUrl =
      toPublicUrl(
        source
      );

    if (!publicUrl) {
      setElementVisible(
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
      "Video CV member.";

    renderDirectVideo(
      wrapper,
      publicUrl,
      "Video CV"
    );
  }


  /*
  =======================================================
  SKILLS
  =======================================================
  */

  function renderSkills(skills) {
    const wrapper =
      getElement("skillsWrap");

    if (!wrapper) {
      return;
    }

    const list =
      asArray(skills)
        .filter(
          function filterSkill(skill) {
            return (
              skill &&
              typeof skill === "object"
            );
          }
        );

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
            const name =
              normalizeEmpty(
                skill.name ||
                skill.label
              ) || "Skill";

            const value =
              clampNumber(
                skill.value ||
                skill.score ||
                skill.level
              );

            return `
              <div class="p3r-skill">
                <div class="p3r-skill-top">
                  <div>
                    ${escapeHTML(name)}
                  </div>

                  <div>
                    ${value}/100
                  </div>
                </div>

                <div class="p3r-bar">
                  <span
                    data-skill-bar="${value}"
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
          "[data-skill-bar]"
        ).forEach(
          function animateBar(bar) {
            const value =
              clampNumber(
                bar.getAttribute(
                  "data-skill-bar"
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
            clampNumber(
              skill.value ||
              skill.score ||
              skill.level
            )
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

  function renderTags(
    containerId,
    items
  ) {
    const element =
      getElement(containerId);

    if (!element) {
      return;
    }

    const normalizedItems =
      asArray(items)
        .map(
          function normalizeItem(item) {
            if (
              item &&
              typeof item === "object"
            ) {
              return normalizeEmpty(
                item.name ||
                item.label ||
                item.title
              );
            }

            return normalizeEmpty(
              item
            );
          }
        )
        .filter(Boolean);

    if (!normalizedItems.length) {
      element.innerHTML =
        '<span class="p3r-tag">NO DATA</span>';

      return;
    }

    element.innerHTML =
      normalizedItems
        .map(
          function createTag(item) {
            return (
              '<span class="p3r-tag">' +
              escapeHTML(item) +
              "</span>"
            );
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
                    toPublicImageUrl(item.src)
                  )}"
                  alt="${escapeHTML(
                    item.caption ||
                    "Gallery member"
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
                data-gallery-dot="${index}"
                aria-label="Buka gambar ${index + 1}"
              ></button>
            `;
          }
        )
        .join("");


    dots
      .querySelectorAll(
        "[data-gallery-dot]"
      )
      .forEach(
        function bindDot(dot) {
          dot.addEventListener(
            "click",
            function selectDot() {
              goToSlide(
                Number(
                  dot.getAttribute(
                    "data-gallery-dot"
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
          state.galleryIndex - 1
        );
      };


    nextButton.onclick =
      function nextSlide() {
        goToSlide(
          state.galleryIndex + 1
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


    previousButton.style.display =
      items.length > 1
        ? ""
        : "none";

    nextButton.style.display =
      items.length > 1
        ? ""
        : "none";

    dots.style.display =
      items.length > 1
        ? ""
        : "none";

    goToSlide(0);
  }


  /*
  =======================================================
  ALTER BUTTON
  =======================================================
  */

  function getAlterId(
    member,
    alter
  ) {
    if (
      alter &&
      alter.id
    ) {
      return alter.id;
    }

    if (
      member &&
      member.alter &&
      member.alter.alterId
    ) {
      return member.alter.alterId;
    }

    return "";
  }


  function memberHasAlter(
    member,
    alter
  ) {
    if (
      alter &&
      alter.id
    ) {
      return true;
    }

    if (
      !member ||
      !member.alter
    ) {
      return false;
    }

    return (
      member.alter.enabled === true ||
      Boolean(
        member.alter.alterId
      )
    );
  }


  function renderAlterButton(
    member,
    alter
  ) {
    const button =
      getElement("alterBtn");

    if (!button) {
      return;
    }

    if (
      !memberHasAlter(
        member,
        alter
      )
    ) {
      button.style.display =
        "none";

      button.removeAttribute(
        "href"
      );

      return;
    }

    const alterId =
      getAlterId(
        member,
        alter
      );

    button.style.display =
      "";

    button.href =
      getAlterUrl(
        member.id,
        alterId
      );

    button.textContent =
      member.alter &&
      member.alter.label
        ? member.alter.label
        : "ALTER";

    button.title =
      "Buka alter profile";
  }


  /*
  =======================================================
  RENDER PROFILE
  =======================================================
  */

  function renderProfile(
    member,
    alter
  ) {
    state.member =
      member;

    state.alter =
      alter;

    window.MEMBER =
      member;

    window.ALTER =
      alter;

    document.title =
      "PUSDATIN X BOC — " +
      (
        member.name ||
        "Profile"
      );


    const photo =
      getElement("photo");

    if (photo) {
      photo.src =
        safePhoto(
          member.photo
        );

      photo.alt =
        "Foto " +
        (
          member.name ||
          "member"
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
      getStats(member);

    const expertise =
      getExpertise(member);


    setText(
      "name",
      member.name
    );

    setText(
      "role",
      member.role
    );

    setText(
      "division",
      member.division
    );

    setText(
      "mainRole",
      member.mainRole
    );

    setText(
      "status",
      member.status
    );

    setText(
      "profileType",
      member.profileType,
      "NORMAL"
    );

    setText(
      "tagline",
      member.tagline
    );

    setText(
      "bio",
      member.bio
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
      member.joinDate
    );

    setText(
      "signature",
      member.signature
    );


    renderAlterButton(
      member,
      alter
    );

    renderSkills(
      member.skills
    );

    renderVideoCV(
      member.videoCV
    );

    renderGallery(
      member.gallery
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

    if (
      memberHasAlter(
        member,
        alter
      )
    ) {
      setLinkDisabled(
        getElement("alterBtn"),
        false
      );
    }


    debugLog(
      "Profil berhasil dirender.",
      {
        memberId:
          member.id,

        memberName:
          member.name,

        alterId:
          alter
            ? alter.id
            : null
      }
    );
  }


  /*
  =======================================================
  NOT FOUND / ERROR
  =======================================================
  */

  function clearOptionalPanels() {
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

    const alterButton =
      getElement(
        "alterBtn"
      );

    if (alterButton) {
      alterButton.style.display =
        "none";
    }
  }


  function renderNotFound(message) {
    clearOptionalPanels();

    setText(
      "name",
      "PLAYER NOT FOUND"
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
      "PROFILE DATA UNAVAILABLE"
    );

    setText(
      "bio",
      message ||
      "Data profil tidak ditemukan."
    );

    const photo =
      getElement("photo");

    if (photo) {
      photo.src =
        PLACEHOLDER_IMG;
    }

    showSystemStatus(
      "PLAYER NOT FOUND",
      message ||
      "ID member tidak ditemukan di database.",
      {
        showActions: true,
        showRetry: false
      }
    );
  }


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
      "MISSING_MEMBER_ID"
    ) {
      return (
        "Parameter ID member tidak ditemukan pada URL."
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
      "MEMBER_NOT_FOUND"
    ) {
      return (
        "Member dengan ID tersebut tidak ditemukan."
      );
    }

    return (
      normalizeEmpty(
        error.message
      ) ||
      "Profil gagal dimuat dari database."
    );
  }


  function renderError(error) {
    state.lastError =
      error;

    const message =
      getFriendlyErrorMessage(
        error
      );

    clearOptionalPanels();

    setText(
      "name",
      "CONNECTION ERROR"
    );

    setText(
      "tagline",
      "PROFILE SYSTEM OFFLINE"
    );

    setText(
      "bio",
      message
    );

    showSystemStatus(
      "PROFILE LOAD FAILED",
      message,
      {
        showActions: true,
        showRetry: true
      }
    );
  }


  /*
  =======================================================
  REVEAL
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
    const backButton =
      getElement("backBtn");

    if (backButton) {
      backButton.href =
        getHomeUrl();
    }


    const copyButton =
      getElement("copyLinkBtn");

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
      getElement("shareBtn");

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

          shareProfile(
            shareButton
          );
        }
      );
    }
  }


  /*
  =======================================================
  LOAD PROFILE
  =======================================================
  */

  async function loadProfile() {
    if (state.loading) {
      return;
    }

    state.memberId =
      getMemberIdFromUrl();

    if (!state.memberId) {
      const missingIdError =
        new Error(
          "Parameter ID member tidak tersedia."
        );

      missingIdError.code =
        "MISSING_MEMBER_ID";

      state.loaded =
        false;

      renderNotFound(
        "URL profil harus memiliki parameter seperti profile.html?id=faisalalrico."
      );

      return;
    }

    setLoadingState(true);

    try {
      if (
        !window.P3R_API ||
        typeof window.P3R_API.getMember !==
          "function"
      ) {
        throw new Error(
          "P3R_API belum tersedia. Pastikan config.js dan api.js dimuat sebelum p3r-profile.js."
        );
      }

      const response =
        await window.P3R_API.getMember(
          state.memberId
        );

      const member =
        normalizeMember(
          response &&
          response.member
        );

      const alter =
        normalizeAlter(
          response &&
          response.alter
        );

      if (!member) {
        state.loaded =
          false;

        renderNotFound(
          "Member dengan ID " +
          state.memberId +
          " tidak ditemukan."
        );

        return;
      }

      state.loaded =
        true;

      state.lastError =
        null;

      renderProfile(
        member,
        alter
      );

      window.dispatchEvent(
        new CustomEvent(
          "p3r:profile-rendered",
          {
            detail: {
              member:
                member,

              alter:
                alter
            }
          }
        )
      );
    } catch (error) {
      state.loaded =
        false;

      errorLog(
        "Gagal memuat profil.",
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

  function initProfile() {
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
    loadProfile();
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initProfile,
      {
        once: true
      }
    );
  } else {
    initProfile();
  }


  /*
  =======================================================
  PUBLIC API
  =======================================================
  */

  window.P3R_PROFILE =
    Object.freeze({
      reload:
        loadProfile,

      getState:
        function getProfileState() {
          return {
            initialized:
              state.initialized,

            loading:
              state.loading,

            loaded:
              state.loaded,

            memberId:
              state.memberId,

            member:
              state.member,

            alter:
              state.alter,

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
        },

      getProfileUrl:
        getProfileUrl,

      getAlterUrl:
        getAlterUrl
    });
})();