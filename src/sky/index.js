// Connects the sky to the page: the opening, scrolling, and the climb between
// home and a post. It only relies on these hooks in the templates:
//   #home, #post-view     the two views
//   #sky, #sky-fixed      the canvases
//   [data-nav]            links that should animate instead of loading a new page
//   [data-in], [data-out] elements that fade with the opening and the climb
//   [data-row]            an entry in the writing list
import { SETTINGS as C } from "./settings.js";
import { createSky, resizeSky, drawSky } from "./renderer.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const root = document.documentElement;
const main = $("#main"), brand = $("#brand"), nav = $("#top nav"), header = $("#top");
const skyScrim = $("#sky-scrim"), scrim = $("#scrim"), readingScrim = $("#pscrim"), probe = $("#probe"), fixedCanvas = $("#sky-fixed");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = getComputedStyle(root).getPropertyValue("--ink-dark").trim();

let view = root.dataset.view, home = $("#home"), post = $("#post-view");
let tall = null, fixed = null, homeTitle = view === "home" ? document.title : "";
let greeting, ground, inEls = [], outEls = [], rows = [], postEls = [];
let enhanced = false, usingFixed = false, fullPaintDue = true, settledAt = 0, slice = 0, usedKeyboard = false, savedScroll = 0, postPath = location.pathname;

const S = { t: 0, o: view === "home" ? 0 : 1, n: view === "home" ? 0 : 1, target: view === "home" ? 0 : 1, scroll: window.scrollY, clicked: -1, vw: 0, vh: 0, phone: false, aspect: 1, H0: 0.3, K0: 0.72, skyHeight: 0, groundTop: 0, scaleTall: 1, scaleFixed: 1, D1: 9 };
const force = { t: null, n: null }, stats = { fullPaints: 0, slices: 0 };
if (new URLSearchParams(location.search).has("qa")) window.__sky = { S, force, stats };

function bindHome() {
  greeting = $(".hw", home); ground = $(".ground", home);
  inEls = $$("[data-in]", home); outEls = $$("[data-out]", home); rows = $$("[data-row]", home);
  for (const k in lastWritten) delete lastWritten[k];
}
function bindPost() { postEls = post ? $$(".col > *", post) : []; }
const ensureFixed = () => { if (!fixed) { fixed = createSky(fixedCanvas); sizeFixed(); } };
const sizeFixed = () => { if (fixed) resizeSky(fixed, (S.vw * S.scaleFixed) | 0, (S.vh * S.scaleFixed) | 0); };

function measure() {
  S.vw = root.clientWidth; S.vh = probe.offsetHeight; S.phone = S.vw < 700; S.aspect = S.vw / S.vh;
  S.H0 = S.phone ? C.horizon.phone : C.horizon.desktop;
  S.K0 = S.phone ? C.atmosphere.phone : C.atmosphere.desktop;
  S.scaleFixed = Math.min(devicePixelRatio || 1, C.maxPixelRatio);
  sizeFixed();
  if (tall && home) {
    S.skyHeight = Math.min(Math.max(home.offsetHeight, S.vh), C.skyScreens * S.vh);
    tall.canvas.style.height = S.skyHeight + "px";
    S.D1 = S.H0 - (1 - S.skyHeight / S.vh);
    S.scaleTall = Math.min(S.scaleFixed, (Math.min(tall.gl.getParameter(tall.gl.MAX_TEXTURE_SIZE), 8192) - 2) / S.skyHeight);
    if (resizeSky(tall, (S.vw * S.scaleTall) | 0, (S.skyHeight * S.scaleTall) | 0)) fullPaintDue = true;
    S.groundTop = ground.offsetTop;
  }
  scrollEffects();
}

