'use strict';
/* =========================================================
   SELİM: ZOMBİ AVCISI  —  oyun.js
   Oyun motoru: harita üretimi, sürüş fiziği, silahlar,
   zombi yapay zekâsı, efektler, kamera ve ekrana çizim.
   ========================================================= */

const tuval = document.getElementById('oyun');
const cx = tuval.getContext('2d');
let VW = 0, VH = 0, ZOOM = 1;
const DOKUNMATIK = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

// Ekran boyutu değişince tuvali yeniden boyutlandır
function boyutla() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  tuval.width = Math.round(VW * DPR); tuval.height = Math.round(VH * DPR);
  // küçük ekranlarda kamera biraz uzaklaşır, daha çok alan görünür
  ZOOM = clamp(Math.min(VW, VH) / 620, 0.55, 1.25);
}

// Aktif oyun durumu (menüdeyken null)
let O = null;

// Girdi durumu: klavye, fare, dokunmatik joystick
const G = {
  tus: {},
  joy: { aktif: false, id: null, bx: 0, by: 0, x: 0, y: 0, vx: 0, vy: 0 },
  fare: { x: 0, y: 0, basili: false },
  dok: null,       // sağ taraftaki nişan parmağı
  nitroBas: false
};

// ================= BÖLÜM AYARLARI =================
function bolumAyar(n) {
  const dIdx = Math.floor((n - 1) / 6);
  const bossVar = n % 6 === 0;
  return {
    n, dIdx, d: DUNYALAR[dIdx], bossVar,
    hedef: bossVar ? 12 + n : 18 + n * 3,           // öldürülmesi gereken zombi
    zorluk: 1 + (n - 1) * 0.09,                      // zombi canı çarpanı
    aralik: Math.max(14, 62 - n * 1.6),              // doğma aralığı (kare)
    maksAktif: Math.min(70, 16 + n * 2),             // aynı anda en fazla zombi
    hizCarpan: 1 + Math.min(0.5, (n - 1) * 0.015)
  };
}
// Bölüme göre zombi tipi seç (ağırlıklı rastgele)
function zombiTipSec(n) {
  const liste = [['normal', 10]];
  if (n >= 2) liste.push(['kosucu', 2 + n * 0.3]);
  if (n >= 4) liste.push(['sisko', 1 + n * 0.15]);
  if (n >= 7) liste.push(['tukurucu', 1 + n * 0.12]);
  if (n >= 10) liste.push(['patlayan', 1 + n * 0.12]);
  let top = 0; liste.forEach(l => top += l[1]);
  let r = Math.random() * top;
  for (const [t, a] of liste) { r -= a; if (r <= 0) return t; }
  return 'normal';
}

// ================= HARİTA ÜRETİMİ =================
function haritaOlustur(A) {
  const r = tohumluRastgele(A.n * 7919 + 13);
  const W = 2600, H = 2600, mx = W / 2, my = H / 2;
  const eng = [], sus = [], lekeler = [], lav = [];
  const merkezBos = (x, y, rad) => Math.hypot(x - mx, y - my) > 280 + rad; // başlangıç alanı boş kalsın
  const cakisir = (x, y, rad) => eng.some(e => e.tip === 'daire'
    ? Math.hypot(e.x - x, e.y - y) < e.r + rad + 30
    : (x > e.x - rad - 30 && x < e.x + e.w + rad + 30 && y > e.y - rad - 30 && y < e.y + e.h + rad + 30));
  const tip = A.d.tip;

  if (tip === 'sehir') {
    // Şehir: ızgara şeklinde binalar ve aralarında yollar
    const hucre = 420, yol = 130;
    const renkler = ['#8d6e63', '#78909c', '#a1887f', '#90a4ae', '#bcaaa4', '#7986cb', '#a5d6a7'];
    for (let gx = 0; gx < W; gx += hucre) for (let gy = 0; gy < H; gy += hucre) {
      if (r() < 0.1) continue; // bazı bloklar boş (park alanı)
      const w = hucre - yol - r() * 70, h = hucre - yol - r() * 70;
      const x = gx + yol / 2 + r() * (hucre - yol - w), y = gy + yol / 2 + r() * (hucre - yol - h);
      const ex = clamp(mx, x, x + w), ey = clamp(my, y, y + h);
      if (Math.hypot(ex - mx, ey - my) < 300) continue;
      const renk = renkler[Math.floor(r() * renkler.length)];
      const detay = [];
      const adet = 2 + Math.floor(r() * 4);
      for (let i = 0; i < adet; i++) {
        const dw = 14 + r() * 26, dh = 14 + r() * 26;
        detay.push({ x: 14 + r() * Math.max(1, w - dw - 28), y: 14 + r() * Math.max(1, h - dh - 28), w: dw, h: dh, r: r() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.18)' });
      }
      eng.push({ tip: 'kutu', x, y, w, h, renk, detay });
    }
  } else {
    // Diğer dünyalar: dağınık ağaç, kaya, kaktüs, çam
    const adet = tip === 'orman' ? 75 : 55;
    for (let i = 0; i < adet * 4 && eng.length < adet; i++) {
      let alt = 'kaya';
      if (tip === 'orman') alt = r() < 0.85 ? 'agac' : 'kaya';
      else if (tip === 'col') alt = r() < 0.4 ? 'kaktus' : 'kaya';
      else if (tip === 'kar') alt = r() < 0.55 ? 'cam' : 'kaya';
      const rad = alt === 'kaktus' ? 16 + r() * 10 : 24 + r() * 38;
      const x = 60 + r() * (W - 120), y = 60 + r() * (H - 120);
      if (!merkezBos(x, y, rad) || cakisir(x, y, rad)) continue;
      const nokta = []; for (let k = 0; k < 9; k++) nokta.push(0.78 + r() * 0.22);
      eng.push({ tip: 'daire', x, y, r: rad, alt, nokta });
    }
  }
  // Patlayıcı kırmızı variller (vurunca patlar!)
  let varil = 0;
  for (let i = 0; i < 80 && varil < 12; i++) {
    const x = 80 + r() * (W - 160), y = 80 + r() * (H - 160);
    if (!merkezBos(x, y, 20) || cakisir(x, y, 15)) continue;
    eng.push({ tip: 'daire', x, y, r: 15, alt: 'varil', patlayici: true, can: 30 });
    varil++;
  }
  // Volkan dünyasında lav gölleri (üstünden geçince hasar)
  if (tip === 'volkan') {
    for (let i = 0; i < 60 && lav.length < 10; i++) {
      const rad = 50 + r() * 50;
      const x = 120 + r() * (W - 240), y = 120 + r() * (H - 240);
      if (!merkezBos(x, y, rad + 40) || cakisir(x, y, rad)) continue;
      const nokta = []; for (let k = 0; k < 12; k++) nokta.push(0.75 + r() * 0.25);
      lav.push({ x, y, r: rad, nokta });
    }
  }
  // Zemin lekeleri ve küçük süsler
  for (let i = 0; i < 45; i++) lekeler.push({ x: r() * W, y: r() * H, r: 60 + r() * 120 });
  for (let i = 0; i < 320; i++) sus.push({ x: r() * W, y: r() * H, t: Math.floor(r() * 3), s: 0.6 + r() * 0.8 });
  return { W, H, eng, sus, lekeler, lav };
}

// ================= ÇARPIŞMA YARDIMCILARI =================
// Daire şeklindeki nesneyi (oyuncu/zombi) engellerin dışına iter
function engelItme(o, r) {
  let carpti = false;
  for (const e of O.harita.eng) {
    if (e.sil) continue;
    if (e.tip === 'kutu') {
      if (o.x < e.x - r || o.x > e.x + e.w + r || o.y < e.y - r || o.y > e.y + e.h + r) continue;
      const kx = clamp(o.x, e.x, e.x + e.w), ky = clamp(o.y, e.y, e.y + e.h);
      const dx = o.x - kx, dy = o.y - ky, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); o.x += dx / d * (r - d); o.y += dy / d * (r - d); }
        else { // nesne binanın içine girdiyse en yakın kenara çıkar
          const sol = o.x - e.x, sag = e.x + e.w - o.x, ust = o.y - e.y, alt = e.y + e.h - o.y;
          const m = Math.min(sol, sag, ust, alt);
          if (m === sol) o.x = e.x - r; else if (m === sag) o.x = e.x + e.w + r; else if (m === ust) o.y = e.y - r; else o.y = e.y + e.h + r;
        }
        carpti = true;
      }
    } else {
      const dx = o.x - e.x, dy = o.y - e.y, rr_ = r + e.r;
      if (Math.abs(dx) > rr_ || Math.abs(dy) > rr_) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr_ * rr_) { const d = Math.sqrt(d2) || 0.01; o.x += dx / d * (rr_ - d); o.y += dy / d * (rr_ - d); carpti = true; }
    }
  }
  return carpti;
}
// Bir noktada engel var mı? Varsa engeli döndürür
function engelBul(x, y, r) {
  for (const e of O.harita.eng) {
    if (e.sil) continue;
    if (e.tip === 'kutu') { if (x > e.x - r && x < e.x + e.w + r && y > e.y - r && y < e.y + e.h + r) return e; }
    else { const dx = x - e.x, dy = y - e.y; if (dx * dx + dy * dy < (r + e.r) * (r + e.r)) return e; }
  }
  return null;
}
// En yakın canlı zombiyi bulur
function enYakinZombi(x, y, maks, haric) {
  let en = null, enD = maks * maks;
  for (const z of O.zombiler) {
    if (z.olu || (haric && haric.has(z))) continue;
    const d = (z.x - x) * (z.x - x) + (z.y - y) * (z.y - y);
    if (d < enD) { enD = d; en = z; }
  }
  return en;
}
const ekrandanDunya = (sx, sy) => ({ x: O.kam.x + sx / ZOOM, y: O.kam.y + sy / ZOOM });
const dunyadanEkrana = (x, y) => ({ x: (x - O.kam.x) * ZOOM, y: (y - O.kam.y) * ZOOM });

