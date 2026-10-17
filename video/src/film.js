/* gigaland-clone — product film. Every value is a pure function of the frame number.
   Layers (back to front): page (camera-driven rebuild of index.html) → overlays (editor, plates, end) → carrier → cursor. */
'use strict';
const Q = new URLSearchParams(location.search);
const FMT = Q.get('fmt') || '16x9';
const V = FMT === '9x16';
const W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const T = window.TIMING, A = T.actions;
const C = { purple: '#8364E2', deep: '#403f83', ink: '#212428', card: '#282b2f', white: '#ffffff', grey: '#a2a2a2', pink: '#ec7498' };
const IMG = '../../assets/img/';

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (f, a, b) => clamp((f - a) / (b - a));
const E = {
  lin: t => t,
  outCubic: t => 1 - (1 - t) ** 3,
  inCubic: t => t ** 3,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) ** 2,
  inOutCubic: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  outQuint: t => 1 - (1 - t) ** 5,
  outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: t => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outBack: (t, s = 1.6) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
};
// CSS 'ease' = cubic-bezier(.25,.1,.25,1), solved numerically
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return t => { let u = t; for (let i = 0; i < 8; i++) { const x = ((ax * u + bx) * u + cx) * u - t; const d = (3 * ax * u + 2 * bx) * u + cx; if (Math.abs(d) < 1e-6) break; u -= x / d; } u = clamp(u); return ((ay * u + by) * u + cy) * u; };
}
E.css = bezier(0.25, 0.1, 0.25, 1);
// damped spring, t in seconds -> 0..1 (overshoots)
function spring(t, w = 16, z = 0.42) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
const sec = f => f / T.fps;
// deterministic micro-motion
const drift = (f, a, p, ph = 0) => a * Math.sin((f / p) * Math.PI * 2 + ph);
function hermite(p0, p1, m0, m1, t) { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1; }

/* ---------- page geometry (page px, 1440 wide — measured from the live page at 1440×900) ---------- */
const G = {
  logo: { x: 117, y: 24, w: 167, h: 36 }, search: { x: 314, y: 22, w: 250, h: 41 },
  nav: [['Home', 850], ['Explore', 937], ['Author', 1033], ['Stats', 1117]],
  pill: { x: 1180, y: 24, w: 143, h: 37 },
  kicker: { x: 108, y: 198 }, head: { x: 108, y: 224, w: 610, h: 114 }, btn: { x: 108, y: 372, w: 140, h: 39 },
  portrait: { x: 760, y: 96, w: 636, h: 590 },
  wallets: { y: 1060, h: 122, w: 197, xs: [70, 290.6, 511.2, 731.8, 952.4, 1173] },
  wnames: ['Metamask', 'Bitski', 'Formatic', 'WalletConnect', 'Coinbase Wallet', 'Arkane'],
  itemsTitle: { x: 70, y: 1222 }, card: { y: 1290, w: 307, h: 430, xs: [70, 401, 732, 1063] },
  collTitle: { x: 70, y: 1790 }, tile: { y: 1856, w: 241, h: 290, xs: [70, 335, 600, 864, 1129] },
  col: { x0: 58, dx: 264.75, y: 1838, h: 326 },
  guideTitle: { x: 70, y: 2236 }, guide: { y: 2296, w: 417, h: 300, xs: [70, 511, 953] },
};
const timerRect = k => ({ x: G.card.xs[k] + 141, y: G.card.y + 25, w: 146, h: 36 });
const colRect = k => ({ x: G.col.x0 + k * G.col.dx + 6, y: G.col.y, w: G.col.dx - 12, h: G.col.h });
const iconRect = { x: G.guide.xs[0] + 50, y: G.guide.y + 50, w: 50, h: 50 };

/* ---------- scroll (window.scrollTop of the rebuilt page) ---------- */
function sY(f) {
  if (f < 284) return 0;
  if (f < 344) return 80 * E.outCubic(prog(f, 284, 344));             // arrives at 80 and holds
  if (f < 354) return 80;
  if (f < 360) return 81;                                              // crosses: > 80 → .header.active
  if (f < 456) return lerp(81, 1100, E.inOutCubic(prog(f, 362, 452)));
  return 1100;
}

/* ---------- camera: page point at screen centre, scale, rotation ---------- */
const cam = (cx, cy, s, rot = 0) => ({ cx, cy, s, rot });
function mixCam(a, b, t) { return cam(lerp(a.cx, b.cx, t), lerp(a.cy, b.cy, t), Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)), lerp(a.rot, b.rot, t)); }
function viewportCam(f) { // the camera behaves like a browser viewport at 1440 css px
  if (!V) return cam(720, sY(f) + (H / 2 - 60) / (W / 1440), W / 1440);
  const z = E.inOutCubic(prog(f, 380, 452)), s = lerp(1.5, 2.1, z);
  return cam(lerp(1080, 330, z), sY(f) + (H / 2 - 230) / s, s);
}
function heroCam(f) {
  if (!V) { const p = E.inOutCubic(prog(f, 0, 276)); const sc = lerp(1.37, 1.43, p); return cam(lerp(712, 720, p) + drift(f, 3, 240), (H / 2 - 64) / sc + 8 * p + drift(f, 2, 180, 1), sc); }
  const pan = E.inOutCubic(prog(f, 150, 204)), sc = 1.45 + 0.03 * prog(f, 0, 276);
  return cam(lerp(430, 1080, pan) + drift(f, 4, 260), 280 + (H / 2 - 760) / sc + drift(f, 4, 300) - 12 * prog(f, 204, 276), sc);
}
function itemsCam(f) {
  const c1 = G.card.xs[0] + G.card.w / 2;
  if (!V) {
    const a = cam(c1 + 6, G.card.y + 168, 3.0), b = cam(c1 + 4 + 10 * prog(f, 566, 600), G.card.y + 312 - 14 * prog(f, 566, 600), 3.0 * (1 + 0.05 * prog(f, 566, 600)));
    const wide = cam(720, 1474, 1.37);
    let c = mixCam(a, b, E.inOutCubic(prog(f, 548, 570)));
    c = mixCam(c, wide, E.inOutCubic(prog(f, 580, 620)));
    c.s *= 1 + 0.03 * prog(f, 480, 600) + 0.045 * prog(f, 620, 690);
    return c;
  }
  const sa = 2.6 + 0.1 * prog(f, 480, 600);
  const a = cam(c1, G.card.y + G.card.h / 2 + 40 / sa, sa);
  const wide = cam(lerp(389, 720, E.inOutCubic(prog(f, 634, 690))), 1505, 1.7);
  return mixCam(a, wide, E.inOutCubic(prog(f, 580, 620)));
}
function collCam(f) {
  const p = prog(f, 700, 860);
  return V ? cam(720 + drift(f, 6, 240) + 30 * p, 2030, 1.6 + 0.1 * p, -0.06) : cam(690 - 10 * p + drift(f, 5, 260), 2036, 1.42 + 0.08 * p, -0.05);
}
function guideCam(f) {
  const c = G.guide.xs[0] + G.guide.w / 2, cy = G.guide.y + G.guide.h / 2, p = prog(f, 870, 960);
  return cam(c + drift(f, 3, 200) + 16 * p, cy - (V ? 0 : 22) - 8 * p, (V ? 2.25 : 2.3) * (1 + 0.08 * p));
}
function camera(f) {
  if (f < 276) return heroCam(f);
  if (f < 360) return mixCam(heroCam(275), viewportCam(f), E.inOutCubic(prog(f, 276, 352)));
  if (f < 450) return viewportCam(f);
  if (f < 600) return mixCam(viewportCam(f), itemsCam(f), E.inOutQuint(prog(f, 450, 506)));
  if (f < 690) return itemsCam(f);
  if (f < 860) return mixCam(itemsCam(f), collCam(f), E.inOutQuint(prog(f, 676, 704)));
  return mixCam(collCam(f), guideCam(f), E.inOutQuint(prog(f, 856, 884)));
}
function proj(x, y, c) {
  const dx = x - c.cx, dy = y - c.cy, co = Math.cos(c.rot), si = Math.sin(c.rot);
  return [W / 2 + c.s * (co * dx - si * dy), H / 2 + c.s * (si * dx + co * dy)];
}
function projRect(r, c) { const [x, y] = proj(r.x + r.w / 2, r.y + r.h / 2, c); return { cx: x, cy: y, w: r.w * c.s, h: r.h * c.s, rot: c.rot, s: c.s }; }