function skyValues(sky, H, K, E) {
  return { T: S.t + 30, H, K: K * lerp(0.012, 1, ease(smooth(0.14, 1, S.o))), C: C.curvature,
    W: lerp(0.002, S.aspect * 2.2 + 1, ease(smooth(0.02, 0.6, S.o))),
    G: smooth(0.03, 0.25, S.o) * (1 - smooth(0.3, 0.7, S.o)) * 0.8, E, A: S.aspect,
    VH: sky === tall ? S.vh * S.scaleTall : sky.canvas.height, D1: S.D1,
    TOP: 1 - S.H0, F: 1 - smooth(0, 0.35, S.n) };
}

function drawPageSky() {
  if (S.scroll > S.skyHeight + S.vh && !fullPaintDue) return; // nothing of it is on screen
  const values = skyValues(tall, S.H0, S.K0, 0);
  if (fullPaintDue && S.o >= 1 && performance.now() - settledAt > 1000) { drawSky(tall, values); fullPaintDue = false; stats.fullPaints++; return; }
  const top = Math.max(0, S.scroll - S.vh * 0.5), bottom = Math.min(S.skyHeight, S.scroll + S.vh * 1.5);
  if (bottom <= top) return;
  drawSky(tall, values, { y: Math.floor((S.skyHeight - bottom) * S.scaleTall), height: Math.ceil((bottom - top) * S.scaleTall) });
}
function drawFixedSky() {
  ensureFixed();
  const e = ease(S.n);
  drawSky(fixed, skyValues(fixed, lerp(S.H0 + S.scroll / S.vh, -1.6, e), lerp(S.K0, 1.6, e), smooth(0.38, 1, S.n)));
}
// While returning home, refresh the hidden page sky a slice at a time, so the
// hand-over at the end of the animation has no large repaint to do.
function prepaintSlice() {
  const top = Math.max(0, S.scroll - S.vh * 0.25), height = S.vh * 1.5 / 4;
  const from = top + slice * height, to = Math.min(S.skyHeight, from + height);
  slice = (slice + 1) % 4;
  if (to > from) { drawSky(tall, skyValues(tall, S.H0, S.K0, 0), { y: Math.floor((S.skyHeight - to) * S.scaleTall), height: Math.ceil((to - from) * S.scaleTall) }); stats.slices++; }
}
function draw() {
  const wantFixed = S.n > 0 || !tall;
  if (wantFixed) drawFixedSky(); else drawPageSky();
  if (wantFixed && tall && S.target === 0 && S.n < 0.7) prepaintSlice();
  if (wantFixed !== usingFixed || !root.classList.contains("sky-ready")) {
    usingFixed = wantFixed;
    if (tall) tall.canvas.style.visibility = wantFixed ? "hidden" : "visible";
    fixedCanvas.style.visibility = wantFixed ? "visible" : "hidden";
  }
}

const lastWritten = {};
function write(el, key, prop, value) { if (lastWritten[key] !== value) { lastWritten[key] = value; el.style[prop] = value; } }

function scrollEffects() {
  const h = S.scroll, vh = S.vh;
  // The menu scrolls past blue, white, amber and then night, so it changes ink and
  // gets a soft backdrop to stay readable: cream, cream on blue, dark ink, cream on night.
  const inkStart = vh * (1 - (S.H0 + S.K0 * 0.46)) - 95;
  const inkEnd = vh * (1 - S.H0) - 0.05 * S.K0 * vh - 75;
  const fade = 1 - smooth(0, 0.25, S.n);
  if (home && greeting) write(greeting, "greet", "opacity", (S.phone ? 1 - smooth(vh * 0.34, vh * 0.41, h) : 1).toFixed(3));
  write(skyScrim, "skyScrim", "opacity", (home && h > 60 && h < inkStart ? fade : 0).toFixed(3));
  write(scrim, "scrim", "opacity", (home && h >= inkEnd ? fade : 0).toFixed(3));
  write(header, "ink", "color", home && h >= inkStart && h < inkEnd && S.n < 0.3 ? INK : "");
  const appear = smooth(0.55, 0.8, S.o);
  write(brand, "brand", "opacity", (appear * Math.max(smooth(0.5, 0.9, S.n), home ? smooth(vh * 0.5, vh * 0.78, h) : 1)).toFixed(3));
}