// ================= EFEKTLER =================
function parcacik(x, y, vx, vy, omur, renk, boy, tip) {
  if (O.parcaciklar.length > 500) return;
  O.parcaciklar.push({ x, y, vx, vy, omur, max: omur, renk, boy, tip: tip || 0 });
}
function yaziEkle(x, y, yazi, renk, boy) {
  if (O.yazilar.length > 40) O.yazilar.shift();
  O.yazilar.push({ x, y, yazi: String(yazi), renk, boy: boy || 14, omur: 55, max: 55 });
}
function selimKonus(yazi) { if (O) O.konusma = { yazi, omur: 150 }; }
// Zombi ölünce "puf" bulutu (kan yok, çocuk dostu)
function pof(z) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(0.5, 3);
    parcacik(z.x, z.y, Math.cos(a) * v, Math.sin(a) * v, rand(18, 32), pick(['#c5e1a5', '#aed581', '#f1f8e9']), rand(4, 8) * z.boy / 15, 1);
  }
  for (let i = 0; i < 4; i++) parcacik(z.x, z.y, rand(-2, 2), rand(-3, -1), 30, '#fff59d', 3, 3);
}
// Patlama: alandaki zombilere hasar verir
function patla(x, y, r, hasar, oyuncuya) {
  Ses.cal('patlama');
  O.sarsinti = Math.max(O.sarsinti, r / 8);
  O.halkalar.push({ x, y, r: 10, max: r * 1.2, omur: 20, maxOmur: 20 });
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(1, 5) * r / 80;
    parcacik(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(20, 40), pick(['#ffeb3b', '#ff9800', '#ff5722', '#fff3e0']), rand(5, 11), 0);
  }
  for (let i = 0; i < 10; i++) parcacik(x + rand(-r / 3, r / 3), y + rand(-r / 3, r / 3), rand(-0.5, 0.5), rand(-0.5, 0.5), rand(40, 70), 'rgba(90,90,90,.55)', rand(10, 18), 1);
  if (hasar > 0) {
    for (const z of O.zombiler) {
      if (z.olu) continue;
      const d = Math.hypot(z.x - x, z.y - y);
      if (d < r + z.boy) zombiHasar(z, hasar * (1 - Math.min(1, d / (r + z.boy)) * 0.6), z.x - x, z.y - y, 'roket');
    }
    if (oyuncuya && Math.hypot(O.P.x - x, O.P.y - y) < r + O.a.r) oyuncuHasar(hasar * 0.5);
  }
  // yakındaki variller de zincirleme patlar
  for (const e of O.harita.eng) {
    if (e.patlayici && !e.sil && Math.hypot(e.x - x, e.y - y) < r + e.r) {
      e.can -= Math.max(20, hasar);
      if (e.can <= 0) varilPatlat(e);
    }
  }
}
function varilPatlat(e) {
  if (e.sil) return;
  e.sil = true; O.engelSil = true;
  patla(e.x, e.y, 115, 70 * O.ayar.zorluk, true);
}

