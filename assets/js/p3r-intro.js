// assets/js/p3r-intro.js
// Intro overlay: tampil sekali (first visit) + bisa enter/skip/click/keypress.

(function () {
  const KEY = "p3r_intro_seen_v1";

  const intro = document.getElementById("p3rIntro");
  if (!intro) return;

  const btnEnter = document.getElementById("p3rIntroEnter");
  const btnSkip = document.getElementById("p3rIntroSkip");

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  function show() {
    document.body.classList.add("p3r-lock");
    intro.classList.add("is-on");
    intro.setAttribute("aria-hidden", "false");
  }

  function hide(persist = true) {
    intro.classList.remove("is-on");
    intro.classList.add("is-off");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.remove("p3r-lock");

    if (persist) {
      try { localStorage.setItem(KEY, "1"); } catch {}
    }

    // cleanup listeners
    window.removeEventListener("keydown", onAnyKey, true);
    intro.removeEventListener("click", onClickAnywhere, true);
  }

  function onAnyKey() { hide(true); }
  function onClickAnywhere(e) {
    // kalau klik tombol, biarin handler tombol yang jalan
    if (e.target === btnEnter || e.target === btnSkip) return;
    hide(true);
  }

  // logic: tampil cuma kalau belum pernah
  let seen = false;
  try { seen = localStorage.getItem(KEY) === "1"; } catch {}

  if (!seen) {
    show();

    // auto close setelah ~2.2s (kalau animasi tidak dimatikan)
    if (!prefersReduced) {
      setTimeout(() => hide(true), 2200);
    }

    // user shortcuts
    window.addEventListener("keydown", onAnyKey, true);
    intro.addEventListener("click", onClickAnywhere, true);

    btnEnter?.addEventListener("click", (e) => { e.preventDefault(); hide(true); });
    btnSkip?.addEventListener("click", (e) => { e.preventDefault(); hide(true); });
  } else {
    // pastikan gak mengunci scroll
    intro.classList.add("is-off");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.remove("p3r-lock");
  }
})();