function applyElements() {
  for (const el of inEls) {
    const a = 0.5 + +el.dataset.in * 0.055, t = smooth(a, a + 0.2, S.o);
    el.style.opacity = t; el.style.transform = t < 1 ? `translateY(${(1 - t) * 12}px)` : "";
  }
  for (const el of outEls) {
    const out = rows[S.clicked] === el ? smooth(0.25, 0.5, S.n) : smooth(0, 0.3, S.n);
    el.style.opacity = 1 - out; el.style.transform = out > 0 ? `translateY(${-out * 10}px)` : "";
  }
  postEls.forEach((el, i) => {
    const a = 0.42 + Math.min(i, 5) * 0.05, t = smooth(a, a + 0.26, S.n);
    el.style.opacity = t; el.style.transform = t < 1 ? `translateY(${(1 - t) * 16}px)` : "";
  });
  if (home) { home.style.visibility = S.n >= 1 ? "hidden" : "visible"; home.style.pointerEvents = S.n > 0.5 ? "none" : ""; }
  if (post) post.style.pointerEvents = S.n > 0.5 ? "" : "none";
  readingScrim.style.opacity = smooth(0.4, 0.8, S.n);
  nav.style.opacity = smooth(0.55, 0.8, S.o);
  scrollEffects();
}

// ---- moving between home and a post -------------------------------------

const pages = new Map();
function load(url) {
  if (!pages.has(url)) pages.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => new DOMParser().parseFromString(t, "text/html")));
  return pages.get(url);
}
const moving = () => S.n !== S.target;
const setBars = (colour) => $('meta[name="theme-color"]').setAttribute("content", colour);
const freeze = (el, y) => { el.style.position = "fixed"; el.style.top = -y + "px"; el.style.left = "0"; el.style.right = "0"; };
const unfreeze = (el) => { el.style.position = el.style.top = el.style.left = el.style.right = ""; };

async function goPost(url, row, push) {
  let doc;
  try { doc = await load(url); } catch { location.href = url; return; }
  ensureFixed();
  S.clicked = row; S.scroll = savedScroll = window.scrollY;
  post = document.importNode($("#post-view", doc), true);
  main.append(post); bindPost();
  S.n = 0.0001; applyElements();
  freeze(home, savedScroll);
  view = root.dataset.view = "post"; postPath = url; setBars("#050c24");
  window.scrollTo(0, 0);
  document.title = doc.title;
  if (push) history.pushState({}, "", url);
  S.target = 1;
}

async function goHome({ push = true, anchor = null, url = "/" } = {}) {
  if (!home) {
    let doc;
    try { doc = await load("/"); } catch { location.href = url; return; }
    home = document.importNode($("#home", doc), true);
    main.prepend(home); homeTitle = doc.title; bindHome();
    tall = createSky($("#sky", home));
    savedScroll = 0;
  }
  const y = window.scrollY;
  freeze(post, y); unfreeze(home); home.style.visibility = "visible";
  view = root.dataset.view = "home"; setBars("#010103");
  S.n = Math.min(S.n, 0.9999); measure(); applyElements();
  let to = savedScroll;
  if (anchor) { const el = $(anchor, home); if (el) to = el.getBoundingClientRect().top + window.scrollY - 104; }
  window.scrollTo(0, to);
  S.scroll = window.scrollY;
  document.title = homeTitle;
  if (push) history.pushState({}, "", url);
  S.target = 0;
}