// ================= ZOMBİLER =================
function zombiEkle(tip, x, y) {
  const t = ZOMBI_TIPLERI[tip], A = O.ayar;
  const z = {
    tip, x, y, vx: 0, vy: 0,
    can: t.can * A.zorluk, maxCan: t.can * A.zorluk,
    hiz: t.hiz * A.hizCarpan * (tip === 'boss' ? 1 : rand(0.9, 1.1)),
    boy: t.boy, hasar: t.hasar * (1 + (A.n - 1) * 0.04), renk: t.renk,
    para: Math.round(t.para * (1 + A.n * 0.05)),
    flas: 0, yavas: 0, yanma: 0, itx: 0, ity: 0, ramSayac: 0, isirSayac: 20,
    tukSayac: rand(30, 110), adim: Math.random() * 10, yon: Math.atan2(O.P.y - y, O.P.x - x),
    takil: 0, takilYon: 0, olu: false
  };
  if (tip === 'boss') {
    z.renk = A.d.bossRenk; z.ad = A.d.boss;
    z.bossSayac = 180; z.bossFaz = 0; z.hucum = 0;
    O.boss = z;
  }
  O.zombiler.push(z);
  return z;
}
// Ekranın dışında, oyuncunun etrafında zombi doğur
function zombiDogur(tip) {
  const P = O.P, H = O.harita;
  const yaricap = Math.hypot(VW, VH) / ZOOM / 2 + 80;
  for (let deneme = 0; deneme < 10; deneme++) {
    const ac = Math.random() * Math.PI * 2;
    const x = P.x + Math.cos(ac) * yaricap, y = P.y + Math.sin(ac) * yaricap;
    if (x < 30 || y < 30 || x > H.W - 30 || y > H.H - 30) continue;
    if (engelBul(x, y, 30)) continue;
    return zombiEkle(tip || zombiTipSec(O.ayar.n), x, y);
  }
  return null;
}
function zombiHasar(z, h, vx, vy, tur) {
  if (z.olu) return;
  z.can -= h; z.flas = 5;
  if (vx !== undefined) { // geri tepme
    const l = Math.hypot(vx, vy) || 1;
    let it = (tur === 'roket' || tur === 'ezme') ? 5 : (tur === 'alev' ? 0.3 : 1.4);
    if (z.tip === 'boss') it *= 0.08; else if (z.tip === 'sisko') it *= 0.4;
    z.itx += vx / l * it; z.ity += vy / l * it;
  }
  if (tur !== 'alev' && h >= 1) yaziEkle(z.x + rand(-6, 6), z.y - z.boy, Math.round(h), tur === 'ezme' ? '#ff6b6b' : '#ffffff', h >= 30 ? 20 : 14);
  if (z.can <= 0) zombiOldu(z);
}
function zombiOldu(z) {
  if (z.olu) return;
  z.olu = true;
  pof(z); Ses.cal('pof');
  if (z.tip !== 'boss') O.oldurulen++;
  // altın düşür
  const adet = z.tip === 'boss' ? 18 : (z.tip === 'sisko' ? 3 : 1);
  for (let i = 0; i < adet; i++) {
    O.toplanacak.push({ x: z.x + rand(-10, 10), y: z.y + rand(-10, 10), vx: rand(-2.5, 2.5), vy: rand(-2.5, 2.5), tip: 'para', deger: Math.max(1, Math.round(z.para / adet)), omur: 900, faz: Math.random() * 6 });
  }
  // bazen tamir kiti veya nitro düşer
  const r = Math.random();
  if (z.tip === 'boss' || r < 0.035) O.toplanacak.push({ x: z.x, y: z.y, vx: rand(-1, 1), vy: rand(-1, 1), tip: 'can', omur: 900, faz: 0 });
  else if (r < 0.08) O.toplanacak.push({ x: z.x, y: z.y, vx: rand(-1, 1), vy: rand(-1, 1), tip: 'nitro', omur: 900, faz: 0 });
  // kombo
  O.kombo++; O.komboSure = 100;
  if (O.kombo >= 5 && O.kombo % 5 === 0) {
    yaziEkle(O.P.x, O.P.y - 50, 'KOMBO x' + O.kombo + '!', '#ffd84d', 26);
    O.para += O.kombo;
    if (Math.random() < 0.5) selimKonus(pick(SOZ_KOMBO));
  }
  if (z.tip === 'patlayan') patla(z.x, z.y, 85, z.hasar, true);
  if (z.tip === 'boss') {
    O.boss = null;
    patla(z.x, z.y, 160, 0, false);
    O.sarsinti = 22;
    if (O.ayar.bossVar) bolumBitti(true);
  }
}
// Tükürücü zombinin uzaktan attığı yapışkan
function tukur(z) {
  const P = O.P, ac = Math.atan2(P.y - z.y, P.x - z.x);
  O.dmermiler.push({ x: z.x + Math.cos(ac) * z.boy, y: z.y + Math.sin(ac) * z.boy, vx: Math.cos(ac) * 4.5, vy: Math.sin(ac) * 4.5, omur: 110, hasar: z.hasar, r: 6 });
  Ses.cal('tukur');
}
// Boss davranışı: hücum, yardım çağırma, çevreye tükürme
function bossDavranis(z, dt) {
  z.bossSayac -= dt;
  if (z.hucum > 0) {
    z.hucum -= dt;
    if (Math.random() < 0.3) parcacik(z.x, z.y, rand(-1, 1), rand(-1, 1), 30, 'rgba(120,100,80,.5)', 14, 1);
    return z.hiz * 3.3;
  }
  if (z.bossSayac <= 0) {
    z.bossFaz = (z.bossFaz + 1) % 3;
    if (z.bossFaz === 0) {
      z.hucum = 60; yaziEkle(z.x, z.y - z.boy - 10, 'HÜCUM!', '#ff5252', 24); Ses.cal('boss');
    } else if (z.bossFaz === 1) {
      const n = 4 + Math.floor(O.ayar.n / 6);
      for (let i = 0; i < n; i++) {
        const ac = i / n * Math.PI * 2, x = z.x + Math.cos(ac) * 85, y = z.y + Math.sin(ac) * 85;
        if (!engelBul(x, y, 16)) zombiEkle(Math.random() < 0.5 ? 'normal' : 'kosucu', x, y);
      }
      yaziEkle(z.x, z.y - z.boy - 10, 'Yardım çağırdı!', '#b2ff59', 18);
    } else {
      for (let i = 0; i < 12; i++) {
        const ac = i / 12 * Math.PI * 2;
        O.dmermiler.push({ x: z.x, y: z.y, vx: Math.cos(ac) * 4.2, vy: Math.sin(ac) * 4.2, omur: 120, hasar: z.hasar * 0.6, r: 8 });
      }
      Ses.cal('tukur');
    }
    z.bossSayac = 210;
  }
  return z.hiz;
}
function bossCikar() {
  O.bossCikti = true;
  const P = O.P;
  let z = null;
  for (let i = 0; i < 20 && !z; i++) {
    const ac = Math.random() * Math.PI * 2;
    const x = clamp(P.x + Math.cos(ac) * 520, 80, O.harita.W - 80), y = clamp(P.y + Math.sin(ac) * 520, 80, O.harita.H - 80);
    if (!engelBul(x, y, 55)) z = zombiEkle('boss', x, y);
  }
  if (!z) zombiEkle('boss', clamp(P.x + 400, 80, O.harita.W - 80), P.y);
  banner('BOSS GELDİ!', O.ayar.d.boss);
  Ses.cal('boss');
  selimKonus('Bu koca zombi de ne?!');
}

// ================= OYUNCU =================
function oyuncuHasar(h) {
  if (O.bitti) return;
  const P = O.P;
  P.can -= h; P.flas = 8;
  O.sarsinti = Math.max(O.sarsinti, 4);
  Ses.cal('hasar');
  if (P.can <= 0) { P.can = 0; bolumBitti(false); }
  else if (P.can < P.maxCan * 0.3 && !O.dusukUyari) { O.dusukUyari = true; selimKonus('Arabam çok hasar aldı!'); }
}
function topla(t) {
  const P = O.P;
  if (t.tip === 'para') { O.para += t.deger; Ses.cal('para'); }
  else if (t.tip === 'can') {
    P.can = Math.min(P.maxCan, P.can + P.maxCan * 0.3);
    if (P.can > P.maxCan * 0.3) O.dusukUyari = false;
    yaziEkle(P.x, P.y - 40, '+TAMİR', '#69f0ae', 20); Ses.cal('can'); selimKonus('Oh be, tamir oldu!');
  } else if (t.tip === 'nitro') {
    P.nitro = P.maxNitro; yaziEkle(P.x, P.y - 40, 'NİTRO DOLU!', '#40c4ff', 20); Ses.cal('can');
  }
}
function silahDegis(yon) {
  if (!O || O.bitti) return;
  const P = O.P, n = P.silahlar.length;
  if (n < 2) { yaziEkle(P.x, P.y - 40, 'Dükkandan yeni silah al!', '#fff', 14); return; }
  P.silahIdx = (P.silahIdx + yon + n) % n;
  P.atesSayac = Math.max(P.atesSayac, 8);
  silahHudCiz();
  Ses.cal('tik');
  yaziEkle(P.x, P.y - 40, SILAH_HARITA[P.silahlar[P.silahIdx]].ad, '#ffffff', 16);
}

