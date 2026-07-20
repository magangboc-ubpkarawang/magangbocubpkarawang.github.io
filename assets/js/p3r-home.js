/*
=========================================================
P3R-HOME.JS
WEBSITE PROFILE MAGANG PUSDATIN X BOC
UBP KARAWANG
=========================================================

Fungsi file:
- Menunggu data dari Google Apps Script.
- Mengisi halaman Home dari window.MEMBERS.
- Menampilkan MVP dan top performers.
- Menampilkan pemilih divisi.
- Menampilkan daftar seluruh member.
- Menjalankan filter nama, jabatan, dan divisi.
- Menangani loading, error, cache, dan retry.

Urutan script wajib di index.html:

1. config.js
2. api.js
3. p3r-intro.js
4. p3r-home.js
=========================================================
*/

(function initializeP3RHome() {
  "use strict";


  /*
  =======================================================
  STATE
  =======================================================
  */

  const state = {
    initialized: false,
    loading: false,
    dataLoaded: false,

    activeDivision: "all",

    revealObserver: null,

    searchListenerReady: false,
    roleListenerReady: false,

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

  function $(selector) {
    return document.querySelector(selector);
  }


  function $all(selector) {
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

    args.unshift("[P3R HOME]");

    console.info.apply(
      console,
      args
    );
  }


  function errorLog() {
    const args =
      Array.prototype.slice.call(arguments);

    args.unshift("[P3R HOME]");

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

  function asString(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value).trim();
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


  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function escapeHTML(value) {
    return String(
      value === null ||
      value === undefined
        ? "—"
        : value
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function setText(
    selector,
    value
  ) {
    const element =
      $(selector);

    if (!element) {
      return;
    }

    const normalized =
      value === null ||
      value === undefined ||
      String(value).trim() === ""
        ? "—"
        : String(value);

    element.textContent =
      normalized;
  }


  function setDisabled(
    selector,
    disabled
  ) {
    const element =
      $(selector);

    if (!element) {
      return;
    }

    element.disabled =
      Boolean(disabled);
  }


  /*
  =======================================================
  URL HALAMAN
  =======================================================
  */

  function profileUrl(memberId) {
    const normalizedId =
      asString(memberId);

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


  /*
  =======================================================
  URL ASET
  =======================================================
  */

  function toPublicUrl(source) {
    const src =
      asString(source);

    if (!src) {
      return PLACEHOLDER_IMG;
    }

    if (
      src.startsWith("https://") ||
      src.startsWith("http://") ||
      src.startsWith("data:") ||
      src.startsWith("blob:")
    ) {
      return src;
    }

    if (
      CONFIG &&
      typeof CONFIG.resolveSiteUrl ===
        "function"
    ) {
      return CONFIG.resolveSiteUrl(
        src.replace(/^\/+/, "")
      );
    }

    return (
      "./" +
      src.replace(/^\/+/, "")
    );
  }


  function safePhoto(source) {
    return toPublicUrl(source);
  }


  function imageHTML(
    source,
    alt,
    className,
    extraAttributes
  ) {
    const imageSource =
      safePhoto(source);

    const normalizedClass =
      asString(className);

    const extra =
      asString(extraAttributes);

    return `
      <img
        class="${escapeHTML(normalizedClass)}"
        src="${escapeHTML(imageSource)}"
        alt="${escapeHTML(alt || "Foto member")}"
        loading="lazy"
        decoding="async"
        onerror="this.onerror=null;this.src='${escapeHTML(
          PLACEHOLDER_IMG
        )}';"
        ${extra}
      >
    `;
  }


  /*
  =======================================================
  DATA GLOBAL
  =======================================================
  */

  function getMembers() {
    return Array.isArray(
      window.MEMBERS
    )
      ? window.MEMBERS
      : [];
  }


  function getAlters() {
    return Array.isArray(
      window.ALTERS
    )
      ? window.ALTERS
      : [];
  }


  function getRawDivisions() {
    return Array.isArray(
      window.DIVISIONS
    )
      ? window.DIVISIONS
      : [];
  }


  /*
  =======================================================
  NORMALISASI DATA
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
    return (
      member &&
      isPlainObject(
        member.expertise
      )
    )
      ? member.expertise
      : {};
  }


  function getWinrate(member) {
    const stats =
      getStats(member);

    return toNumber(
      stats.winrate,
      0
    );
  }


  function getLevel(member) {
    const stats =
      getStats(member);

    return toNumber(
      stats.level,
      0
    );
  }


  function getDivisionKey(member) {
    return asString(
      member &&
      (
        member.divisionKey ||
        member.division_key ||
        member.division_slug ||
        member.division
      )
    )
      .toLowerCase()
      .replace(/\s+/g, "_");
  }


  function normalizeDivisionCss(
    key,
    css
  ) {
    const explicitCss =
      asString(css);

    if (explicitCss) {
      return explicitCss;
    }

    const normalizedKey =
      asString(key)
        .toLowerCase();

    if (
      normalizedKey.includes("core") ||
      normalizedKey.includes("pusdatin")
    ) {
      return "p3r-div-core";
    }

    if (
      normalizedKey.includes("flex") ||
      normalizedKey.includes("boc")
    ) {
      return "p3r-div-flex";
    }

    if (
      normalizedKey.includes("ops") ||
      normalizedKey.includes("marketing")
    ) {
      return "p3r-div-ops";
    }

    if (
      normalizedKey.includes("inf") ||
      normalizedKey.includes("library")
    ) {
      return "p3r-div-inf";
    }

    return "p3r-div-core";
  }


  function getDivisions() {
    const rawDivisions =
      getRawDivisions();

    const normalized =
      rawDivisions
        .filter(Boolean)
        .map(function normalizeDivision(
          division
        ) {
          const key =
            asString(
              division.key ||
              division.division_key ||
              division.slug ||
              division.name ||
              "division"
            )
              .toLowerCase()
              .replace(/\s+/g, "_");

          return {
            key: key,

            name:
              asString(
                division.name ||
                division.division ||
                key
              ) || key,

            sub:
              asString(
                division.sub ||
                division.description ||
                "Division filter"
              ) ||
              "Division filter",

            css:
              normalizeDivisionCss(
                key,
                division.css
              ),

            sortOrder:
              toNumber(
                division.sortOrder ||
                division.sort_order,
                0
              )
          };
        })
        .sort(function sortDivisions(
          first,
          second
        ) {
          if (
            first.sortOrder !==
            second.sortOrder
          ) {
            return (
              first.sortOrder -
              second.sortOrder
            );
          }

          return first.name.localeCompare(
            second.name
          );
        });

    const hasAll =
      normalized.some(
        function checkAll(division) {
          return division.key === "all";
        }
      );

    if (!hasAll) {
      normalized.unshift({
        key: "all",
        name: "ALL MEMBERS",
        sub: "Tampilkan semua data",
        css: "p3r-div-core",
        sortOrder: -1
      });
    }

    return normalized;
  }


  function uniqueRoles(members) {
    const roles =
      members
        .map(function getRole(member) {
          return asString(
            member && member.role
          );
        })
        .filter(Boolean);

    return Array.from(
      new Set(roles)
    ).sort(function sortRoles(
      first,
      second
    ) {
      return first.localeCompare(
        second,
        "id"
      );
    });
  }


  function divisionBadge(member) {
    const key =
      getDivisionKey(member);

    const label =
      asString(
        member && member.division
      ) || "DIVISION";

    return `
      <span
        class="p3r-div-badge ${escapeHTML(
          normalizeDivisionCss(
            key,
            ""
          )
        )}"
      >
        ${escapeHTML(label)}
      </span>
    `;
  }


  /*
  =======================================================
  DEKORASI
  =======================================================
  */

  function injectP3RDecor() {
    document.body.classList.add(
      "p3r"
    );

    const hero =
      $(".p3r-hero");

    if (!hero) {
      return;
    }

    if (
      !document.querySelector(
        ".p3r-corner-hud"
      )
    ) {
      hero.insertAdjacentHTML(
        "beforeend",
        `
          <div
            class="p3r-corner-hud"
            aria-hidden="true"
          >
            <div class="p3r-hud-face"></div>
            <div class="p3r-hud-face"></div>
            <div class="p3r-hud-face"></div>
          </div>
        `
      );
    }

    if (
      !document.querySelector(
        ".p3r-command-hud"
      )
    ) {
      hero.insertAdjacentHTML(
        "beforeend",
        `
          <div
            class="p3r-command-hud"
            aria-hidden="true"
          >
            <div class="cmd-title">
              Open Profile
            </div>

            <div class="cmd-sub">
              Command
            </div>

            <div class="cmd-buttons">
              <span>
                <span class="cmd-key">A</span>
                Confirm
              </span>

              <span>
                <span class="cmd-key">B</span>
                Back
              </span>
            </div>
          </div>
        `
      );
    }
  }


  /*
  =======================================================
  STATUS DATA
  =======================================================
  */

  function ensureDataStatusPanel() {
    let panel =
      $("#p3rDataStatus");

    if (panel) {
      return panel;
    }

    const main =
      $(".p3r-main");

    if (!main) {
      return null;
    }

    main.insertAdjacentHTML(
      "afterbegin",
      `
        <section
          id="p3rDataStatus"
          class="p3r-section"
          style="display:none;padding-bottom:0"
          aria-live="polite"
        >
          <div class="container">
            <div class="p3r-panel">
              <div
                class="p3r-panel-title"
                id="p3rDataStatusTitle"
              >
                <span class="p3r-panel-title-dot"></span>
                SYSTEM STATUS
              </div>

              <div
                class="p3r-muted mt-2"
                id="p3rDataStatusMessage"
              >
                Menyiapkan database.
              </div>

              <div
                class="mt-3"
                id="p3rDataStatusActions"
                style="display:none"
              >
                <button
                  class="p3r-btn"
                  id="p3rRetryButton"
                  type="button"
                >
                  RETRY CONNECTION
                </button>
              </div>
            </div>
          </div>
        </section>
      `
    );

    panel =
      $("#p3rDataStatus");

    const retryButton =
      $("#p3rRetryButton");

    if (
      retryButton &&
      retryButton.dataset.listenerReady !==
        "1"
    ) {
      retryButton.dataset.listenerReady =
        "1";

      retryButton.addEventListener(
        "click",
        function retryConnection() {
          loadAndRenderHome({
            forceRefresh: true
          });
        }
      );
    }

    return panel;
  }


  function showDataStatus(
    title,
    message,
    options
  ) {
    const settings =
      options || {};

    const panel =
      ensureDataStatusPanel();

    if (!panel) {
      return;
    }

    panel.style.display = "";

    setText(
      "#p3rDataStatusTitle",
      title || "SYSTEM STATUS"
    );

    setText(
      "#p3rDataStatusMessage",
      message || "Memproses data."
    );

    const actions =
      $("#p3rDataStatusActions");

    if (actions) {
      actions.style.display =
        settings.showRetry === true
          ? ""
          : "none";
    }
  }


  function hideDataStatus() {
    const panel =
      $("#p3rDataStatus");

    if (!panel) {
      return;
    }

    panel.style.display =
      "none";
  }


  /*
  =======================================================
  LOADING STATE
  =======================================================
  */

  function setLoadingState(loading) {
    state.loading =
      Boolean(loading);

    setDisabled(
      "#searchInput",
      loading
    );

    setDisabled(
      "#roleFilter",
      loading
    );

    const grid =
      $("#memberGrid");

    if (
      loading &&
      grid
    ) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="p3r-panel text-center">
            <div
              class="p3r-panel-title justify-content-center"
            >
              <span class="p3r-panel-title-dot"></span>
              LOADING DATABASE
            </div>

            <div class="p3r-muted mt-2">
              Mengambil data anggota dari Google Spreadsheet.
            </div>
          </div>
        </div>
      `;
    }

    if (loading) {
      setText(
        "#countLabel",
        "0"
      );

      showDataStatus(
        "CONNECTING DATABASE",
        "Menghubungkan GitHub Pages dengan Google Apps Script.",
        {
          showRetry: false
        }
      );
    }
  }


  /*
  =======================================================
  MVP
  =======================================================
  */

  function sortMembersByPerformance(
    members
  ) {
    return members
      .slice()
      .sort(
        function sortPerformance(
          first,
          second
        ) {
          const winrateDifference =
            getWinrate(second) -
            getWinrate(first);

          if (
            winrateDifference !== 0
          ) {
            return winrateDifference;
          }

          const levelDifference =
            getLevel(second) -
            getLevel(first);

          if (
            levelDifference !== 0
          ) {
            return levelDifference;
          }

          return asString(
            first && first.name
          ).localeCompare(
            asString(
              second && second.name
            ),
            "id"
          );
        }
      );
  }


  function clearMVP() {
    setText(
      "#mvpName",
      "Belum ada data"
    );

    setText("#mvpRole", "—");
    setText("#mvpDivision", "—");
    setText("#mvpTagline", "—");
    setText("#mvpRank", "—");
    setText("#mvpWr", "—");
    setText("#mvpLvl", "—");
    setText("#mvpStatus", "—");

    setText(
      "#mvpReason",
      "Data member belum tersedia."
    );

    const photo =
      $("#mvpPhoto");

    if (photo) {
      photo.src =
        PLACEHOLDER_IMG;
    }

    const link =
      $("#mvpLink");

    if (link) {
      link.href =
        "#roster";

      link.setAttribute(
        "aria-disabled",
        "true"
      );
    }

    const runnerUps =
      $("#mvpRunnerUps");

    if (runnerUps) {
      runnerUps.innerHTML = "";
    }

    const topList =
      $("#topList");

    if (topList) {
      topList.innerHTML = `
        <div class="p3r-muted">
          Belum ada data performer.
        </div>
      `;
    }
  }


  function renderMVP() {
    const members =
      getMembers();

    if (!members.length) {
      clearMVP();
      return;
    }

    const sorted =
      sortMembersByPerformance(
        members
      );

    const mvp =
      sorted[0];

    const second =
      sorted[1];

    const third =
      sorted[2];

    if (!mvp) {
      clearMVP();
      return;
    }

    const mvpStats =
      getStats(mvp);

    const expertise =
      getExpertise(mvp);

    const mvpPhoto =
      $("#mvpPhoto");

    if (mvpPhoto) {
      mvpPhoto.src =
        safePhoto(mvp.photo);

      mvpPhoto.alt =
        "Foto " +
        (
          asString(mvp.name) ||
          "MVP"
        );

      mvpPhoto.onerror =
        function handleMvpImageError() {
          mvpPhoto.onerror =
            null;

          mvpPhoto.src =
            PLACEHOLDER_IMG;
        };
    }

    setText(
      "#mvpName",
      mvp.name
    );

    setText(
      "#mvpRole",
      mvp.role
    );

    setText(
      "#mvpDivision",
      mvp.division
    );

    setText(
      "#mvpTagline",
      mvp.tagline
    );

    setText(
      "#mvpRank",
      mvpStats.rank
    );

    setText(
      "#mvpWr",
      mvpStats.winrate
    );

    setText(
      "#mvpLvl",
      mvpStats.level
    );

    setText(
      "#mvpStatus",
      mvp.status
    );

    const reason =
      asString(
        expertise.achievement
      ) ||
      asString(mvp.tagline) ||
      "Member dengan success rate tertinggi.";

    setText(
      "#mvpReason",
      reason
    );

    const mvpLink =
      $("#mvpLink");

    if (mvpLink) {
      mvpLink.href =
        profileUrl(mvp.id);

      mvpLink.removeAttribute(
        "aria-disabled"
      );
    }

    renderRunnerUps([
      second,
      third
    ]);

    renderTopPerformers(
      sorted.slice(0, 5)
    );
  }


  function renderRunnerUps(list) {
    const wrapper =
      $("#mvpRunnerUps");

    if (!wrapper) {
      return;
    }

    const cards =
      list
        .filter(Boolean)
        .map(
          function createRunnerUp(
            member,
            index
          ) {
            const rank =
              index === 0
                ? 2
                : 3;

            const stats =
              getStats(member);

            return `
              <a
                class="p3r-mvp-mini"
                href="${escapeHTML(
                  profileUrl(member.id)
                )}"
              >
                <div
                  class="p3r-mvp-mini-rank rank-${rank}"
                >
                  #${rank}
                </div>

                ${imageHTML(
                  member.photo,
                  "Foto " +
                    asString(member.name),
                  "p3r-mvp-mini-img"
                )}

                <div class="flex-grow-1">
                  <div class="p3r-mvp-mini-name">
                    ${escapeHTML(
                      member.name
                    )}
                  </div>

                  <div class="p3r-mvp-mini-sub">
                    ${escapeHTML(
                      member.role
                    )}
                    •
                    ${escapeHTML(
                      member.division
                    )}
                  </div>
                </div>

                <div class="p3r-mvp-mini-chip">
                  SR
                  <b>
                    ${escapeHTML(
                      stats.winrate
                    )}%
                  </b>
                </div>
              </a>
            `;
          }
        );

    wrapper.innerHTML =
      cards.length
        ? `
          <div class="p3r-mvp-ups">
            ${cards.join("")}
          </div>
        `
        : "";
  }


  function renderTopPerformers(
    topMembers
  ) {
    const topList =
      $("#topList");

    if (!topList) {
      return;
    }

    if (!topMembers.length) {
      topList.innerHTML = `
        <div class="p3r-muted">
          Belum ada data performer.
        </div>
      `;

      return;
    }

    topList.innerHTML =
      topMembers
        .map(
          function createTopPerformer(
            member,
            index
          ) {
            const stats =
              getStats(member);

            return `
              <a
                class="p3r-panel"
                style="
                  text-decoration:none;
                  color:inherit;
                  padding:14px 16px
                "
                href="${escapeHTML(
                  profileUrl(member.id)
                )}"
              >
                <div
                  class="d-flex align-items-center gap-2"
                >
                  <div
                    class="p3r-chip"
                    style="
                      min-width:58px;
                      text-align:center
                    "
                  >
                    #${index + 1}
                  </div>

                  ${imageHTML(
                    member.photo,
                    "Foto " +
                      asString(member.name),
                    "",
                    `
                      style="
                        width:48px;
                        height:48px;
                        object-fit:cover;
                        border:3px solid rgba(255,255,255,.35);
                        transform:skewX(-8deg)
                      "
                    `
                  )}

                  <div class="flex-grow-1">
                    <div
                      style="
                        font-family:var(--font-head);
                        font-weight:1000;
                        letter-spacing:1px;
                        font-size:1.2rem;
                        line-height:.95;
                        text-transform:uppercase
                      "
                    >
                      ${escapeHTML(
                        member.name
                      )}
                    </div>

                    <div class="p3r-muted small">
                      ${escapeHTML(
                        member.role
                      )}
                      •
                      ${escapeHTML(
                        member.division
                      )}
                      •
                      SR
                      ${escapeHTML(
                        stats.winrate
                      )}%
                    </div>
                  </div>
                </div>
              </a>
            `;
          }
        )
        .join("");
  }


  /*
  =======================================================
  DIVISION SWITCH
  =======================================================
  */

  function renderDivisionSwitch() {
    const wrapper =
      $("#divisionSwitch");

    if (!wrapper) {
      return;
    }

    const divisions =
      getDivisions();

    const activeExists =
      divisions.some(
        function checkActive(
          division
        ) {
          return (
            division.key ===
            state.activeDivision
          );
        }
      );

    if (!activeExists) {
      state.activeDivision =
        "all";
    }

    wrapper.innerHTML =
      divisions
        .map(
          function createDivisionButton(
            division
          ) {
            const key =
              asString(
                division.key
              ) || "all";

            const activeClass =
              key ===
              state.activeDivision
                ? "is-active"
                : "";

            return `
              <button
                class="
                  p3r-div-btn
                  ${escapeHTML(
                    division.css
                  )}
                  ${activeClass}
                "
                data-div="${escapeHTML(
                  key
                )}"
                type="button"
                aria-pressed="${
                  key ===
                  state.activeDivision
                    ? "true"
                    : "false"
                }"
              >
                <span
                  class="p3r-div-accent"
                ></span>

                <div>
                  <div class="p3r-div-name">
                    ${escapeHTML(
                      division.name
                    )}
                  </div>

                  <div class="p3r-div-sub">
                    ${escapeHTML(
                      division.sub
                    )}
                  </div>
                </div>
              </button>
            `;
          }
        )
        .join("");

    wrapper
      .querySelectorAll(
        "[data-div]"
      )
      .forEach(
        function bindDivisionButton(
          button
        ) {
          button.addEventListener(
            "click",
            function selectDivision() {
              state.activeDivision =
                button.getAttribute(
                  "data-div"
                ) || "all";

              renderDivisionSwitch();

              applyRosterFilters();
            }
          );
        }
      );
  }


  /*
  =======================================================
  MEMBER CARD
  =======================================================
  */

  function memberCard(member) {
    const stats =
      getStats(member);

    const memberName =
      asString(member.name) ||
      "Tanpa Nama";

    return `
      <div
        class="
          col-12
          col-md-6
          col-xl-4
          p3r-reveal
        "
      >
        <div class="p3r-card">
          <div class="p3r-card-body">

            <a
              class="p3r-btn p3r-status-open"
              href="${escapeHTML(
                profileUrl(member.id)
              )}"
              aria-label="Buka profil ${escapeHTML(
                memberName
              )}"
            >
              OPEN
            </a>

            <div class="p3r-status-card-main">
              <div>
                ${imageHTML(
                  member.photo,
                  "Foto " +
                    memberName,
                  "p3r-avatar"
                )}
              </div>

              <div class="min-w-0">
                <div class="p3r-status-name">
                  ${escapeHTML(
                    memberName
                  )}
                </div>

                <div
                  class="
                    d-flex
                    flex-wrap
                    gap-2
                    align-items-center
                    mt-2
                  "
                >
                  <div class="p3r-role">
                    ${escapeHTML(
                      member.role
                    )}
                  </div>

                  ${divisionBadge(
                    member
                  )}
                </div>

                <div class="p3r-status-tagline">
                  ${escapeHTML(
                    member.tagline
                  )}
                </div>

                <div class="p3r-status-stats">
                  <div class="p3r-chip">
                    Rank:
                    <b>
                      ${escapeHTML(
                        stats.rank
                      )}
                    </b>
                  </div>

                  <div class="p3r-chip">
                    SR:
                    <b>
                      ${escapeHTML(
                        stats.winrate
                      )}%
                    </b>
                  </div>

                  <div class="p3r-chip">
                    Lv:
                    <b>
                      ${escapeHTML(
                        stats.level
                      )}
                    </b>
                  </div>

                  <div class="p3r-chip">
                    Status:
                    <b>
                      ${escapeHTML(
                        member.status
                      )}
                    </b>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }


  /*
  =======================================================
  REVEAL ANIMATION
  =======================================================
  */

  function initRevealObserver() {
    const nodes =
      document.querySelectorAll(
        ".p3r-reveal:not(.is-ready)"
      );

    if (
      !(
        "IntersectionObserver" in
        window
      )
    ) {
      nodes.forEach(
        function showImmediately(
          node
        ) {
          node.classList.add(
            "is-ready",
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
        node.classList.add(
          "is-ready"
        );

        state.revealObserver.observe(
          node
        );
      }
    );
  }


  /*
  =======================================================
  ROLE FILTER
  =======================================================
  */

  function populateRoleFilter() {
    const roleFilter =
      $("#roleFilter");

    if (!roleFilter) {
      return;
    }

    const selectedBefore =
      roleFilter.value || "all";

    const roles =
      uniqueRoles(
        getMembers()
      );

    roleFilter.innerHTML = `
      <option value="all">
        Semua Jabatan
      </option>

      ${roles
        .map(
          function createRoleOption(
            role
          ) {
            return `
              <option
                value="${escapeHTML(
                  role
                )}"
              >
                ${escapeHTML(
                  role
                )}
              </option>
            `;
          }
        )
        .join("")}
    `;

    const selectedExists =
      Array.from(
        roleFilter.options
      ).some(
        function checkOption(
          option
        ) {
          return (
            option.value ===
            selectedBefore
          );
        }
      );

    roleFilter.value =
      selectedExists
        ? selectedBefore
        : "all";
  }


  /*
  =======================================================
  ROSTER FILTER
  =======================================================
  */

  function applyRosterFilters() {
    const members =
      getMembers();

    const roleFilter =
      $("#roleFilter");

    const grid =
      $("#memberGrid");

    const countLabel =
      $("#countLabel");

    const searchInput =
      $("#searchInput");

    if (
      !roleFilter ||
      !grid ||
      !countLabel ||
      !searchInput
    ) {
      return;
    }

    const query =
      asString(
        searchInput.value
      ).toLowerCase();

    const selectedRole =
      asString(
        roleFilter.value
      ) || "all";

    const filtered =
      members.filter(
        function filterMember(
          member
        ) {
          const searchable =
            [
              member.name,
              member.role,
              member.division,
              member.divisionKey,
              member.division_key,
              member.mainRole,
              member.main_role,
              member.tagline,
              member.status,
              member.signature
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesRole =
            selectedRole === "all" ||
            asString(
              member.role
            ) === selectedRole;

          const matchesDivision =
            state.activeDivision ===
              "all" ||
            getDivisionKey(
              member
            ) ===
              state.activeDivision;

          return (
            matchesSearch &&
            matchesRole &&
            matchesDivision
          );
        }
      );

    grid.innerHTML =
      filtered.length
        ? filtered
            .map(memberCard)
            .join("")
        : `
          <div class="col-12">
            <div class="p3r-panel text-center">
              <div
                class="
                  p3r-panel-title
                  justify-content-center
                "
              >
                <span
                  class="p3r-panel-title-dot"
                ></span>

                DATA NOT FOUND
              </div>

              <div class="p3r-muted mt-2">
                Tidak ada member yang cocok dengan filter saat ini.
              </div>

              <button
                class="p3r-btn p3r-btn-ghost mt-3"
                id="resetRosterFilter"
                type="button"
              >
                RESET FILTER
              </button>
            </div>
          </div>
        `;

    countLabel.textContent =
      String(filtered.length);

    const resetButton =
      $("#resetRosterFilter");

    if (resetButton) {
      resetButton.addEventListener(
        "click",
        function resetFilters() {
          searchInput.value = "";
          roleFilter.value = "all";

          state.activeDivision =
            "all";

          renderDivisionSwitch();
          applyRosterFilters();
        }
      );
    }

    initRevealObserver();
  }


  function setupRosterListeners() {
    const searchInput =
      $("#searchInput");

    const roleFilter =
      $("#roleFilter");

    if (
      searchInput &&
      !state.searchListenerReady
    ) {
      state.searchListenerReady =
        true;

      searchInput.addEventListener(
        "input",
        applyRosterFilters
      );
    }

    if (
      roleFilter &&
      !state.roleListenerReady
    ) {
      state.roleListenerReady =
        true;

      roleFilter.addEventListener(
        "change",
        applyRosterFilters
      );
    }

    window.__applyRosterFilters =
      applyRosterFilters;
  }


  function renderRoster() {
    populateRoleFilter();
    setupRosterListeners();
    applyRosterFilters();
  }


  /*
  =======================================================
  ERROR RENDER
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
      "REQUEST_TIMEOUT"
    ) {
      return (
        "Koneksi ke database melewati batas waktu. Tekan retry untuk mencoba kembali."
      );
    }

    if (
      error.code ===
      "NETWORK_ERROR"
    ) {
      return (
        "Browser tidak dapat terhubung ke Google Apps Script. Periksa internet dan status deployment API."
      );
    }

    if (
      error.code ===
      "INVALID_JSON_RESPONSE"
    ) {
      return (
        "Server mengembalikan data yang tidak dapat dibaca sebagai JSON."
      );
    }

    return (
      asString(error.message) ||
      "Data gagal dimuat dari server."
    );
  }


  function renderLoadError(error) {
    state.lastError =
      error;

    const message =
      getFriendlyErrorMessage(
        error
      );

    showDataStatus(
      "DATABASE CONNECTION FAILED",
      message,
      {
        showRetry: true
      }
    );

    clearMVP();

    const grid =
      $("#memberGrid");

    if (grid) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="p3r-panel text-center">
            <div
              class="
                p3r-panel-title
                justify-content-center
              "
            >
              <span
                class="p3r-panel-title-dot"
              ></span>

              DATA UNAVAILABLE
            </div>

            <div class="p3r-muted mt-2">
              ${escapeHTML(message)}
            </div>

            <button
              class="p3r-btn mt-3"
              id="memberGridRetryButton"
              type="button"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      `;

      const retryButton =
        $("#memberGridRetryButton");

      if (retryButton) {
        retryButton.addEventListener(
          "click",
          function retryFromGrid() {
            loadAndRenderHome({
              forceRefresh: true
            });
          }
        );
      }
    }

    setText(
      "#countLabel",
      "0"
    );
  }


  /*
  =======================================================
  RENDER SEMUA
  =======================================================
  */

  function renderHomeData() {
    renderMVP();
    renderDivisionSwitch();
    renderRoster();
    initRevealObserver();

    const summary =
      window.P3R_HOME_SUMMARY;

    debugLog(
      "Halaman berhasil dirender.",
      {
        members:
          getMembers().length,

        alters:
          getAlters().length,

        divisions:
          getRawDivisions().length,

        summary:
          summary || null
      }
    );
  }


  /*
  =======================================================
  LOAD API
  =======================================================
  */

  async function loadAndRenderHome(
    options
  ) {
    if (state.loading) {
      return;
    }

    const settings =
      options || {};

    setLoadingState(true);

    try {
      if (
        !window.P3R_API ||
        typeof window.P3R_API.loadHomeGlobals !==
          "function"
      ) {
        throw new Error(
          "P3R_API belum tersedia. Pastikan config.js dan api.js dimuat sebelum p3r-home.js."
        );
      }

      const homeData =
        await window.P3R_API.loadHomeGlobals({
          forceRefresh:
            settings.forceRefresh ===
            true
        });

      if (
        !homeData ||
        !Array.isArray(
          homeData.members
        )
      ) {
        throw new Error(
          "Format data Home dari API tidak valid."
        );
      }

      state.dataLoaded =
        true;

      state.lastError =
        null;

      renderHomeData();

      hideDataStatus();

      setDisabled(
        "#searchInput",
        false
      );

      setDisabled(
        "#roleFilter",
        false
      );

      window.dispatchEvent(
        new CustomEvent(
          "p3r:home-rendered",
          {
            detail: {
              members:
                getMembers().length,

              alters:
                getAlters().length,

              divisions:
                getRawDivisions().length
            }
          }
        )
      );
    } catch (error) {
      state.dataLoaded =
        false;

      errorLog(
        "Gagal memuat halaman.",
        error
      );

      renderLoadError(
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

  function initHome() {
    if (state.initialized) {
      return;
    }

    state.initialized =
      true;

    injectP3RDecor();
    ensureDataStatusPanel();

    const year =
      $("#year");

    if (year) {
      year.textContent =
        String(
          new Date().getFullYear()
        );
    }

    setupRosterListeners();
    initRevealObserver();

    loadAndRenderHome();
  }


  /*
  =======================================================
  DOM READY
  =======================================================
  */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initHome,
      {
        once: true
      }
    );
  } else {
    initHome();
  }


  /*
  =======================================================
  PUBLIC DEBUG API
  =======================================================
  */

  window.P3R_HOME =
    Object.freeze({
      reload:
        function reloadHome() {
          return loadAndRenderHome({
            forceRefresh: true
          });
        },

      render:
        renderHomeData,

      applyFilters:
        applyRosterFilters,

      getState:
        function getHomeState() {
          return {
            initialized:
              state.initialized,

            loading:
              state.loading,

            dataLoaded:
              state.dataLoaded,

            activeDivision:
              state.activeDivision,

            members:
              getMembers().length,

            alters:
              getAlters().length,

            divisions:
              getRawDivisions().length,

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