function arrived() {
  settledAt = performance.now();
  if (S.n === 1 && usedKeyboard) $(".title", post)?.focus({ preventScroll: true });
  if (S.n === 0) {
    post?.remove(); post = null; bindPost();
    if (usedKeyboard) rows[S.clicked]?.querySelector("a")?.focus({ preventScroll: true });
    S.clicked = -1;
  }
  syncWithUrl();
}
function syncWithUrl() {
  if (moving()) return;
  const isPost = location.pathname.startsWith("/writing/");
  if (view === "home" && isPost) goPost(location.pathname, -1, false);
  else if (view === "post" && !isPost && postPath.startsWith("/writing/")) goHome({ push: false });
  else if (view === "post" && isPost && location.pathname !== postPath) location.reload();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[data-nav]");
  if (!enhanced || !a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (moving()) return;
  usedKeyboard = e.detail === 0;
  const url = new URL(a.href);
  if (url.pathname.startsWith("/writing/")) {
    if (view === "home") goPost(url.pathname, rows.indexOf(a.closest("li")), true); else location.href = a.href;
  } else if (view === "post") {
    const backToList = a.classList.contains("back") && home;
    goHome({ anchor: backToList ? null : url.hash || null, url: backToList ? "/" : url.pathname + url.hash });
  } else {
    const el = url.hash && $(url.hash);
    window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY - 104 : 0, behavior: "smooth" });
  }
});
const warm = (e) => { const a = e.target.closest?.("a[data-post]"); if (a) load(new URL(a.href).pathname).catch(() => {}); };
document.addEventListener("pointerover", warm, { passive: true });
document.addEventListener("touchstart", warm, { passive: true });
window.addEventListener("popstate", () => { if (enhanced) syncWithUrl(); });

// ---- start ---------------------------------------------------------------

function start() {
  if (home) { tall = createSky($("#sky", home)); bindHome(); }
  bindPost();
  if (home ? !tall : !(fixed = createSky(fixedCanvas))) { root.classList.remove("js"); return; }
  history.scrollRestoration = "manual";

  let width = 0, height = 0;
  const check = () => { const w = root.clientWidth, h = probe.offsetHeight; if (w !== width || h !== height) { width = w; height = h; measure(); if (calm) drawOnce(); } };
  const drawOnce = () => { S.o = 1; S.n = S.target; draw(); applyElements(); };
  addEventListener("resize", check);
  document.fonts.ready.then(() => { width = 0; check(); });
  check();
  addEventListener("scroll", () => { if (view === "home" && S.n === 0) { S.scroll = window.scrollY; scrollEffects(); } }, { passive: true });

  if (calm) { // reduced motion: one still frame, and links behave as normal links
    for (const a of $$("a[data-nav]")) a.removeAttribute("data-nav");
    drawOnce(); root.classList.add("sky-ready");
    return;
  }

  enhanced = true;
  const t0 = performance.now(); let last = t0, lastDraw = 0, seenO = -1, seenN = -1;
  (window.requestIdleCallback || setTimeout)(() => { if (S.o >= 1 || view === "post") ensureFixed(); }, { timeout: 5000 });
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; // a slow frame slows the animation instead of making it jump
    S.t = force.t ?? (now - t0) / 1000;
    if (S.o < 1) S.o = clamp((now - t0) / (C.openingSeconds * 1000));
    const wasMoving = moving();
    if (S.n < S.target) S.n = Math.min(S.target, S.n + dt / C.climbSeconds);
    else if (S.n > S.target) S.n = Math.max(S.target, S.n - dt / C.returnSeconds);
    if (force.n != null) S.n = force.n;
    if (S.o >= 1 && !fixed) ensureFixed();
    const active = S.o < 1 || (S.n > 0 && S.n < 1);
    if (!active && now - lastDraw < C.idleFrameMs && !fullPaintDue) return;
    lastDraw = now;
    draw();
    if (S.o !== seenO || S.n !== seenN) { seenO = S.o; seenN = S.n; applyElements(); }
    if (!root.classList.contains("sky-ready")) root.classList.add("sky-ready");
    if (wasMoving && !moving()) arrived();
  }
  requestAnimationFrame(frame);
}
start();