// ================= ATEŞ ETME =================
function atesEt(s, tx, ty) {
  const P = O.P;
  const uc = 6 + s.g.uz + (s.g.roket ? 6 : 0); // namlu ucu uzaklığı
  const mx = tx + Math.cos(P.tAci) * uc, my = ty + Math.sin(P.tAci) * uc;
  // namlu ateşi
  for (let i = 0; i < 3; i++) parcacik(mx, my, Math.cos(P.tAci) * rand(1, 3) + rand(-0.5, 0.5), Math.sin(P.tAci) * rand(1, 3) + rand(-0.5, 0.5), 6, s.tur === 'buz' ? '#e0f7fa' : '#fff59d', 4, 0);
  if (s.tur === 'simsek') { simsekAt(s, mx, my); Ses.cal('simsek'); return; }
  for (let i = 0; i < s.sayi; i++) {
    const ac = P.tAci + (Math.random() - 0.5) * s.sacilma * 2;
    const v = s.mermiHiz * (s.tur === 'alev' ? rand(0.8, 1.2) : 1) * (s.sayi > 1 ? rand(0.85, 1.1) : 1);
    const omur = s.menzil / v;
    O.mermiler.push({
      x: mx, y: my, vx: Math.cos(ac) * v + P.vx * 0.4, vy: Math.sin(ac) * v + P.vy * 0.4,
      hasar: s.hasar, tur: s.tur, omur, max: omur, renk: s.renk, alan: s.alan || 0,
      r: s.tur === 'alev' ? 6 : (s.tur === 'roket' ? 6 : 4),
      vurulan: (s.tur === 'alev' || s.tur === 'lazer') ? new Set() : null,
      delme: s.tur === 'lazer' ? 6 : 0
    });
  }
  const sesAdi = { mermi: s.sayi > 1 ? 'pompali' : 'ates', buz: 'buz', alev: 'alev', roket: 'roket', lazer: 'lazer' }[s.tur];
  Ses.cal(sesAdi);
  if (s.tur === 'roket' || s.sayi > 1) O.sarsinti = Math.max(O.sarsinti, 3);
}
// Yıldırım: en yakın zombiden diğerlerine sıçrar
function simsekAt(s, mx, my) {
  const noktalar = [[mx, my]], vurulan = new Set();
  let hedef = enYakinZombi(mx, my, s.menzil), hasar = s.hasar, sayac = 0;
  if (!hedef) noktalar.push([mx + Math.cos(O.P.tAci) * 120, my + Math.sin(O.P.tAci) * 120]);
  while (hedef && sayac < 5) {
    vurulan.add(hedef);
    noktalar.push([hedef.x, hedef.y]);
    const hx = hedef.x, hy = hedef.y;
    zombiHasar(hedef, hasar, hx - mx, hy - my, 'simsek');
    hasar *= 0.8; sayac++;
    hedef = enYakinZombi(hx, hy, 170, vurulan);
  }
  O.simsekler.push({ noktalar, omur: 10 });
}

// ================= BÖLÜM BAŞLAT / BİTİR =================
function oyunBaslat(n) {
  Ses.baslat();
  const ayar = bolumAyar(n);
  const harita = haritaOlustur(ayar);
  const a = arabaStat(K.araba);
  const sahip = SILAHLAR.filter(s => K.silahlar[s.id]).map(s => s.id);
  const P = {
    x: harita.W / 2, y: harita.H / 2, vx: 0, vy: 0, aci: -Math.PI / 2, tAci: -Math.PI / 2, hiz: 0,
    can: a.can, maxCan: a.can, nitro: a.nitro, maxNitro: a.nitro, nitroAktif: false,
    atesSayac: 0, flas: 0, silahlar: sahip, silahIdx: Math.max(0, sahip.indexOf(K.silah))
  };
  O = {
    ayar, harita, a, P,
    zombiler: [], mermiler: [], dmermiler: [], parcaciklar: [], yazilar: [], toplanacak: [], simsekler: [], halkalar: [],
    oldurulen: 0, para: 0, spawnSayac: 50, boss: null, bossCikti: false,
    bitti: false, bitisSayac: 0, kazandi: false, sonucGosterildi: false,
    kombo: 0, komboSure: 0, sarsinti: 0, kam: { x: 0, y: 0 }, zaman: 0,
    hedefZombi: null, hedefSayac: 0, konusma: null, duraklat: false,
    dusukUyari: false, lavSayac: 0, engelSil: false
  };
  O.kam.x = P.x - VW / ZOOM / 2; O.kam.y = P.y - VH / ZOOM / 2;
  // girdileri sıfırla
  G.joy.aktif = false; G.joy.vx = G.joy.vy = 0; G.dok = null; G.fare.basili = false; G.nitroBas = false;
  overlayKapat();
  ekranGoster('oyun');
  silahHudCiz();
  $('#bolumAd').textContent = `Bölüm ${n} · ${ayar.d.ad}`;
  const ipucu = n === 1
    ? (DOKUNMATIK ? 'Sol tarafa dokunup sürükle, Selim otomatik ateş eder!' : 'WASD ile sür, Selim otomatik ateş eder!')
    : (ayar.bossVar ? `${ayar.hedef} zombi, sonra BOSS: ${ayar.d.boss}!` : `${ayar.hedef} zombiyi temizle!`);
  banner(`BÖLÜM ${n}`, ipucu);
  selimKonus(pick(SOZ_BASLA));
}
function bolumBitti(kazandi) {
  if (O.bitti) return;
  O.bitti = true; O.kazandi = kazandi; O.bitisSayac = 110;
  if (kazandi) {
    Ses.cal('kazan'); selimKonus('Kazandım! Yaşasın!');
    for (const z of O.zombiler) if (!z.olu) { z.olu = true; pof(z); } // kalan zombiler kaçar
  } else {
    Ses.cal('kaybet'); patla(O.P.x, O.P.y, 60, 0, false); selimKonus('Tekrar deneyeceğim!');
  }
}