/* ---------- DOM helpers ---------- */
const stage = document.getElementById('stage');
stage.style.width = W + 'px'; stage.style.height = H + 'px';
function el(parent, cls, style = {}, html = '') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  Object.assign(d.style, style);
  if (html) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}
const px = v => v + 'px';
function box(e, r) { e.style.left = px(r.x); e.style.top = px(r.y); e.style.width = px(r.w); e.style.height = px(r.h); }
// art crops from the repo's own hero artwork (gigaland.io images are hotlinked and unreachable)
const VR = { src: IMG + 'women-with-vr.png', w: 1400, h: 1300 }, BG = { src: IMG + 'background.jpg', w: 1920, h: 1080 };
function crop(e, img, sx, sy, sw, boxW, boxH) {
  const k = boxW / sw;
  e.style.backgroundImage = `url(${img.src})`;
  e.style.backgroundSize = `${img.w * k}px ${img.h * k}px`;
  e.style.backgroundPosition = `${-sx * k}px ${-sy * k}px`;
  e.style.height = px(boxH);
}
const svgIcon = (name, size, color) => `<svg width="${size}" height="${size}" viewBox="0 0 17 17" style="display:block"><path fill="${color}" d="${window.ICONS[name]}"/></svg>`;

/* ---------- build: page ---------- */
const page = el(stage, '', {}, ''); page.id = 'page';
el(page, '', {}, '').id = 'pagebg';
const heroBg = el(page, 'hero-bg'); el(page, 'hero-fade');
const kicker = el(page, 'kicker', { left: px(G.kicker.x), top: px(G.kicker.y) }, 'GIGALAND MARKET');
const headline = el(page, 'headline', { left: px(G.head.x), top: px(G.head.y) }, 'Create, sell and collect<br>digital items.');
const btnReal = el(page, 'pillreal', { borderRadius: '5px' }, 'Explore'); box(btnReal, G.btn);
const portrait = el(page, 'portrait'); box(portrait, G.portrait);
const pImg = document.createElement('img'); pImg.src = VR.src; portrait.appendChild(pImg);
G.wallets.xs.forEach((x, i) => box(el(page, 'wtile', {}, G.wnames[i]), { x, y: G.wallets.y, w: G.wallets.w, h: G.wallets.h }));
el(page, 'sec-title', { left: px(G.itemsTitle.x), top: px(G.itemsTitle.y) }, 'New Items');
const ART = [[110, 640, 300, VR], [1000, 470, 290, VR], [800, 520, 520, BG], [990, 1000, 290, VR]];
const AVA = [[1220, 840, 100], [960, 380, 100], [1270, 180, 110], [700, 780, 140]];
const cards = [];
for (let k = 3; k >= 0; k--) { // card 0 on top for the deal
  const x = G.card.xs[k];
  const c = el(page, 'card'); box(c, { x, y: G.card.y, w: G.card.w, h: G.card.h });
  const art = el(c, 'art', { left: '20px', top: '40px', width: '267px', height: '267px' });
  const artIn = el(art, ''); const a = ART[k]; crop(artIn, a[3], a[0], a[1], a[2], 267, 267);
  const av = el(c, 'avatar', { left: '20px', top: '20px', width: '50px', height: '50px' }); crop(av, BG, AVA[k][0], AVA[k][1], AVA[k][2], 50, 50);
  const avRing = el(c, '', { position: 'absolute', left: '20px', top: '20px', width: '50px', height: '50px', borderRadius: '50%', border: '5px solid ' + C.purple });
  el(c, 'check', { left: '54px', top: '50px' }, '<span class="fa">&#xf00c;</span>');
  let timer = null;
  if (k === 2) timer = el(c, 'timer', { left: '141px', top: '25px', width: '146px', height: '36px' }, '1d 14h 40m 25s');
  el(c, 't16', { left: '20px', top: '317px' }, 'Finally Free');
  el(c, 't16', { right: '20px', top: '298px', fontSize: '30px', fontWeight: 400 }, '...');
  el(c, 't14', { left: '20px', top: '352px', color: C.grey }, '0.08 ETH');
  el(c, 't14', { left: '87px', top: '352px' }, '1/20');
  el(c, 't14', { left: '20px', top: '384px', color: C.purple }, 'Place a bid');
  const heart = el(c, 't14', { right: '38px', top: '385px', fontSize: '12px', color: C.grey }, '<span class="fa">&#xf004;</span>');
  el(c, 't14', { right: '20px', top: '385px', fontSize: '12px' }, '50');
  cards[k] = { c, artIn, heart, timer, avRing };
}
const collTitle = el(page, 'sec-title', { left: px(G.collTitle.x), top: px(G.collTitle.y) }, 'Hot Collections');
const guides = [];
for (let k = 0; k <= 5; k++) guides.push(el(page, 'colguide', { left: px(G.col.x0 + k * G.col.dx), top: px(G.col.y), height: px(G.col.h) }));
const TART = [[240, 420, 420, BG], [1020, 560, 260, VR], [1180, 120, 520, BG], [140, 900, 260, VR], [360, 640, 520, BG]];
const tiles = G.tile.xs.map((x, k) => {
  const t = el(page, 'tile'); box(t, { x, y: G.tile.y, w: G.tile.w, h: G.tile.h });
  const art = el(t, 'art', { left: '10px', top: '10px', width: '221px', height: '150px', borderRadius: '10px' });
  crop(el(art, ''), TART[k][3], TART[k][0], TART[k][1], TART[k][2], 221, 150);
  const av = el(t, 'avatar', { left: '90px', top: '130px', width: '60px', height: '60px', border: '0' }); crop(av, BG, AVA[(k + 1) % 4][0], AVA[(k + 1) % 4][1], 110, 60, 60);
  el(t, 'check', { left: '139px', top: '170px' }, '<span class="fa">&#xf00c;</span>');
  el(t, '', { position: 'absolute', left: 0, right: 0, top: '212px', fontSize: '16px', fontWeight: 600 }, 'Abstraction');
  el(t, '', { position: 'absolute', left: 0, right: 0, top: '244px', fontSize: '14px', color: C.grey }, 'ERC-192');
  return t;
});
const guideTitle = el(page, 'sec-title', { left: px(G.guideTitle.x), top: px(G.guideTitle.y) }, 'Create and Sell Now');
const GI = ['wallet', 'cloud-up', 'tag'], GB = ['wallet', 'cloud', 'tag'];
const gcards = G.guide.xs.map((x, k) => {
  const g = el(page, 'guide'); box(g, { x, y: G.guide.y, w: G.guide.w, h: G.guide.h });
  const glyph = el(g, 'glyph', { right: '-10px', top: '90px', width: '240px', height: '240px', opacity: k === 0 ? 0.42 : 0.2 }, svgIcon(GB[k], 240, 'rgba(131,100,226,.5)'));
  const icon = el(g, 'gicon', { left: '50px', top: '50px', width: '50px', height: '50px' }, svgIcon(GI[k], 28, '#fff'));
  el(g, '', { position: 'absolute', left: '50px', top: '130px', fontSize: '20px', fontWeight: 600 }, 'Set up your wallet');
  const sub = el(g, '', { position: 'absolute', left: '50px', top: '172px', width: '300px', fontSize: '15px', lineHeight: 1.7, letterSpacing: '.5px', color: C.grey }, 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem.');
  return { g, glyph, icon, sub };
});
// fixed header lives in the page at y = scrollTop
const header = el(page, 'header');
const hdrBg = el(header, 'hdr-bg');
const logo = document.createElement('img'); logo.src = IMG + 'logo-light.png'; Object.assign(logo.style, { position: 'absolute', left: px(G.logo.x), top: px(G.logo.y), width: px(G.logo.w), height: px(G.logo.h) }); header.appendChild(logo);
box(el(header, 'search', {}, 'search item here...'), G.search);
G.nav.forEach(([n, x]) => el(header, 'navlink', { left: px(x) }, `${n}<span class="fa">&#xf107;</span>`));
const pillReal = el(header, 'pillreal', {}, 'Connect Wallet'); box(pillReal, G.pill);
page.style.filter = 'url(#mbPage)';

/* ---------- build: overlays ---------- */
// 1) editor — index.html lines 130–138, verbatim, common indent removed
const CODE = [
  [130, '<div class="introduce__data">'],
  [131, '  <div class="introduce__title">'],
  [132, '    <span class="introduce__title-small">'],
  [133, '        GIGALAND MARKET'],
  [134, '    </span>'],
  [135, '    <span class="introduce__title-big">'],
  [136, '      Create, sell and collect digital items.'],
  [137, '    </span>'],
  [138, '    <span class="introduce__title-sub">'],
];
const ED = V ? { fs: 32, lh: 80, x: 88, gut: 74 } : { fs: 54, lh: 90, x: 170, gut: 130 };
const lineTop = i => H / 2 + (i - 4) * ED.lh - ED.lh / 2;
const editor = el(stage, 'layer');
const edBg = el(editor, 'layer', { background: 'rgba(33,36,40,0.9)' });
const edBody = el(editor, 'layer', { transformOrigin: '50% 50%' });
const edTab = el(edBody, 'mono', { position: 'absolute', left: px(ED.x), top: px(lineTop(0) - (V ? 110 : 76)), fontSize: px(V ? 30 : 34), color: C.grey, letterSpacing: '.5px' }, '<span style="color:#fff;font-weight:600">gigaland-clone</span> / index.html');
el(edBody, '', { position: 'absolute', left: px(ED.x), top: px(lineTop(0) - (V ? 110 : 76) + 44), width: px(V ? 400 : 420), height: '3px', background: C.purple });
function hl(code) { // minimal HTML syntax colouring from the palette
  return code.replace(/(&lt;\/?)([a-z]+)/g, '$1<span style="color:#fff">$2</span>')
    .replace(/(class=)(")([^"]*)(")/g, '<span style="color:#a2a2a2">$1</span>$2<span style="color:#fff">$3</span>$4');
}
const edLines = CODE.map(([n, code], i) => {
  const y = lineTop(i);
  el(edBody, 'line mono', { left: px(ED.x - ED.gut + (V ? 0 : 0)), top: px(y), fontSize: px(ED.fs * 0.7), lineHeight: px(ED.lh), color: 'rgba(162,162,162,.55)', width: px(ED.gut - 26), textAlign: 'right' }, String(n));
  const esc = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ln = el(edBody, 'line mono', { left: px(ED.x + 4), top: px(y), fontSize: px(ED.fs), lineHeight: px(ED.lh), color: C.grey }, n === 136 ? esc.replace('Create, sell and collect digital items.', '<span id="hlStr" style="opacity:0">Create, sell and collect digital items.</span>') : hl(esc));
  return ln;
});
// the flying string (mono) and the landing copy (DM Sans, page metrics)
const flyMono = el(stage, 'mono', { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontSize: px(ED.fs), lineHeight: px(ED.lh), color: '#fff', transformOrigin: '0 50%', filter: 'url(#mbFly)' }, 'Create, sell and collect digital items.');
const flySans = el(stage, '', { position: 'absolute', left: 0, top: 0, fontSize: '50px', fontWeight: 800, lineHeight: '57px', whiteSpace: 'nowrap', transformOrigin: '0 0', filter: 'url(#mbFly)' }, 'Create, sell and collect<br>digital items.');

// 2) the 80 plate
const plate = el(stage, 'layer');
const P80 = V ? { code: 30, num: 360, gap: 300 } : { code: 36, num: 340, gap: 300 };
const pLineA = el(plate, 'mask', { left: 0, width: '100%', top: px(H / 2 - P80.gap), height: px(P80.code * 1.6), textAlign: 'center' });
const pLineAin = el(pLineA, 'mono', { fontSize: px(P80.code), lineHeight: px(P80.code * 1.6), color: '#fff', fontWeight: 700 }, 'if($(window).scrollTop() &gt; 80) {');
const pNum = el(plate, '', { position: 'absolute', left: 0, width: '100%', top: px(H / 2 - P80.num * 0.62), textAlign: 'center', fontSize: px(P80.num), fontWeight: 800, lineHeight: px(P80.num * 1.2), letterSpacing: '-8px', fontVariantNumeric: 'tabular-nums' }, '0');
const pLineB = el(plate, 'mask', { left: 0, width: '100%', top: px(H / 2 + P80.gap - P80.code * 1.6), height: px(P80.code * 1.6 + 8), textAlign: 'center' });
const pLineBin = el(pLineB, 'mono', { fontSize: px(P80.code), lineHeight: px(P80.code * 1.6), color: '#fff' }, '  $(".header").addClass("active");');
const pUnder = el(plate, '', { position: 'absolute', height: '4px', background: C.purple, top: px(H / 2 + P80.gap + 6) });

// 3) grid label (collections)
const gLabel = el(stage, 'mono', { position: 'absolute', left: 0, top: 0, padding: V ? '18px 26px' : '16px 24px', background: 'rgba(33,36,40,.92)', border: '2px solid ' + C.purple, borderRadius: '10px', fontSize: px(V ? 38 : 40), lineHeight: 1.45, color: '#fff', whiteSpace: 'pre', transformOrigin: '0 100%' },
  '<span style="color:#a2a2a2">.l-2-4 {</span>\n  flex: 0 0 20%;\n  max-width: 20%;\n<span style="color:#a2a2a2">}</span>');

// 4) full-frame type
const typeL = el(stage, 'layer');
// split layout: big counts on one side, the real file names (assets/css + index.html) as tabs on the other
const TY = V ? { fs: 132, x: 110, y1: 410, y2: 740, lx: 110, ly1: 600, ly2: 980, row: 64, lfs: 36, lw: 560 }
             : { fs: 150, x: 130, y1: 250, y2: 560, lx: 1130, ly1: 280, ly2: 520, row: 58, lfs: 32, lw: 470 };
function typeLine(txt, y) { const m = el(typeL, 'mask', { left: px(TY.x - 10), width: px(V ? 960 : 1000), top: px(y), height: px(TY.fs * 1.18) }); return el(m, '', { fontSize: px(TY.fs), fontWeight: 800, lineHeight: px(TY.fs * 1.18), letterSpacing: '-4px', whiteSpace: 'nowrap', paddingLeft: '10px' }, txt); }
const ty1 = typeLine('1 page', TY.y1), ty2 = typeLine('6 stylesheets', TY.y2);
const FILES = [['index.html', TY.ly1], ...['base.css', 'footer.css', 'grid.css', 'header.css', 'responsive.css', 'style.css'].map((n, i) => [n, TY.ly2 + i * TY.row])];
const cssHead = el(typeL, 'mask', { left: px(TY.lx), top: px(TY.ly2 - 46), width: px(TY.lw), height: '40px' });
const cssHeadIn = el(cssHead, 'mono', { fontSize: px(TY.lfs - 4), lineHeight: '40px', color: '#fff', fontWeight: 600 }, 'assets/css/');
const tabs = FILES.map(([n, y]) => { const m = el(typeL, 'mask', { left: px(TY.lx), top: px(y), width: px(TY.lw), height: px(TY.row - 10) }); return el(m, 'mono', { height: '100%', background: C.deep, borderRadius: '8px', fontSize: px(TY.lfs), lineHeight: px(TY.row - 10), paddingLeft: '22px', color: '#fff' }, n); });

// 5) end
const endBack = el(stage, 'layer');
const endBg = el(endBack, 'layer', { backgroundImage: `url(${BG.src})`, backgroundSize: 'cover', backgroundPosition: 'center', transformOrigin: '50% 50%' });
el(endBack, 'layer', { background: 'radial-gradient(ellipse at 50% 50%, rgba(33,36,40,.55) 0%, rgba(33,36,40,.82) 70%)' });
const carrier = el(stage, '', {}); carrier.id = 'carrier'; carrier.style.filter = 'url(#mbCar)';
const carLab = el(carrier, 'lab', {});
for (const e of [flyMono, flySans, plate, gLabel, typeL]) stage.appendChild(e);
const endL = el(stage, 'layer');
const EN = V ? { logoY: 690, nameY: 800, name: 118, urlY: 1070, credY: 1440 } : { logoY: 290, nameY: 380, name: 150, urlY: 700, credY: 960 };
const endLogo = document.createElement('img'); endLogo.src = IMG + 'logo-light.png';
Object.assign(endLogo.style, { position: 'absolute', width: '334px', height: '72px', left: px(W / 2 - 167), top: px(EN.logoY - 36), imageRendering: 'auto' }); endL.appendChild(endLogo);
const endNameM = el(endL, 'mask', { left: 0, width: '100%', top: px(EN.nameY), height: px(EN.name * 1.25), textAlign: 'center' });
const endName = el(endNameM, '', { fontSize: px(EN.name), fontWeight: 800, lineHeight: px(EN.name * 1.25), letterSpacing: '-3px' }, 'gigaland-clone');
const endCred = el(endL, '', { position: 'absolute', left: 0, width: '100%', top: px(EN.credY), textAlign: 'center', fontSize: px(V ? 28 : 26), color: 'rgba(255,255,255,.92)' }, '© Copyright 2021 - Gigaland by Designesia');
const endCta = el(endL, '', { position: 'absolute', left: 0, width: '100%', textAlign: 'center', fontSize: px(V ? 34 : 32), fontWeight: 700, color: '#fff' }, 'Read the source');
const URLR = V ? { w: 900, h: 92, fs: 34 } : { w: 900, h: 96, fs: 38 };

// cursor on top
const vpMask = el(stage, '', { position: 'absolute', left: 0, top: 0, width: '100%', background: C.ink });
const sweep = el(stage, '', { position: 'absolute', left: 0, height: '4px', background: C.purple, boxShadow: '0 0 18px rgba(131,100,226,.9)' });
const cursor = el(stage, 'cursor', {}, '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.6 14.6 L11.6 21.4 L14.4 20.2 L11.4 13.6 L17.8 13.4 Z" fill="#fff" stroke="#212428" stroke-width="1.4" stroke-linejoin="round"/></svg>');

/* ---------- carrier states ---------- */
const S = (cx, cy, w, h, r, o = {}) => Object.assign({ cx, cy, w, h, r, rot: 0, bg: C.purple, bd: 0, lab: '', lfs: 14, lw: 800, ls: 0, la: 1, sx: 1, sy: 1, a: 1 }, o);
function attach(r, c, o) { const p = projRect(r, c); return S(p.cx, p.cy, p.w, p.h, 0, Object.assign({ rot: p.rot, s: p.s }, o)); }
function mixColor(a, b, t) { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join(''); }
function mixS(a, b, t, arc = 0) {
  const o = {};
  for (const k of ['cx', 'cy', 'w', 'h', 'r', 'rot', 'bd', 'lfs', 'ls', 'sx', 'sy', 'a']) o[k] = lerp(a[k], b[k], t);
  o.cy -= arc * Math.sin(Math.PI * t);
  o.bg = mixColor(a.bg, b.bg, t); o.lab = t < 0.5 ? a.lab : b.lab; o.la = t < 0.5 ? a.la * (1 - t * 2) : b.la * (t * 2 - 1); o.lw = b.lw;
  return o;
}
const HEADBOX = V ? { x: G.head.x - 8, y: G.head.y - 4, w: 610 + 16, h: 114 + 8 } : { x: G.head.x - 14, y: G.head.y - 6, w: 610 + 28, h: 114 + 12 };
function flight(f) { // lifted at frame 0, lands on the page headline at A.headline_land
  const tp = E.inOutCubic(prog(f, 0, A.headline_land));
  return { tp, arc: Math.sin(Math.PI * tp) * (V ? 120 : 90), lift: (V ? 14 : 18) * (1 - E.outCubic(prog(f, 0, 30))) };
}
function hlRect() { const r = document.getElementById('hlStr').getBoundingClientRect(); const sr = stage.getBoundingClientRect(); return { x: r.left - sr.left - 10, y: r.top - sr.top - 4, w: r.width + 20, h: r.height + 8 }; }
const full = (bg = C.purple) => S(W / 2, H / 2, W, H, 0, { bg });
// the 80 plate stops under the fixed header so the header's switch stays in view
const hdrBottom = f => proj(0, sY(f) + 85, camera(f))[1];
const plate80 = f => { const hb = hdrBottom(f) + 8; return S(W / 2, (hb + H) / 2, W, H - hb, 0, { bg: C.purple }); };
const INSET = () => V ? S(W / 2, 930, W - 120, 1360, 30, { bg: C.purple }) : S(W / 2, H / 2, W - 160, H - 140, 28, { bg: C.purple });
const URLS = () => S(W / 2, EN.urlY + URLR.h / 2, URLR.w, URLR.h, URLR.h / 2, { bg: C.deep, bd: 2, lab: 'github.com/haudnn/gigaland-clone', lfs: URLR.fs, lw: 500, mono: true });

function carrierState(f, c) {
  const btn = (ff) => attach(G.btn, camera(ff), { r: 5 * camera(ff).s, lab: 'Explore', lfs: 14 * camera(ff).s });
  const pill = (ff) => { const cc = camera(ff); return attach({ ...G.pill, y: G.pill.y + sY(ff) }, cc, { r: 18.5 * cc.s, lab: 'Connect Wallet', lfs: 14 * cc.s }); };
  const timer = (ff) => { const cc = camera(ff); const r = timerRect(0); return attach(r, cc, { r: 17 * cc.s, bg: C.deep, bd: 1 * cc.s, lab: '1d 14h 40m 25s', lfs: 14 * cc.s, lw: 700, ls: 1 * cc.s }); };
  const column = (ff) => { const cc = camera(ff); return attach(colRect(2), cc, { r: 12 * cc.s, bg: C.deep, bd: 3, a: 1 }); };
  const icon = (ff) => { const cc = camera(ff); return attach(iconRect, cc, { r: 5 * cc.s, icon: true }); };
  const head = (ff) => { const cc = camera(ff); return attach(HEADBOX, cc, { r: 8 * cc.s }); };
  if (f < A.headline_land) { // the selection lifts off with its string and becomes the headline's box
    const r = hlRect(), fl = flight(f);
    const from = S(r.x + r.w / 2, r.y + r.h / 2 - fl.lift, r.w * 1.06, r.h * 1.06, 6);
    const o = mixS(from, head(A.headline_land), fl.tp); o.cy -= fl.arc; return o;
  }
  const BL = A.button_land;
  if (f < BL) { // anticipation (swell), then drop into the Explore button
    const sw = 1 + 0.05 * Math.sin(Math.PI * prog(f, A.headline_land + 6, A.headline_land + 26));
    const o = mixS(head(f), btn(f), E.inOutCubic(prog(f, 90, BL)), V ? -60 : -70);
    o.sx = o.sy = sw; o.la = prog(f, BL - 10, BL); o.lab = 'Explore'; return o;
  }
  if (f < 276) { const o = btn(f); const sq = spring(sec(f - BL), 22, 0.35); o.sx = 1 + 0.16 * (1 - sq); o.sy = 1 - 0.2 * (1 - sq); return o; }
  if (f < 352) { const p = E.outExpo(prog(f, 276, 300)); const o = mixS(btn(f), plate80(f), p); o.la = 1 - prog(f, 276, 282); o.lab = 'Explore'; return o; }
  if (f < 440) {
    const p = E.inExpo(prog(f, 354, 360));
    const o = f < 360 ? mixS(plate80(f), pill(f), p) : pill(f);
    o.la = prog(f, 355, 358); o.lab = 'Connect Wallet'; o.crisp = f >= 357;
    if (f >= 360) { const sq = spring(sec(f - 360), 24, 0.32); o.sx = 1 + 0.22 * (1 - sq); o.sy = 1 - 0.25 * (1 - sq); }
    return o;
  }
  if (f < 690) { const p = E.inOutCubic(prog(f, 440, 482)); const o = mixS(pill(f), timer(f), p, V ? -260 : -240); if (f > 482) o.la = 1; return o; }
  if (f < 856) { const p = E.inOutQuint(prog(f, 668, 712)); const o = mixS(timer(f), column(f), p); o.la = 1 - prog(f, 668, 676); o.lab = '1d 14h 40m 25s'; o.colAlpha = p; return o; }
  if (f < 960) { const p = E.inOutQuint(prog(f, 852, 886)); const o = mixS(column(f), icon(f), p); o.icon = p > 0.85; o.colAlpha = 1 - p; return o; }
  if (f < 1060) { const p = E.outExpo(prog(f, 960, 984)); const o = mixS(icon(f), INSET(), p); o.icon = p < 0.4; return o; }
  if (f < 1080) { const p = E.inOutQuint(prog(f, 1060, 1080)); const o = mixS(INSET(), URLS(), p); o.mono = true; o.la = prog(f, 1072, 1080); o.lab = URLS().lab; return o; }
  const o = URLS(); const sq = spring(sec(f - 1080), 20, 0.4); o.sx = 1 + 0.06 * (1 - sq); o.sy = 1 - 0.1 * (1 - sq); o.la = 1; return o;
}

/* ---------- motion blur ---------- */
const mbPage = document.getElementById('mbPageB'), mbCar = document.getElementById('mbCarB'), mbFly = document.getElementById('mbFlyB');
function camVel(f) {
  const a = camera(f - 0.5), b = camera(f + 0.5);
  const pa = proj(720, 1400, a), pb = proj(720, 1400, b);
  const zoom = Math.abs(Math.log(b.s / a.s)) * Math.max(W, H) * 0.08;
  return [Math.abs(pb[0] - pa[0]) + zoom, Math.abs(pb[1] - pa[1]) + zoom];
}
const blurAmt = v => Math.min(18, Math.max(0, (v - 6) * 0.32));

/* ---------- per-frame render ---------- */
function setT(e, x, y, s = 1, extra = '') { e.style.transform = `translate(${x}px,${y}px) scale(${s})${extra}`; }
function vis(e, a) { e.style.opacity = a; e.style.visibility = a <= 0.001 ? 'hidden' : 'visible'; }

window.renderFrame = function (f) {
  const c = camera(f), scroll = sY(f);
  page.style.transform = `translate(${W / 2}px,${H / 2}px) rotate(${c.rot}rad) scale(${c.s}) translate(${-c.cx}px,${-c.cy}px)`;
  const [bx, by] = camVel(f);
  const dof = 10 * E.outCubic(prog(f, 962, 990));
  mbPage.setAttribute('stdDeviation', `${Math.max(dof, blurAmt(bx)) / c.s} ${Math.max(dof, blurAmt(by)) / c.s}`);
  page.style.opacity = 1 - 0.55 * E.outCubic(prog(f, 962, 990));

  /* header: fixed at top of the viewport; .active when scrollTop > 80 (index.html:773) */
  header.style.top = px(scroll);
  vis(hdrBg, scroll > 80 ? 1 : 0);
  vis(header, f < 30 ? 0.25 + 0.75 * prog(f, 0, 30) : f < 506 ? 1 : 0);

  /* hero */
  const under = y => 1 - clamp((scroll + 85 + 24 - y) / 40);
  vis(headline, f >= A.button_land ? under(G.head.y + 40) : 0);
  kicker.style.opacity = under(G.kicker.y + 10); btnReal.style.opacity = f >= 360 ? under(G.btn.y + 10) : 0;
  kicker.style.clipPath = `inset(0 ${100 - 100 * E.outCubic(prog(f, 152, 182))}% 0 0)`;
  // portrait: the marble window unfolds from its centre line, then the reveal keeps rising past the top edge (the head)
  const pf = f, PT = V ? { s0: 160, s1: 196, u0: 166, u1: 206, h0: 190, h1: 236 } : { s0: 150, s1: 190, u0: 156, u1: 196, h0: 184, h1: 236 };
  const u1 = E.outQuint(prog(pf, PT.u0, PT.u1)), u2 = E.outCubic(prog(pf, PT.h0, PT.h1));
  const winTop = 189, winMid = 390;
  const top = lerp(winMid, winTop, u1) - winTop * u2, bot = lerp(winMid, 590, u1);
  const side = lerp(318, 45, E.outQuint(prog(pf, PT.s0, PT.s1)));
  portrait.style.clipPath = `inset(${top}px ${u2 > 0.02 ? lerp(side, 0, u2) : side}px ${590 - bot}px ${u2 > 0.02 ? lerp(side, 0, u2) : side}px round ${18 * (1 - u2) + 0}px)`;
  const rise = spring(sec(pf - PT.h0), 11, 0.5);
  pImg.style.transform = `translateY(${(1 - rise) * 36 + drift(f, 5, 150, 1)}px) scale(${1.04 - 0.04 * u1})`;
  heroBg.style.transform = `translate(${-0.12 * f}px, ${-0.05 * f}px) scale(${1 + 0.0002 * f})`;
  vis(portrait, pf >= PT.s0 ? 1 : 0);

  /* New Items: deal from behind card 0, hover zoom on art (CSS 1.02, 0.3 s linear), heart hover colour */
  for (let k = 1; k < 4; k++) {
    const p = E.outCubic(prog(f, 586 + 7 * k, 628 + 7 * k));
    cards[k].c.style.transform = `translateX(${(1 - p) * (G.card.xs[0] - G.card.xs[k])}px) rotate(${(1 - p) * -2 * k}deg)`;
    vis(cards[k].c, f > 584 ? 1 : 0);
  }
  const hov = f >= A.avatar_hover && f < 592;
  const hz = hov ? 1 + 0.02 * prog(f, A.avatar_hover, A.avatar_hover + 18) : 1 + 0.02 * (1 - prog(f, 592, 610)) * (f >= 592 && f < 610 ? 1 : 0);
  cards[0].artIn.style.transform = `scale(${hz})`;
  cards[0].heart.style.color = f >= A.heart_hover && f < 592 ? C.pink : C.grey;
  cards.forEach((cd, k) => vis(cd.avRing, k === 0 && f >= A.avatar_hover && f < A.hover - 4 ? 1 : 0));

  /* Hot Collections: guides draw, tiles fall on 8th notes */
  guides.forEach((g, k) => { const p = E.outCubic(prog(f, 684 + 4 * k, 724 + 4 * k)); g.style.height = px(G.col.h * p); vis(g, f > 680 && f < 886 ? 1 : 0); });
  tiles.forEach((t, k) => {
    const t0 = A.tile0 + A.tile_step * [3, 1, 0, 2, 4][k] - 8;
    const sp = spring(sec(f - t0), 18, 0.48);
    t.style.transform = `translateY(${(1 - sp) * -70}px) scale(${1 + (1 - Math.min(1, sp)) * 0.06})`;
    vis(t, f >= t0 ? clamp(prog(f, t0, t0 + 5)) : 0);
  });

  /* guide: cursor hover rotates the background glyph -25deg over 0.7 s (CSS: transition all ease .7s) */
  const gp = E.css(prog(f, A.guide_hover, A.guide_hover + 42));
  gcards[0].glyph.style.transform = `rotate(${-25 * gp}deg)`;
  gcards[0].sub.style.color = f >= A.guide_hover ? '#fff' : C.grey;
  vis(gcards[0].icon, f < 856 ? 1 : 0);
  gcards.forEach((g, k) => { const p = E.outCubic(prog(f, 848 + 5 * k, 882 + 5 * k)); vis(g.g, f >= 848 || f < 680 ? (f < 680 ? 1 : p) : 0); g.g.style.transform = `translateY(${(1 - (f < 680 ? 1 : p)) * 60}px)`; });
  vis(guideTitle, f < 680 ? 1 : E.outCubic(prog(f, 846, 872)));
  vis(collTitle, V && f >= 480 && f < 676 ? 0 : 1);

  /* overlays */
  // editor
  const edOut = E.inCubic(prog(f, 30, 96));
  vis(editor, f < 100 ? 1 : 0);
  edBg.style.opacity = 1 - E.outCubic(prog(f, 24, 96));
  edBody.style.transform = `translateY(${edOut * (V ? 260 : 160)}px) scale(${1 - 0.12 * E.outCubic(prog(f, 20, 118))})`;
  edBody.style.opacity = 1 - E.outQuad(prog(f, 20, 84));
  edBody.style.filter = `blur(${10 * E.inQuad(prog(f, 16, 84))}px)`;
  // flying headline: lifted at frame 0, lands at f60 on the page headline
  const hr = hlRect();
  const target = projRect({ x: G.head.x, y: G.head.y, w: 0, h: 0 }, camera(60));
  const fl = flight(f), tp = fl.tp;
  const monoW = flyMono.offsetWidth || 1;
  const startX = hr.x + 10, startY = hr.y + 4 - fl.lift;
  let fx = lerp(startX, target.cx, tp), fy = lerp(startY, target.cy, tp) - fl.arc;
  if (f >= A.headline_land) { const pr = projRect({ x: G.head.x, y: G.head.y, w: 0, h: 0 }, c); fx = pr.cx; fy = pr.cy; }
  const sansScale = c.s * (f < 60 ? camera(60).s / c.s : 1);
  const xf = E.inOutCubic(prog(f, 16, 40));
  const monoScale = lerp(1.06, (610 * camera(60).s) / monoW, tp);
  setT(flyMono, fx, fy - ED.lh * 0.0, monoScale);
  flyMono.style.textShadow = `0 ${6 + fl.lift}px 26px rgba(0,0,0,${0.6 * (1 - xf)})`;
  vis(flyMono, f < 60 ? 1 - xf : 0);
  const sansStartScale = monoW * 1.06 / 610;
  const bump = f >= A.headline_land ? 1 + 0.045 * (1 - spring(sec(f - A.headline_land), 30, 0.38)) : 1;
  setT(flySans, fx, fy - 2, (f >= A.headline_land ? c.s : lerp(sansStartScale, camera(60).s, tp)) * bump);
  vis(flySans, f < A.button_land ? xf : 0);
  const fv = Math.abs(lerp(startX, target.cx, E.outCubic(prog(f + 0.5, 4, 60))) - lerp(startX, target.cx, E.outCubic(prog(f - 0.5, 4, 60))));
  mbFly.setAttribute('stdDeviation', `${blurAmt(fv) * 0.6} ${blurAmt(fv) * 0.25}`);

  // 80 plate
  const plOn = f >= 284 && f < 360;
  vis(plate, plOn ? 1 : 0);
  if (plOn) {
    pLineAin.style.transform = `translateY(${(1 - E.outQuint(prog(f, 284, 304))) * 110}%)`;
    pLineBin.style.transform = `translateY(${(1 - E.outQuint(prog(f, 292, 312))) * 110}%)`;
    const n = Math.floor(scroll);
    pNum.innerHTML = `<span style="position:absolute;left:0;right:0;top:-.02em;font-size:.12em;letter-spacing:0;font-family:'JB Mono';font-weight:600;line-height:1">scrollTop()</span>${n}<span style="font-size:.3em;letter-spacing:0;color:#ffffff;margin-left:.08em">px</span>`;
    const crossed = scroll > 80;
    pNum.style.transform = `scale(${0.92 + 0.08 * E.outCubic(prog(f, 286, 310)) + 0.03 * Math.sin(Math.PI * prog(f, 344, 354)) + (crossed ? 0.06 * (1 - spring(sec(f - 354), 26, 0.35)) : 0)})`;
    pNum.style.opacity = E.outCubic(prog(f, 286, 296));
    pLineBin.style.color = '#fff'; pLineBin.style.fontWeight = 700;
    const uw = pLineBin.offsetWidth ? 0 : 0;
    const bw = (V ? 600 : 760) * E.outExpo(prog(f, 354, 360));
    pUnder.style.left = px(W / 2 - bw / 2); pUnder.style.width = px(bw);
    plate.style.opacity = 1 - E.inQuad(prog(f, 355, 360));
    plate.style.transform = `translateY(${hdrBottom(f) / 2}px) scale(${1 + 0.05 * prog(f, 284, 360)}) translateY(${-10 * prog(f, 284, 360)}px)`;
  }

  // grid label
  const glOn = f >= 736 && f < 860;
  vis(gLabel, glOn ? E.outCubic(prog(f, 736, 748)) * (1 - prog(f, 850, 858)) : 0);
  if (glOn) {
    const cr = projRect({ x: colRect(2).x + colRect(2).w / 2, y: G.col.y + G.col.h + 22, w: 0, h: 0 }, c);
    const lp = spring(sec(f - 736), 14, 0.5);
    const gw = gLabel.offsetWidth, gh = gLabel.offsetHeight;
    gLabel.style.transformOrigin = '50% 0';
    gLabel.style.transform = `translate(${cr.cx - gw / 2}px,${cr.cy + 30 * (1 - lp)}px) rotate(${c.rot}rad)`;
  }

  // full-frame type
  const tyOn = f >= 966 && f < 1066;
  vis(typeL, tyOn ? 1 : 0);
  if (tyOn) {
    const out = E.inCubic(prog(f, 1048, 1060));
    ty1.style.transform = `translateY(${(1 - E.outQuint(prog(f, A.type_a - 14, A.type_a + 8))) * 110 - out * 110}%)`;
    ty2.style.transform = `translateY(${(1 - E.outQuint(prog(f, A.type_b - 12, A.type_b + 12))) * 110 - out * 110}%)`;
    cssHeadIn.style.transform = `translateY(${(1 - E.outQuint(prog(f, A.type_b, A.type_b + 14))) * 110 - E.inCubic(prog(f, 1044, 1054)) * 110}%)`;
    tabs.forEach((t, i) => { const t0 = i === 0 ? A.type_a + 6 : A.type_b + 4 + 4 * (i - 1); const o2 = E.inCubic(prog(f, 1044 + i, 1054 + i));
      t.style.transform = `translateX(${(1 - E.outQuint(prog(f, t0, t0 + 14))) * -105 + o2 * 105}%)`; });
    typeL.style.transform = `scale(${1 + 0.03 * prog(f, 966, 1066)})`;
  }

  // end
  if (f >= 1066) vis(page, 0);
  vis(endL, f >= 1058 ? 1 : 0); vis(endBack, f >= 1058 ? 1 : 0);
  if (f >= 1058) {
    endBg.style.transform = `scale(${1.06 + (V ? 0.2 : 0.12) * prog(f, 1058, 1200)}) translate(${-30 * prog(f, 1058, 1200)}px, ${-16 * prog(f, 1058, 1200)}px)`;
    endBg.style.filter = `brightness(${1 + drift(f, 0.03, 90)})`;

    const np = E.outQuint(prog(f, 1070, 1096));
    endName.style.transform = `translateY(${(1 - np) * 105}%)`;
    endName.style.letterSpacing = px(-3 + 3 * (1 - np) - 1.5 * prog(f, 1096, 1200));
    endLogo.style.opacity = E.outCubic(prog(f, 1084, 1100));
    endLogo.style.transform = `translateY(${(1 - E.outCubic(prog(f, 1084, 1104))) * 16}px)`;
    endCred.style.opacity = E.outCubic(prog(f, 1100, 1116));
    endCta.style.top = px(EN.urlY - (V ? 62 : 58)); endCta.style.opacity = E.outCubic(prog(f, 1086, 1100)); endCta.style.transform = `translateY(${(1 - E.outCubic(prog(f, 1086, 1104))) * 14}px)`;
    endL.style.transform = `scale(${1 + 0.05 * prog(f, 1076, 1200)}) translateY(${-8 * prog(f, 1076, 1200)}px)`;
    endL.style.transformOrigin = '50% 50%';
  }

  // .addClass("active") lands on the header: a line runs along its bottom edge as it switches
  if (f >= 354 && f < 380) { const hb = hdrBottom(f); const p = E.outExpo(prog(f, 354, 366)); sweep.style.top = px(hb - 2); sweep.style.width = px(W * p); vis(sweep, 1 - prog(f, 368, 380)); } else vis(sweep, 0);
  // nothing exists above a browser viewport: mask the band over the fixed header while we scroll
  if (f >= 356 && f < 476) { vpMask.style.height = px(Math.max(0, proj(0, scroll, c)[1])); vis(vpMask, prog(f, 356, 364) * (1 - prog(f, 458, 476))); } else vis(vpMask, 0);
  // carrier
  const st = carrierState(f, c);
  carrier.style.left = px(st.cx - st.w / 2); carrier.style.top = px(st.cy - st.h / 2);
  carrier.style.width = px(Math.max(0, st.w)); carrier.style.height = px(Math.max(0, st.h));
  carrier.style.borderRadius = px(st.r);
  const colA = st.colAlpha || 0;
  carrier.style.background = colA > 0 ? `rgba(64,63,131,${lerp(1, 0.22, colA)})` : st.bg;
  carrier.style.border = st.bd > 0.05 ? `${st.bd}px solid ${C.purple}` : 'none';
  carrier.style.transform = `rotate(${st.rot || 0}rad) scale(${st.sx},${st.sy})`;
  carrier.style.opacity = st.a;
  carLab.innerHTML = st.icon ? svgIcon('wallet', Math.round(28 * (st.h / 50)), '#fff') : st.lab;
  carLab.className = 'lab' + (st.mono ? ' mono' : '');
  carLab.style.fontSize = px(st.lfs); carLab.style.fontWeight = st.lw; carLab.style.letterSpacing = px(st.ls);
  carLab.style.opacity = st.icon ? 1 : st.la;
  const pc = carrierState(f - 0.5, c), nc = carrierState(f + 0.5, c);
  const cvx = Math.abs(nc.cx - pc.cx) + Math.abs(nc.w - pc.w) * 0.5, cvy = Math.abs(nc.cy - pc.cy) + Math.abs(nc.h - pc.h) * 0.5;
  const cb = st.crisp && f < 368 ? 0 : 0.7;
  mbCar.setAttribute('stdDeviation', `${blurAmt(cvx) * cb} ${blurAmt(cvy) * cb}`);
  // hide the real elements the carrier is standing in for
  vis(pillReal, f >= 354 && f < 440 ? 0 : 1);

  // cursor: hover on card art, glide to the heart; then hover the guide card
  let cu = null;
  if (f >= 496 && f < 594) {
    const cc = c;
    const p0 = proj(G.card.xs[0] + 48, G.card.y + 50, cc), p1 = proj(G.card.xs[0] + 200, G.card.y + 210, cc), p2 = proj(G.card.xs[0] + 281, G.card.y + 393, cc);
    const enter = E.outCubic(prog(f, 496, A.avatar_hover)), g1 = E.inOutCubic(prog(f, A.avatar_hover + 10, A.hover)), go = E.inOutCubic(prog(f, A.hover + 10, A.heart_hover));
    let x = lerp(W * 0.8, p0[0], enter), y = lerp(H + 60, p0[1], enter);
    x = lerp(x, p1[0], g1); y = lerp(y, p1[1], g1) - Math.sin(Math.PI * g1) * 30;
    cu = [lerp(x, p2[0], go), lerp(y, p2[1], go) - Math.sin(Math.PI * go) * 40];
    const leave = E.inCubic(prog(f, 578, 594)); cu[0] += leave * 500; cu[1] += leave * 300;
  } else if (f >= 862 && f < 960) {
    const p1 = proj(G.guide.xs[0] + 330, G.guide.y + 92, c);
    const enter = E.outCubic(prog(f, 862, A.guide_hover));
    cu = [lerp(W + 40, p1[0], enter) + drift(f, 3, 80), lerp(p1[1] + 200, p1[1], enter) + drift(f, 2, 110)];
    const leave = E.inCubic(prog(f, 944, 960)); cu[0] += leave * 600; cu[1] += leave * 200;
  }
  vis(cursor, cu ? 1 : 0);
  if (cu) setT(cursor, cu[0] - 6, cu[1] - 3, V ? 1.5 : 1.3);
};

window.renderReady = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  // preload css background images
  await Promise.all([VR.src, BG.src].map(s => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = s; })));
  await new Promise(r => setTimeout(r, 50));
  window.renderFrame(Number(Q.get('f') || 0));
  return true;
})();
