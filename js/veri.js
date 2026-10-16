'use strict';
/* =========================================================
   SELİM: ZOMBİ AVCISI  —  veri.js
   Yardımcı fonksiyonlar, oyun verileri (arabalar, silahlar,
   zombiler, dünyalar), kayıt sistemi ve ses efektleri.
   ========================================================= */

// ---------- Kısa yardımcı fonksiyonlar ----------
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// İki açı arasındaki en kısa farkı (-PI..PI) verir
function aciFarki(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Tohumlu rastgele sayı üreteci: aynı bölüm hep aynı haritayı üretir
function tohumluRastgele(t) {
  return function () {
    t |= 0; t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Renk yardımcıları (hex -> rgb, açma/koyulaştırma, parlaklık)
function hexRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function tonla(h, k) { // k > 0 açar, k < 0 koyulaştırır
  const [r, g, b] = hexRgb(h);
  const f = v => Math.round(clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function parlaklik(h) {
  const [r, g, b] = hexRgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Ekranda para ikonu ile miktar gösterir
const paraHtml = n => `<span class="coin"></span>${n}`;

// ---------- ARABALAR ----------
// hiz: azami hız, can: dayanıklılık, donus: dönüş çevikliği, carpma: ezme gücü
// L/W: uzunluk/genişlik (piksel), boya: varsayılan renk sırası
const ARABALAR = [
  { id: 'buggy',  ad: 'Kum Böceği',     aciklama: "Küçük, çevik ve ucuz. Selim'in ilk arabası!", fiyat: 0,     hiz: 5.0, can: 100, donus: 0.085, carpma: 18,  L: 50, W: 32, tip: 'buggy',  boya: 4 },
  { id: 'jip',    ad: 'Orman Jipi',     aciklama: 'Sağlam gövdeli arazi aracı.',                  fiyat: 700,   hiz: 5.3, can: 150, donus: 0.078, carpma: 28,  L: 58, W: 36, tip: 'jip',    boya: 2 },
  { id: 'spor',   ad: 'Şimşek Spor',    aciklama: 'Çok hızlı! Zombiler yetişemez.',               fiyat: 1800,  hiz: 7.0, can: 120, donus: 0.09,  carpma: 30,  L: 62, W: 32, tip: 'spor',   boya: 0 },
  { id: 'polis',  ad: 'Polis Arabası',  aciklama: 'Siren lambalı, zombileri devirir.',            fiyat: 3000,  hiz: 6.2, can: 190, donus: 0.082, carpma: 40,  L: 62, W: 34, tip: 'polis',  boya: 1 },
  { id: 'kamyon', ad: 'Canavar Kamyon', aciklama: 'Kocaman tekerlekler, ezer geçer!',             fiyat: 5500,  hiz: 5.6, can: 280, donus: 0.068, carpma: 75,  L: 66, W: 44, tip: 'kamyon', boya: 5 },
  { id: 'tank',   ad: 'Mini Tank',      aciklama: 'En güçlü zırh. Durdurulamaz!',                fiyat: 10000, hiz: 4.8, can: 450, donus: 0.062, carpma: 100, L: 64, W: 46, tip: 'tank',   boya: 2 }
];
const ARABA_HARITA = {};
ARABALAR.forEach(a => { a.selimX = -a.L * 0.14; ARABA_HARITA[a.id] = a; });

// Araba yükseltmeleri (her biri 5 seviye)
const YUKSELTMELER = [
  { id: 'motor',  ad: 'Motor',          aciklama: 'Daha yüksek hız',        taban: 120 },
  { id: 'zirh',   ad: 'Zırh',           aciklama: 'Daha fazla can',         taban: 150 },
  { id: 'tampon', ad: 'Dikenli Tampon', aciklama: 'Zombileri ezme gücü',    taban: 130 },
  { id: 'nitro',  ad: 'Nitro Tankı',    aciklama: 'Daha uzun nitro',        taban: 100 }
];
const MAKS_SEVIYE = 5;
const yukseltmeFiyat = (arabaFiyat, y, sev) => Math.round((y.taban + arabaFiyat * 0.08) * (sev + 1));

// Özelleştirme: boyalar, desenler, jant renkleri
const BOYALAR = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#212121', '#fafafa', '#00acc1', '#ec407a', '#6d4c41', '#c0ca33'];
const JANTLAR = ['#cfd8dc', '#212121', '#ffd600', '#e53935', '#1e88e5', '#76ff03'];
const DESENLER = [
  { ad: 'Düz', fiyat: 0 }, { ad: 'Şerit', fiyat: 150 }, { ad: 'Alev', fiyat: 300 },
  { ad: 'Yıldız', fiyat: 300 }, { ad: 'Damalı', fiyat: 400 }, { ad: 'Kaplan', fiyat: 500 }
];

// ---------- SİLAHLAR ----------
// hasar: mermi başı hasar, aralik: atışlar arası kare sayısı (küçük = hızlı)
// menzil: piksel, sayi: tek atıştaki mermi, sacilma: dağılma açısı
// tur: mermi türü (mermi, buz, alev, roket, lazer, simsek)
// g: görünüm bilgileri (çizim için)
const SILAHLAR = [
  { id: 'tabanca',  ad: 'Tabanca',        aciklama: 'Güvenilir başlangıç silahı.',        fiyat: 0,     hasar: 10,  aralik: 16, menzil: 420, mermiHiz: 13, sayi: 1, sacilma: 0.05, tur: 'mermi', renk: '#ffe066', g: { govde: '#546e7a', namlu: '#37474f', uz: 16, kal: 5 } },
  { id: 'uzi',      ad: 'Uzi',            aciklama: 'Çok hızlı küçük makineli.',          fiyat: 450,   hasar: 6,   aralik: 6,  menzil: 380, mermiHiz: 14, sayi: 1, sacilma: 0.14, tur: 'mermi', renk: '#ffd54f', g: { govde: '#424242', namlu: '#212121', uz: 18, kal: 6, sarjor: true } },
  { id: 'pompali',  ad: 'Pompalı',        aciklama: 'Yakından 7 saçma birden!',           fiyat: 1000,  hasar: 8,   aralik: 34, menzil: 300, mermiHiz: 13, sayi: 7, sacilma: 0.42, tur: 'mermi', renk: '#ffab40', g: { govde: '#6d4c41', namlu: '#3e2723', uz: 26, kal: 6, pompa: true } },
  { id: 'buz',      ad: 'Buz Tabancası',  aciklama: 'Zombileri dondurup yavaşlatır.',     fiyat: 1800,  hasar: 8,   aralik: 11, menzil: 400, mermiHiz: 12, sayi: 1, sacilma: 0.05, tur: 'buz',   renk: '#80deea', g: { govde: '#4fc3f7', namlu: '#e1f5fe', uz: 20, kal: 7, depo: '#b3e5fc' } },
  { id: 'makineli', ad: 'Makineli Tüfek', aciklama: 'Durmadan ateş eder!',                fiyat: 2800,  hasar: 8,   aralik: 4,  menzil: 460, mermiHiz: 16, sayi: 1, sacilma: 0.09, tur: 'mermi', renk: '#fff176', g: { govde: '#33691e', namlu: '#1b1b1b', uz: 30, kal: 7, cokNamlu: true } },
  { id: 'alev',     ad: 'Alev Silahı',    aciklama: 'Zombileri tutuşturur, deler geçer.', fiyat: 4000,  hasar: 2.5, aralik: 2,  menzil: 230, mermiHiz: 7.5, sayi: 1, sacilma: 0.22, tur: 'alev', renk: '#ff9800', g: { govde: '#e65100', namlu: '#424242', uz: 24, kal: 8, depo: '#ff7043' } },
  { id: 'roket',    ad: 'Roketatar',      aciklama: 'Büyük patlama, toplu hasar!',        fiyat: 6000,  hasar: 45,  aralik: 48, menzil: 560, mermiHiz: 7,  sayi: 1, sacilma: 0.03, tur: 'roket', alan: 95, renk: '#ff5722', g: { govde: '#2e7d32', namlu: '#1b5e20', uz: 32, kal: 10, roket: true } },
  { id: 'lazer',    ad: 'Lazer Tüfeği',   aciklama: 'Sıra sıra zombileri deler.',         fiyat: 8500,  hasar: 24,  aralik: 13, menzil: 600, mermiHiz: 26, sayi: 1, sacilma: 0.01, tur: 'lazer', renk: '#40c4ff', g: { govde: '#eceff1', namlu: '#00b0ff', uz: 30, kal: 6, isik: true } },
  { id: 'simsek',   ad: 'Yıldırım Topu',  aciklama: 'Şimşek zombiden zombiye sıçrar!',    fiyat: 13000, hasar: 32,  aralik: 26, menzil: 420, mermiHiz: 0,  sayi: 1, sacilma: 0,    tur: 'simsek', renk: '#e1bee7', g: { govde: '#6a1b9a', namlu: '#ce93d8', uz: 22, kal: 9, kure: true } }
];
const SILAH_HARITA = {};
SILAHLAR.forEach(s => { SILAH_HARITA[s.id] = s; });
const silahYukFiyat = (s, sev) => Math.round((80 + s.fiyat * 0.12) * (sev + 1));

// ---------- ZOMBİLER ----------
const ZOMBI_TIPLERI = {
  normal:   { can: 22,   hiz: 1.05, boy: 15, hasar: 7,  renk: '#7cb342', para: 4 },
  kosucu:   { can: 14,   hiz: 2.1,  boy: 13, hasar: 5,  renk: '#cddc39', para: 6 },
  sisko:    { can: 90,   hiz: 0.6,  boy: 25, hasar: 14, renk: '#558b2f', para: 14 },
  tukurucu: { can: 30,   hiz: 0.85, boy: 16, hasar: 9,  renk: '#26a69a', para: 10 },
  patlayan: { can: 26,   hiz: 1.5,  boy: 16, hasar: 25, renk: '#ff8a65', para: 10 },
  boss:     { can: 1300, hiz: 0.95, boy: 52, hasar: 22, renk: '#4e342e', para: 250 }
};

// ---------- DÜNYALAR (her biri 6 bölüm, 6. bölüm boss) ----------
const DUNYALAR = [
  { ad: 'Zombi Şehri',    tip: 'sehir',  zemin: '#55606b', zemin2: '#4d5761', boss: 'Beton Kafa',   bossRenk: '#78909c', kayma: 1 },
  { ad: 'Kavurucu Çöl',   tip: 'col',    zemin: '#e3c27e', zemin2: '#d8b46e', boss: 'Kum Devi',     bossRenk: '#bcaaa4', kayma: 0.8 },
  { ad: 'Karanlık Orman', tip: 'orman',  zemin: '#4f7a3a', zemin2: '#467034', boss: 'Kütük Dev', bossRenk: '#6d4c41', kayma: 1 },
  { ad: 'Buzul Dağı',     tip: 'kar',    zemin: '#e6eef5', zemin2: '#d6e3ee', boss: 'Buz Kral',     bossRenk: '#4fc3f7', kayma: 0.32 },
  { ad: 'Volkan Adası',   tip: 'volkan', zemin: '#4a302a', zemin2: '#3f2823', boss: 'Lav Canavarı', bossRenk: '#d84315', kayma: 1 }
];
const BOLUM_SAYISI = DUNYALAR.length * 6; // 30 bölüm

// Selim'in oyun içindeki konuşmaları
const SOZ_BASLA = ['Zombiler, geliyorum!', 'Hadi bakalım!', 'Selim iş başında!', 'Kemerler bağlansın!', 'Bugün çok zombi var!'];
const SOZ_KOMBO = ['Süperim!', 'Yakaladım seni!', 'Bir tane daha!', 'Vay be!', 'Durdurulamam!'];

// ---------- KAYIT SİSTEMİ (tarayıcı hafızası) ----------
const KAYIT_ANAHTAR = 'selimZombiAvcisi_v1';
function varsayilanKayit() {
  return {
    para: 150, acik: 1, yildiz: {},
    arabalar: { buggy: { motor: 0, zirh: 0, tampon: 0, nitro: 0, boya: 4, desen: 0, jant: 0 } },
    araba: 'buggy',
    silahlar: { tabanca: { hasar: 0, hiz: 0 } },
    silah: 'tabanca',
    desenler: [0],
    ses: true
  };
}
let K = varsayilanKayit();
function yukle() {
  try {
    const s = localStorage.getItem(KAYIT_ANAHTAR);
    if (s) K = Object.assign(varsayilanKayit(), JSON.parse(s));
  } catch (e) { K = varsayilanKayit(); }
  // bozuk kayıtlara karşı güvenlik kontrolleri
  if (!K.arabalar[K.araba]) K.araba = 'buggy';
  if (!K.arabalar.buggy) K.arabalar.buggy = varsayilanKayit().arabalar.buggy;
  if (!K.silahlar[K.silah]) K.silah = 'tabanca';
  if (!K.silahlar.tabanca) K.silahlar.tabanca = { hasar: 0, hiz: 0 };
  if (!Array.isArray(K.desenler)) K.desenler = [0];
}
function kaydet() {
  try { localStorage.setItem(KAYIT_ANAHTAR, JSON.stringify(K)); } catch (e) { /* özel modda kayıt olmayabilir */ }
}

// Yükseltmelerle hesaplanmış araba ve silah değerleri
function arabaStat(id) {
  const d = ARABA_HARITA[id];
  const u = K.arabalar[id] || { motor: 0, zirh: 0, tampon: 0, nitro: 0, boya: d.boya, desen: 0, jant: 0 };
  return {
    def: d, oz: u,
    hiz: d.hiz * (1 + 0.07 * u.motor),
    can: Math.round(d.can * (1 + 0.15 * u.zirh)),
    carpma: d.carpma * (1 + 0.25 * u.tampon),
    nitro: 100 * (1 + 0.2 * u.nitro),
    donus: d.donus,
    r: (d.L + d.W) / 4 // çarpışma yarıçapı
  };
}
function silahStat(id) {
  const s = SILAH_HARITA[id];
  const u = K.silahlar[id] || { hasar: 0, hiz: 0 };
  return Object.assign({}, s, {
    hasar: s.hasar * (1 + 0.2 * u.hasar),
    aralik: Math.max(1.5, s.aralik * (1 - 0.08 * u.hiz))
  });
}

// ---------- SES EFEKTLERİ (dosya gerektirmez, kodla üretilir) ----------
const Ses = {
  ctx: null, gurultu: null, son: {},
  // Tarayıcılar sesi ilk dokunuştan sonra açar
  baslat() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const n = Math.floor(this.ctx.sampleRate * 0.6);
        const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.gurultu = b;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* ses desteklenmiyor */ }
  },
  // Basit ton (osilatör)
  ton(tip, f1, f2, sure, ses) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tip;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + sure);
    g.gain.setValueAtTime(ses, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + sure + 0.02);
  },
  // Gürültü (patlama, alev vb.)
  gur(sure, ses, frek) {
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.gurultu;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(frek, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, frek * 0.2), t + sure);
    const g = c.createGain();
    g.gain.setValueAtTime(ses, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t); s.stop(t + sure);
  },
  arpej(notalar, aralik, sure, ses) {
    notalar.forEach((f, i) => setTimeout(() => { try { this.ton('square', f, f, sure, ses); } catch (e) {} }, i * aralik));
  },
  cal(ad) {
    if (!K.ses || !this.ctx) return;
    const t = this.ctx.currentTime;
    const min = { ates: 0.05, alev: 0.09, para: 0.04, pof: 0.04, ezme: 0.06, hasar: 0.08 }[ad] || 0.03;
    if (this.son[ad] && t - this.son[ad] < min) return; // aynı sesi üst üste çalma
    this.son[ad] = t;
    try {
      switch (ad) {
        case 'ates': this.ton('square', 700, 180, 0.07, 0.035); break;
        case 'pompali': this.gur(0.18, 0.22, 2500); break;
        case 'roket': this.gur(0.3, 0.14, 900); this.ton('sawtooth', 200, 80, 0.25, 0.035); break;
        case 'lazer': this.ton('sawtooth', 1400, 300, 0.12, 0.035); break;
        case 'alev': this.gur(0.12, 0.05, 1600); break;
        case 'buz': this.ton('triangle', 1800, 900, 0.1, 0.05); break;
        case 'simsek': this.gur(0.15, 0.14, 5000); this.ton('square', 120, 60, 0.15, 0.035); break;
        case 'patlama': this.gur(0.5, 0.35, 1200); this.ton('sine', 120, 40, 0.4, 0.14); break;
        case 'pof': this.ton('sine', 320, 90, 0.12, 0.07); break;
        case 'ezme': this.ton('square', 140, 60, 0.1, 0.07); break;
        case 'hasar': this.ton('sawtooth', 160, 70, 0.18, 0.06); break;
        case 'para': this.ton('square', 988, 1318, 0.08, 0.025); break;
        case 'tukur': this.ton('sine', 500, 150, 0.15, 0.05); break;
        case 'tik': this.ton('triangle', 660, 880, 0.05, 0.04); break;
        case 'al': this.arpej([523, 659, 784], 70, 0.09, 0.03); break;
        case 'hata': this.ton('square', 200, 140, 0.15, 0.035); break;
        case 'kazan': this.arpej([523, 659, 784, 1046], 120, 0.18, 0.045); break;
        case 'kaybet': this.arpej([392, 330, 262, 196], 150, 0.2, 0.04); break;
        case 'boss': this.ton('sawtooth', 90, 55, 0.8, 0.07); break;
        case 'can': this.ton('triangle', 600, 1200, 0.2, 0.05); break;
      }
    } catch (e) { /* ses hatası oyunu durdurmasın */ }
  }
};