// ================= HER KARE GÜNCELLEME =================
function guncelle(dt) {
  const P = O.P, a = O.a, H = O.harita, A = O.ayar;
  O.zaman += dt;

  // ---- 1) Girdi: hangi yöne gitmek istiyor? ----
  let ix = 0, iy = 0;
  if (!O.bitti) {
    const t = G.tus;
    if (t.KeyW || t.ArrowUp) iy -= 1;
    if (t.KeyS || t.ArrowDown) iy += 1;
    if (t.KeyA || t.ArrowLeft) ix -= 1;
    if (t.KeyD || t.ArrowRight) ix += 1;
    if (G.joy.aktif) { ix += G.joy.vx; iy += G.joy.vy; }
  }
  let m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; m = 1; }

  // ---- 2) Nitro ----
  const nitroIstek = (G.tus.Space || G.nitroBas) && !O.bitti;
  P.nitroAktif = nitroIstek && P.nitro > 1 && m > 0.1;
  if (P.nitroAktif) P.nitro = Math.max(0, P.nitro - 0.55 * dt);
  else P.nitro = Math.min(P.maxNitro, P.nitro + 0.08 * dt);

  // ---- 3) Araba fiziği (çocuk dostu: araba joystick yönüne döner) ----
  const maksHiz = a.hiz * (P.nitroAktif ? 1.65 : 1);
  if (m > 0.12) {
    const hedefAci = Math.atan2(iy, ix);
    const fark = aciFarki(P.aci, hedefAci);
    const donus = a.donus * dt * 1.4;
    P.aci += clamp(fark, -donus, donus);
    const hedefHiz = maksHiz * m * (1 - Math.min(0.55, Math.abs(fark) / Math.PI * 0.7)); // keskin virajda yavaşla
    P.hiz += (hedefHiz - P.hiz) * Math.min(1, 0.07 * dt);
  } else {
    P.hiz *= Math.pow(0.93, dt);
  }
  const tutus = Math.min(1, 0.2 * A.d.kayma * dt); // karda kayar!
  P.vx += (Math.cos(P.aci) * P.hiz - P.vx) * tutus;
  P.vy += (Math.sin(P.aci) * P.hiz - P.vy) * tutus;
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (P.x < a.r) { P.x = a.r; P.vx = Math.abs(P.vx) * 0.3; }
  if (P.y < a.r) { P.y = a.r; P.vy = Math.abs(P.vy) * 0.3; }
  if (P.x > H.W - a.r) { P.x = H.W - a.r; P.vx = -Math.abs(P.vx) * 0.3; }
  if (P.y > H.H - a.r) { P.y = H.H - a.r; P.vy = -Math.abs(P.vy) * 0.3; }
  if (engelItme(P, a.r)) P.hiz *= Math.pow(0.85, dt);
  const hizBuyuk = Math.hypot(P.vx, P.vy);

  // egzoz dumanı, nitro alevi, toz
  const arkaX = P.x - Math.cos(P.aci) * a.def.L / 2, arkaY = P.y - Math.sin(P.aci) * a.def.L / 2;
  if (P.nitroAktif) {
    for (let i = 0; i < 2; i++) parcacik(arkaX + rand(-4, 4), arkaY + rand(-4, 4), -Math.cos(P.aci) * rand(2, 4), -Math.sin(P.aci) * rand(2, 4), rand(10, 18), pick(['#40c4ff', '#ffeb3b', '#ff9100']), rand(4, 7), 0);
  } else if (hizBuyuk > 1 && Math.random() < 0.25 * dt) {
    const tozRenk = A.d.tip === 'col' ? 'rgba(210,180,120,.5)' : A.d.tip === 'kar' ? 'rgba(255,255,255,.7)' : 'rgba(160,160,160,.35)';
    parcacik(arkaX, arkaY, rand(-0.3, 0.3), rand(-0.3, 0.3), rand(25, 40), tozRenk, rand(4, 7), 1);
  }

  // Lav gölleri: üstüne girince yanar
  if (H.lav.length) {
    O.lavSayac -= dt;
    for (const l of H.lav) {
      if (Math.hypot(P.x - l.x, P.y - l.y) < l.r * 0.85 && O.lavSayac <= 0 && !O.bitti) {
        O.lavSayac = 20; oyuncuHasar(4);
        parcacik(P.x, P.y, rand(-1, 1), -2, 20, '#ff6d00', 6, 0);
        if (Math.random() < 0.3) selimKonus('Ayy, çok sıcak!');
      }
    }
  }

  // ---- 4) Silah: nişan al ve ateş et ----
  const s = silahStat(P.silahlar[P.silahIdx]);
  const tx = P.x + Math.cos(P.aci) * a.def.selimX, ty = P.y + Math.sin(P.aci) * a.def.selimX;
  let nx = null, ny = null, manuel = false;
  if (!O.bitti) {
    if (G.fare.basili) { const w = ekrandanDunya(G.fare.x, G.fare.y); nx = w.x; ny = w.y; manuel = true; }
    else if (G.dok) { const w = ekrandanDunya(G.dok.x, G.dok.y); nx = w.x; ny = w.y; manuel = true; }
    else {
      // otomatik nişan: menzildeki en yakın zombi
      O.hedefSayac -= dt;
      let h = O.hedefZombi;
      if (O.hedefSayac <= 0 || !h || h.olu || (h.x - tx) ** 2 + (h.y - ty) ** 2 > s.menzil * s.menzil) {
        h = O.hedefZombi = enYakinZombi(tx, ty, s.menzil); O.hedefSayac = 8;
      }
      if (h) { // hedefin hareketini tahmin ederek önüne nişan al
        const t = s.mermiHiz > 0 ? Math.hypot(h.x - tx, h.y - ty) / s.mermiHiz : 0;
        nx = h.x + h.vx * t; ny = h.y + h.vy * t;
      }
    }
  }
  if (nx !== null) {
    const hedefA = Math.atan2(ny - ty, nx - tx);
    P.tAci += clamp(aciFarki(P.tAci, hedefA), -0.35 * dt, 0.35 * dt);
  } else {
    P.tAci += aciFarki(P.tAci, P.aci) * Math.min(1, 0.08 * dt);
  }
  P.atesSayac -= dt;
  if (nx !== null && P.atesSayac <= 0) {
    const kalanFark = Math.abs(aciFarki(P.tAci, Math.atan2(ny - ty, nx - tx)));
    if (manuel || kalanFark < 0.45) { atesEt(s, tx, ty); P.atesSayac = s.aralik; }
  }
  if (P.flas > 0) P.flas -= dt;

  // ---- 5) Mermiler ----
  for (const mr of O.mermiler) {
    if (mr.tur === 'roket') {
      const hz = Math.hypot(mr.vx, mr.vy);
      if (hz < 15) { mr.vx *= 1 + 0.04 * dt; mr.vy *= 1 + 0.04 * dt; }
      if (Math.random() < 0.7) parcacik(mr.x, mr.y, rand(-0.3, 0.3), rand(-0.3, 0.3), 25, 'rgba(200,200,200,.5)', 5, 1);
    }
    if (mr.tur === 'alev') { mr.vx *= Math.pow(0.97, dt); mr.vy *= Math.pow(0.97, dt); mr.r = 6 + (1 - mr.omur / mr.max) * 16; }
    mr.x += mr.vx * dt; mr.y += mr.vy * dt; mr.omur -= dt;
    if (mr.omur <= 0) { if (mr.tur === 'roket') patla(mr.x, mr.y, mr.alan, mr.hasar, false); mr.sil = true; continue; }
    // engele çarptı mı?
    const e = engelBul(mr.x, mr.y, mr.tur === 'alev' ? 2 : 1);
    if (e) {
      if (e.patlayici && mr.tur !== 'alev') { e.can -= mr.hasar; if (e.can <= 0) varilPatlat(e); }
      if (mr.tur === 'roket') patla(mr.x, mr.y, mr.alan, mr.hasar, false);
      else for (let i = 0; i < 3; i++) parcacik(mr.x, mr.y, rand(-2, 2), rand(-2, 2), 10, mr.renk, 2.5, 0);
      mr.sil = true; continue;
    }
    // zombiye çarptı mı?
    for (const z of O.zombiler) {
      if (z.olu || (mr.vurulan && mr.vurulan.has(z))) continue;
      const rr_ = z.boy + mr.r;
      if ((z.x - mr.x) ** 2 + (z.y - mr.y) ** 2 < rr_ * rr_) {
        if (mr.tur === 'roket') { patla(mr.x, mr.y, mr.alan, mr.hasar, false); mr.sil = true; break; }
        zombiHasar(z, mr.hasar, mr.vx, mr.vy, mr.tur);
        if (mr.tur === 'buz') { z.yavas = 110; for (let i = 0; i < 4; i++) parcacik(z.x, z.y, rand(-2, 2), rand(-2, 2), 18, '#e0f7fa', 3, 0); }
        if (mr.tur === 'alev') { z.yanma = 100; mr.vurulan.add(z); continue; }
        if (mr.tur === 'lazer') { mr.vurulan.add(z); mr.delme--; if (mr.delme <= 0) { mr.sil = true; break; } continue; }
        mr.sil = true; break;
      }
    }
  }
  O.mermiler = O.mermiler.filter(mr => !mr.sil);

  // ---- 6) Zombiler ----
  for (const z of O.zombiler) {
    if (z.olu) continue;
    if (z.flas > 0) z.flas -= dt;
    if (z.yavas > 0) z.yavas -= dt;
    if (z.ramSayac > 0) z.ramSayac -= dt;
    if (z.isirSayac > 0) z.isirSayac -= dt;
    if (z.yanma > 0) {
      z.yanma -= dt; z.can -= 0.3 * dt;
      if (z.can <= 0) { zombiOldu(z); continue; }
    }
    const dx = P.x - z.x, dy = P.y - z.y, d = Math.hypot(dx, dy) || 1;
    // çok uzakta kalan zombiyi oyuncunun yakınına taşı
    if (d > 1500 && z.tip !== 'boss') {
      const ac = Math.random() * Math.PI * 2, rr_ = Math.hypot(VW, VH) / ZOOM / 2 + 80;
      const yx = clamp(P.x + Math.cos(ac) * rr_, 30, H.W - 30), yy = clamp(P.y + Math.sin(ac) * rr_, 30, H.H - 30);
      if (!engelBul(yx, yy, 30)) { z.x = yx; z.y = yy; }
      continue;
    }
    let hiz = z.hiz * (z.yavas > 0 ? 0.4 : 1);
    if (O.bitti) hiz = 0;
    if (z.tip === 'tukurucu' && d < 330 && !O.bitti) {
      if (d > 150) hiz *= 0.25;
      z.tukSayac -= dt;
      if (z.tukSayac <= 0) { z.tukSayac = 120; tukur(z); }
    }
    if (z.tip === 'boss' && !O.bitti) hiz = bossDavranis(z, dt) * (z.yavas > 0 ? 0.7 : 1);
    // hareket yönü (engele takılınca yana sapar)
    let yx = dx / d, yy = dy / d;
    if (z.takil > 0) {
      z.takil -= dt;
      const c = Math.cos(z.takilYon), sn = Math.sin(z.takilYon);
      const ax = yx * c - yy * sn, ay = yx * sn + yy * c; yx = ax; yy = ay;
    }
    z.vx = yx * hiz; z.vy = yy * hiz;
    z.x += (z.vx + z.itx) * dt; z.y += (z.vy + z.ity) * dt;
    z.itx *= Math.pow(0.82, dt); z.ity *= Math.pow(0.82, dt);
    if (engelItme(z, z.boy) && z.takil <= 0) { z.takil = 40; z.takilYon = (Math.random() < 0.5 ? -1 : 1) * 1.1; }
    z.x = clamp(z.x, z.boy, H.W - z.boy); z.y = clamp(z.y, z.boy, H.H - z.boy);
    z.yon += aciFarki(z.yon, Math.atan2(yy, yx)) * Math.min(1, 0.15 * dt);
    z.adim += (hiz + 0.3) * dt * 0.18;
    // yanan zombi lav dışında; lavdaki zombi de yanar
    for (const l of H.lav) if (Math.hypot(z.x - l.x, z.y - l.y) < l.r * 0.8) z.yanma = Math.max(z.yanma, 30);
    // arabaya temas
    const rr_ = z.boy + a.r;
    if (d < rr_ && !O.bitti) {
      if (z.tip === 'patlayan') { zombiOldu(z); continue; }
      const it = rr_ - d; z.x -= dx / d * it; z.y -= dy / d * it;
      if (hizBuyuk > 2.3 && z.ramSayac <= 0) {
        // EZME! hızla çarpınca zombiye hasar
        const hsr = a.carpma * clamp(hizBuyuk / a.hiz, 0.4, 1.6) * (P.nitroAktif ? 1.5 : 1);
        zombiHasar(z, hsr, P.vx, P.vy, 'ezme');
        z.ramSayac = 16; Ses.cal('ezme');
        oyuncuHasar(z.hasar * (z.tip === 'boss' ? 0.8 : 0.2));
        if (z.tip === 'boss') { P.vx *= -0.6; P.vy *= -0.6; P.hiz *= -0.4; } else P.hiz *= 0.9;
      } else if (z.isirSayac <= 0) {
        oyuncuHasar(z.hasar); z.isirSayac = 50; // ısırma
      }
    }
  }
  // zombiler birbirinin içine girmesin
  const zs = O.zombiler;
  for (let i = 0; i < zs.length; i++) {
    const z1 = zs[i]; if (z1.olu) continue;
    for (let j = i + 1; j < zs.length; j++) {
      const z2 = zs[j]; if (z2.olu) continue;
      const dx = z2.x - z1.x, dy = z2.y - z1.y, rr_ = z1.boy + z2.boy;
      if (Math.abs(dx) > rr_ || Math.abs(dy) > rr_) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr_ * rr_ && d2 > 0.01) {
        const d = Math.sqrt(d2), it = (rr_ - d) / 2;
        const k1 = z1.tip === 'boss' ? 0.1 : 1, k2 = z2.tip === 'boss' ? 0.1 : 1;
        z1.x -= dx / d * it * k1; z1.y -= dy / d * it * k1;
        z2.x += dx / d * it * k2; z2.y += dy / d * it * k2;
      }
    }
  }
  O.zombiler = O.zombiler.filter(z => !z.olu);
  if (O.engelSil) { H.eng = H.eng.filter(e => !e.sil); O.engelSil = false; }

  // ---- 7) Zombi doğurma ve kazanma kontrolü ----
  if (!O.bitti) {
    O.spawnSayac -= dt;
    if (O.spawnSayac <= 0) {
      O.spawnSayac = A.aralik * rand(0.7, 1.3) * (O.bossCikti ? 1.6 : 1);
      if (O.zombiler.length < A.maksAktif) {
        const adet = 1 + Math.floor(A.n / 8);
        for (let i = 0; i < adet; i++) zombiDogur();
      }
    }
    if (!A.bossVar && O.oldurulen >= A.hedef) bolumBitti(true);
    if (A.bossVar && !O.bossCikti && O.oldurulen >= A.hedef) bossCikar();
  }

  // ---- 8) Düşman mermileri ----
  for (const dm of O.dmermiler) {
    dm.x += dm.vx * dt; dm.y += dm.vy * dt; dm.omur -= dt;
    if (dm.omur <= 0 || engelBul(dm.x, dm.y, 2)) { dm.sil = true; continue; }
    if (!O.bitti && Math.hypot(dm.x - P.x, dm.y - P.y) < a.r + dm.r) {
      oyuncuHasar(dm.hasar); dm.sil = true;
      for (let i = 0; i < 6; i++) parcacik(dm.x, dm.y, rand(-2, 2), rand(-2, 2), 16, '#b2ff59', 4, 0);
    }
  }
  O.dmermiler = O.dmermiler.filter(dm => !dm.sil);

  // ---- 9) Toplanacak eşyalar (mıknatıs gibi çekilir) ----
  for (const t of O.toplanacak) {
    t.omur -= dt; t.faz += 0.1 * dt;
    t.x += t.vx * dt; t.y += t.vy * dt;
    t.vx *= Math.pow(0.9, dt); t.vy *= Math.pow(0.9, dt);
    const dx = P.x - t.x, dy = P.y - t.y, d = Math.hypot(dx, dy) || 1;
    if (d < 150 && !O.bitti) { const k = (1 - d / 150) * 7 + 1.5; t.x += dx / d * k * dt; t.y += dy / d * k * dt; }
    if (d < a.r + 10 && !O.bitti) { topla(t); t.sil = true; }
    if (t.omur <= 0) t.sil = true;
  }
  O.toplanacak = O.toplanacak.filter(t => !t.sil);

  // ---- 10) Efektler ----
  for (const p of O.parcaciklar) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.94, dt); p.vy *= Math.pow(0.94, dt); p.omur -= dt; }
  O.parcaciklar = O.parcaciklar.filter(p => p.omur > 0);
  for (const y of O.yazilar) { y.y -= 0.6 * dt; y.omur -= dt; }
  O.yazilar = O.yazilar.filter(y => y.omur > 0);
  for (const s2 of O.simsekler) s2.omur -= dt;
  O.simsekler = O.simsekler.filter(s2 => s2.omur > 0);
  for (const h of O.halkalar) { h.omur -= dt; h.r = h.max * (1 - h.omur / h.maxOmur); }
  O.halkalar = O.halkalar.filter(h => h.omur > 0);
  if (O.konusma) { O.konusma.omur -= dt; if (O.konusma.omur <= 0) O.konusma = null; }
  O.sarsinti *= Math.pow(0.85, dt); if (O.sarsinti < 0.2) O.sarsinti = 0;
  if (O.komboSure > 0) { O.komboSure -= dt; if (O.komboSure <= 0) O.kombo = 0; }

  // ---- 11) Kamera (arabanın gittiği yöne biraz önden bakar) ----
  const kw = VW / ZOOM, kh = VH / ZOOM;
  const hx = P.x + P.vx * 14 - kw / 2, hy = P.y + P.vy * 14 - kh / 2;
  O.kam.x += (hx - O.kam.x) * Math.min(1, 0.12 * dt);
  O.kam.y += (hy - O.kam.y) * Math.min(1, 0.12 * dt);

  // ---- 12) Bölüm sonu ----
  if (O.bitti && !O.sonucGosterildi) {
    O.bitisSayac -= dt;
    if (O.bitisSayac <= 0) { O.sonucGosterildi = true; sonucGoster(); }
  }
}

// ================= ÇİZİM =================
let GOR = { x0: 0, y0: 0, x1: 0, y1: 0 };
const gorunur = (x, y, m) => x > GOR.x0 - m && x < GOR.x1 + m && y > GOR.y0 - m && y < GOR.y1 + m;

function ciz() {
  const ctx = cx, P = O.P, H = O.harita, d = O.ayar.d;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, tuval.width, tuval.height);
  const sx = (Math.random() - 0.5) * O.sarsinti, sy = (Math.random() - 0.5) * O.sarsinti;
  const s = DPR * ZOOM;
  ctx.setTransform(s, 0, 0, s, (-O.kam.x + sx) * s, (-O.kam.y + sy) * s);
  GOR = { x0: O.kam.x, y0: O.kam.y, x1: O.kam.x + VW / ZOOM, y1: O.kam.y + VH / ZOOM };

  // --- zemin ---
  ctx.fillStyle = tonla(d.zemin, -0.45); ctx.fillRect(GOR.x0 - 60, GOR.y0 - 60, GOR.x1 - GOR.x0 + 120, GOR.y1 - GOR.y0 + 120);
  ctx.fillStyle = d.zemin; ctx.fillRect(0, 0, H.W, H.H);
  ctx.fillStyle = d.zemin2;
  for (const l of H.lekeler) if (gorunur(l.x, l.y, l.r)) daire(ctx, l.x, l.y, l.r);
  if (d.tip === 'sehir') { // yol şeritleri
    ctx.strokeStyle = 'rgba(255,214,64,.55)'; ctx.lineWidth = 5; ctx.setLineDash([34, 30]);
    ctx.beginPath();
    const ys = Math.max(0, Math.floor(GOR.y0 / 64) * 64), xs = Math.max(0, Math.floor(GOR.x0 / 64) * 64);
    for (let k = 0; k <= H.W; k += 420) if (k > GOR.x0 - 10 && k < GOR.x1 + 10) { ctx.moveTo(k, ys); ctx.lineTo(k, Math.min(H.H, GOR.y1)); }
    for (let k = 0; k <= H.H; k += 420) if (k > GOR.y0 - 10 && k < GOR.y1 + 10) { ctx.moveTo(xs, k); ctx.lineTo(Math.min(H.W, GOR.x1), k); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  for (const su of H.sus) if (gorunur(su.x, su.y, 25)) susCiz(ctx, su, d.tip);
  for (const l of H.lav) if (gorunur(l.x, l.y, l.r + 10)) lavCiz(ctx, l, O.zaman);
  ctx.strokeStyle = tonla(d.zemin, -0.6); ctx.lineWidth = 12; ctx.strokeRect(-6, -6, H.W + 12, H.H + 12); // harita sınırı

  // --- engeller ---
  for (const e of H.eng) {
    if (e.tip === 'kutu' ? !(e.x + e.w > GOR.x0 - 30 && e.x < GOR.x1 + 30 && e.y + e.h > GOR.y0 - 30 && e.y < GOR.y1 + 30) : !gorunur(e.x, e.y, e.r + 15)) continue;
    engelCiz(ctx, e, d.tip);
  }

  // --- toplanacaklar ---
  for (const t of O.toplanacak) {
    if (!gorunur(t.x, t.y, 20)) continue;
    const zip = Math.sin(t.faz) * 2;
    if (t.omur < 120 && Math.floor(t.omur / 6) % 2) continue; // kaybolmadan önce yanıp söner
    if (t.tip === 'para') {
      ctx.fillStyle = '#b07700'; daire(ctx, t.x, t.y + zip + 1.5, 7);
      ctx.fillStyle = '#ffc928'; daire(ctx, t.x, t.y + zip, 7);
      ctx.fillStyle = '#fff6b0'; daire(ctx, t.x - 2, t.y + zip - 2, 2.5);
    } else if (t.tip === 'can') {
      ctx.fillStyle = '#fff'; rr(ctx, t.x - 11, t.y - 11 + zip, 22, 22, 5); ctx.fill();
      ctx.fillStyle = '#e53935'; ctx.fillRect(t.x - 3, t.y - 8 + zip, 6, 16); ctx.fillRect(t.x - 8, t.y - 3 + zip, 16, 6);
    } else {
      ctx.fillStyle = '#1565c0'; rr(ctx, t.x - 8, t.y - 12 + zip, 16, 24, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', t.x, t.y + zip + 1);
    }
  }

  // --- zombiler ---
  for (const z of O.zombiler) if (gorunur(z.x, z.y, z.boy * 2)) zombiCiz(ctx, z);

  // --- oyuncu arabası ---
  if (!(O.bitti && !O.kazandi)) {
    ctx.save(); ctx.translate(P.x, P.y);
    arabaCiz(ctx, O.a.def, O.a.oz, P.aci, P.tAci, SILAH_HARITA[P.silahlar[P.silahIdx]].g, O.zaman, P.flas);
    ctx.restore();
  }

  // --- düşman mermileri ---
  for (const dm of O.dmermiler) {
    ctx.fillStyle = '#7cb342'; daire(ctx, dm.x, dm.y, dm.r);
    ctx.fillStyle = '#ccff90'; daire(ctx, dm.x - 1.5, dm.y - 1.5, dm.r * 0.45);
  }

  // --- oyuncu mermileri ---
  ctx.lineCap = 'round';
  for (const mr of O.mermiler) {
    if (!gorunur(mr.x, mr.y, 30)) continue;
    if (mr.tur === 'alev') continue; // alevler aşağıda parlak çizilir
    if (mr.tur === 'lazer') {
      ctx.strokeStyle = 'rgba(64,196,255,.55)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(mr.x - mr.vx * 1.6, mr.y - mr.vy * 1.6); ctx.lineTo(mr.x, mr.y); ctx.stroke();
      ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 3; ctx.stroke();
    } else if (mr.tur === 'roket') {
      ctx.save(); ctx.translate(mr.x, mr.y); ctx.rotate(Math.atan2(mr.vy, mr.vx));
      ctx.fillStyle = '#ff9100'; daire(ctx, -9, 0, 4 + Math.random() * 2);
      ctx.fillStyle = '#558b2f'; rr(ctx, -8, -3.5, 14, 7, 3); ctx.fill();
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(11, 0); ctx.lineTo(6, 3.5); ctx.fill();
      ctx.restore();
    } else if (mr.tur === 'buz') {
      ctx.fillStyle = '#80deea'; daire(ctx, mr.x, mr.y, 5); ctx.fillStyle = '#fff'; daire(ctx, mr.x, mr.y, 2.5);
    } else {
      ctx.strokeStyle = mr.renk; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(mr.x - mr.vx * 0.8, mr.y - mr.vy * 0.8); ctx.lineTo(mr.x, mr.y); ctx.stroke();
    }
  }
  // parlak efektler (alev, şimşek, kıvılcım)
  ctx.globalCompositeOperation = 'lighter';
  for (const mr of O.mermiler) {
    if (mr.tur !== 'alev' || !gorunur(mr.x, mr.y, 30)) continue;
    const k = mr.omur / mr.max;
    ctx.fillStyle = `rgba(255,${Math.round(80 + k * 150)},${Math.round(k * 40)},${0.25 + k * 0.35})`;
    daire(ctx, mr.x, mr.y, mr.r);
  }
  for (const sm of O.simsekler) {
    ctx.strokeStyle = `rgba(206,147,216,${sm.omur / 10})`; ctx.lineWidth = 6;
    simsekYol(ctx, sm.noktalar); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${sm.omur / 10})`; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // --- parçacıklar ---
  for (const p of O.parcaciklar) {
    if (!gorunur(p.x, p.y, 20)) continue;
    const k = p.omur / p.max;
    ctx.globalAlpha = Math.min(1, k * 1.3);
    ctx.fillStyle = p.renk;
    if (p.tip === 3) { yildizYol(ctx, p.x, p.y, p.boy * 1.6); ctx.fill(); }
    else daire(ctx, p.x, p.y, p.tip === 1 ? p.boy * (1 + (1 - k) * 1.4) : Math.max(0.5, p.boy * k));
  }
  ctx.globalAlpha = 1;
  // patlama halkaları
  for (const h of O.halkalar) {
    ctx.strokeStyle = `rgba(255,236,179,${h.omur / h.maxOmur})`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke();
  }

  // ========= Ekran üstü çizimler (yakınlaştırmadan bağımsız) =========
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // uçan yazılar (hasar sayıları, kombo)
  for (const y of O.yazilar) {
    const p = dunyadanEkrana(y.x, y.y);
    ctx.globalAlpha = Math.min(1, y.omur / 20);
    ctx.font = `900 ${y.boy}px system-ui, sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(y.yazi, p.x, p.y);
    ctx.fillStyle = y.renk; ctx.fillText(y.yazi, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  // Selim'in konuşma balonu
  if (O.konusma && !(O.bitti && !O.kazandi && O.bitisSayac < 60)) {
    const p = dunyadanEkrana(P.x, P.y);
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(O.konusma.yazi).width + 22, h = 30;
    const bx = clamp(p.x - w / 2, 8, VW - w - 8), by = p.y - 40 * ZOOM - 46;
    ctx.globalAlpha = Math.min(1, O.konusma.omur / 20);
    ctx.fillStyle = '#fff'; rr(ctx, bx, by, w, h, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x - 6, by + h - 1); ctx.lineTo(p.x + 6, by + h - 1); ctx.lineTo(p.x, by + h + 9); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillText(O.konusma.yazi, bx + w / 2, by + h / 2 + 1);
    ctx.globalAlpha = 1;
  }
  // boss ekran dışındaysa yön oku
  if (O.boss) {
    const p = dunyadanEkrana(O.boss.x, O.boss.y);
    if (p.x < 0 || p.x > VW || p.y < 0 || p.y > VH) {
      const ac = Math.atan2(p.y - VH / 2, p.x - VW / 2);
      const ox = clamp(p.x, 40, VW - 40), oy = clamp(p.y, 110, VH - 40);
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(ac);
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = '900 12px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('BOSS', ox, oy + 22);
    }
  }
  // dokunmatik joystick
  if (DOKUNMATIK) {
    if (G.joy.aktif) {
      ctx.fillStyle = 'rgba(255,255,255,.12)'; daire(ctx, G.joy.bx, G.joy.by, 58);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(G.joy.bx, G.joy.by, 58, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; daire(ctx, G.joy.x, G.joy.y, 26);
    } else if (!O.bitti) {
      const jx = 90, jy = VH - 110;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; daire(ctx, jx, jy, 58);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; daire(ctx, jx, jy, 24);
      ctx.font = '900 12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillText('SÜR', jx, jy);
    }
  }
  // hasar alınca kırmızı parlama, düşük canda kırmızı kenarlar
  if (P.flas > 0) { ctx.fillStyle = `rgba(255,0,0,${P.flas / 60})`; ctx.fillRect(0, 0, VW, VH); }
  if (P.can / P.maxCan < 0.3 && !O.bitti) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.3, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${0.25 + Math.sin(O.zaman * 0.15) * 0.12})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}
// Şimşek için zikzaklı yol
function simsekYol(ctx, noktalar) {
  ctx.beginPath();
  ctx.moveTo(noktalar[0][0], noktalar[0][1]);
  for (let i = 1; i < noktalar.length; i++) {
    const [x0, y0] = noktalar[i - 1], [x1, y1] = noktalar[i];
    for (let k = 1; k <= 5; k++) {
      const t = k / 5;
      ctx.lineTo(x0 + (x1 - x0) * t + (k < 5 ? rand(-9, 9) : 0), y0 + (y1 - y0) * t + (k < 5 ? rand(-9, 9) : 0));
    }
  }
}

// ================= KLAVYE / FARE / DOKUNMATİK =================
window.addEventListener('keydown', e => {
  G.tus[e.code] = true;
  if (!O) return;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyQ') silahDegis(-1);
  if (e.code === 'KeyE') silahDegis(1);
  if (e.code === 'KeyP' || e.code === 'Escape') duraklatToggle();
  if (e.code.startsWith('Digit')) {
    const i = parseInt(e.code.slice(5), 10) - 1;
    if (i >= 0 && i < O.P.silahlar.length && i !== O.P.silahIdx) { O.P.silahIdx = i; silahDegis(0); }
  }
});
window.addEventListener('keyup', e => { G.tus[e.code] = false; });
window.addEventListener('blur', () => { G.tus = {}; G.fare.basili = false; G.nitroBas = false; });
tuval.addEventListener('mousedown', e => { Ses.baslat(); G.fare.basili = true; G.fare.x = e.clientX; G.fare.y = e.clientY; });
window.addEventListener('mouseup', () => { G.fare.basili = false; });
window.addEventListener('mousemove', e => { G.fare.x = e.clientX; G.fare.y = e.clientY; });
tuval.addEventListener('contextmenu', e => e.preventDefault());

// Dokunmatik: sol yarı = joystick, sağ yarı = nişan alma
tuval.addEventListener('touchstart', e => {
  e.preventDefault(); Ses.baslat();
  for (const t of e.changedTouches) {
    if (t.clientX < VW * 0.5 && !G.joy.aktif) {
      G.joy = { aktif: true, id: t.identifier, bx: t.clientX, by: t.clientY, x: t.clientX, y: t.clientY, vx: 0, vy: 0 };
    } else if (!G.dok) {
      G.dok = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });
tuval.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (G.joy.aktif && t.identifier === G.joy.id) {
      const maks = 55;
      let dx = t.clientX - G.joy.bx, dy = t.clientY - G.joy.by;
      const d = Math.hypot(dx, dy);
      if (d > maks) { // parmak çok uzaklaşırsa joystick parmağı takip eder
        G.joy.bx = t.clientX - dx / d * maks; G.joy.by = t.clientY - dy / d * maks;
        dx = t.clientX - G.joy.bx; dy = t.clientY - G.joy.by;
      }
      G.joy.x = t.clientX; G.joy.y = t.clientY;
      G.joy.vx = dx / maks; G.joy.vy = dy / maks;
    } else if (G.dok && t.identifier === G.dok.id) {
      G.dok.x = t.clientX; G.dok.y = t.clientY;
    }
  }
}, { passive: false });
function dokunmaBitti(e) {
  for (const t of e.changedTouches) {
    if (G.joy.aktif && t.identifier === G.joy.id) { G.joy.aktif = false; G.joy.vx = G.joy.vy = 0; }
    if (G.dok && t.identifier === G.dok.id) G.dok = null;
  }
}
tuval.addEventListener('touchend', dokunmaBitti);
tuval.addEventListener('touchcancel', dokunmaBitti);
