'use strict';
/* =========================================================
   SELİM: ZOMBİ AVCISI  —  cizim.js
   Tüm çizimler kodla yapılır (resim dosyası yok):
   Selim, arabalar, silahlar, zombiler ve harita nesneleri.
   ========================================================= */

let DPR = 1; // ekran piksel yoğunluğu (retina için)

// Yuvarlak köşeli dikdörtgen yolu
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Dolu daire
function daire(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
// Yıldız yolu
function yildizYol(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr_ = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_);
  }
  ctx.closePath();
}
// Düzensiz çokgen (kaya, lav gölü için)
function cokgenYol(ctx, x, y, R, nokta, olcek) {
  ctx.beginPath();
  const n = nokta.length;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = R * nokta[i] * olcek;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ================= SİLAH =================
// Silahı (0,0) noktasından sağa (+x) doğru çizer
function silahCiz(ctx, g) {
  const k = g.kal;
  if (g.roket) { // roketatar: kalın boru
    ctx.fillStyle = g.govde; rr(ctx, -8, -k / 2, g.uz + 10, k, k / 2); ctx.fill();
    ctx.fillStyle = g.namlu; ctx.fillRect(-8, -k / 2, 4, k);
    ctx.fillStyle = '#ff5722';
    ctx.beginPath(); ctx.moveTo(g.uz + 2, -k / 2 + 1); ctx.lineTo(g.uz + 8, 0); ctx.lineTo(g.uz + 2, k / 2 - 1); ctx.fill();
    return;
  }
  // gövde
  ctx.fillStyle = g.govde; rr(ctx, -6, -k / 2 - 1.5, 15, k + 3, 2.5); ctx.fill();
  // namlu
  ctx.fillStyle = g.namlu;
  if (g.cokNamlu) {
    for (const o of [-k * 0.3, 0, k * 0.3]) ctx.fillRect(7, o - 1.1, g.uz - 7, 2.2);
    ctx.fillRect(g.uz - 5, -k * 0.45, 3, k * 0.9);
  } else ctx.fillRect(7, -k / 4, g.uz - 7, k / 2);
  if (g.sarjor) { ctx.fillStyle = '#111'; ctx.fillRect(2, k / 2, 4, k * 0.9); }
  if (g.pompa) { ctx.fillStyle = '#8d6e63'; rr(ctx, g.uz * 0.45, -k / 2, g.uz * 0.3, k, 2); ctx.fill(); }
  if (g.depo) { ctx.fillStyle = g.depo; daire(ctx, 2, -k / 2 - 2, k * 0.55); }
  if (g.isik) { ctx.fillStyle = '#80d8ff'; ctx.fillRect(9, -1, g.uz - 11, 2); }
  if (g.kure) {
    ctx.fillStyle = 'rgba(206,147,216,.45)'; daire(ctx, g.uz, 0, k * 0.9);
    ctx.fillStyle = '#f3e5f5'; daire(ctx, g.uz, 0, k * 0.45);
  }
}
// Silahı bir küçük tuvale (ikon) sığdırarak çizer
function silahIkonCiz(c, id) {
  const w = c.clientWidth || 96, h = c.clientHeight || 44;
  c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
  const ctx = c.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
  const g = SILAH_HARITA[id].g;
  const boy = g.uz + 16;
  const s = Math.min(w * 0.82 / boy, h * 0.55 / (g.kal + 8));
  ctx.translate(w / 2 - ((g.uz - 8) / 2) * s, h / 2);
  ctx.scale(s, s);
  silahCiz(ctx, g);
}

// ================= SELİM (üstten görünüm, arabanın içinde) =================
// Kırmızı-sarı tişörtlü, koyu kahve saçlı Selim; silahı nişan yönünde tutar
function selimUstCiz(ctx, aci, g) {
  ctx.save();
  ctx.rotate(aci);
  // silah (kolların altında)
  ctx.save(); ctx.translate(6, 0); silahCiz(ctx, g); ctx.restore();
  // tişört (omuzlar)
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.ellipse(-3, 0, 6.5, 11, 0, 0, Math.PI * 2); ctx.fill();
  // kollar: biri sarı biri kırmızı
  ctx.lineCap = 'round'; ctx.lineWidth = 5;
  ctx.strokeStyle = '#f6a623'; ctx.beginPath(); ctx.moveTo(-1, -8.5); ctx.lineTo(8, -3); ctx.stroke();
  ctx.strokeStyle = '#a8102e'; ctx.beginPath(); ctx.moveTo(-1, 8.5); ctx.lineTo(8, 3); ctx.stroke();
  // eller
  ctx.fillStyle = '#f3cfae'; daire(ctx, 9, -2.6, 2.6); daire(ctx, 9, 2.6, 2.6);
  // kulaklar ve kafa
  daire(ctx, 0.5, -8.2, 2.2); daire(ctx, 0.5, 8.2, 2.2);
  daire(ctx, 0, 0, 8);
  // saç: arkayı ve yanları kaplar, öne doğru kakül
  ctx.fillStyle = '#3b2417';
  ctx.beginPath();
  ctx.arc(0, 0, 8.6, 0.38 * Math.PI, 1.62 * Math.PI, false);
  ctx.quadraticCurveTo(5.8, 0, 3.2, 8.0);
  ctx.closePath(); ctx.fill();
  // gözler
  ctx.fillStyle = '#2a1608'; daire(ctx, 6.2, -2.6, 1.15); daire(ctx, 6.2, 2.6, 1.15);
  ctx.restore();
}

// ================= ARABA =================
// Gövde şekli (arabanın tipine göre)
function govdeYolu(ctx, d) {
  const L = d.L, W = d.W;
  switch (d.tip) {
    case 'spor':
      ctx.beginPath();
      ctx.moveTo(-L / 2 + 6, -W / 2);
      ctx.lineTo(L / 2 - 16, -W / 2 + 1);
      ctx.quadraticCurveTo(L / 2 + 1, -W / 4, L / 2, 0);
      ctx.quadraticCurveTo(L / 2 + 1, W / 4, L / 2 - 16, W / 2 - 1);
      ctx.lineTo(-L / 2 + 6, W / 2);
      ctx.quadraticCurveTo(-L / 2, W / 2, -L / 2, W / 2 - 6);
      ctx.lineTo(-L / 2, -W / 2 + 6);
      ctx.quadraticCurveTo(-L / 2, -W / 2, -L / 2 + 6, -W / 2);
      ctx.closePath(); break;
    case 'buggy': rr(ctx, -L / 2 + 5, -W / 2 + 5, L - 10, W - 10, 10); break;
    case 'kamyon': rr(ctx, -L / 2 + 3, -W / 2 + 7, L - 6, W - 14, 7); break;
    case 'tank': rr(ctx, -L / 2 + 5, -W / 2 + 9, L - 10, W - 18, 6); break;
    default: rr(ctx, -L / 2, -W / 2, L, W, d.tip === 'jip' ? 6 : 9);
  }
}
// Tekerlekler / paletler
function tekerlekCiz(ctx, d, jant, zaman) {
  const L = d.L, W = d.W;
  if (d.tip === 'tank') {
    for (const s of [-1, 1]) {
      const y = s > 0 ? W / 2 - 12 : -W / 2;
      ctx.fillStyle = '#263238'; rr(ctx, -L / 2, y, L, 12, 4); ctx.fill();
      ctx.strokeStyle = '#455a64'; ctx.lineWidth = 2;
      const kay = (zaman * 0.6) % 8;
      for (let x = -L / 2 + 3 + kay; x < L / 2 - 2; x += 8) { ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y + 10); ctx.stroke(); }
      ctx.fillStyle = jant; for (const x of [-L * 0.3, 0, L * 0.3]) daire(ctx, x, y + 6, 2.2);
    }
    return;
  }
  const buyuk = d.tip === 'kamyon', genis = d.tip === 'buggy';
  const tw = buyuk ? 19 : genis ? 15 : 12, th = buyuk ? 13 : genis ? 10 : 7;
  const ox = L / 2 - tw / 2 - (buyuk ? 3 : 7);
  const oy = W / 2 - th / 2 + (buyuk || genis ? 4 : 1);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ctx.fillStyle = '#1b1b1b'; rr(ctx, sx * ox - tw / 2, sy * oy - th / 2, tw, th, 3); ctx.fill();
    ctx.fillStyle = jant; rr(ctx, sx * ox - tw / 4, sy * oy - th / 4, tw / 2, th / 2, 1.5); ctx.fill();
  }
}
// Gövde deseni (gövdeye kırpılmış alanda çizilir)
function desenCiz(ctx, desen, d, boya) {
  const L = d.L, W = d.W;
  const kont = parlaklik(boya) > 0.6 ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.8)';
  if (desen === 1) { // şerit
    ctx.fillStyle = kont; ctx.fillRect(-L, -6, 2 * L, 4); ctx.fillRect(-L, 2, 2 * L, 4);
  } else if (desen === 2) { // alev
    const pts = [[0, -1], [0.55, -0.75], [0.35, -0.45], [0.72, -0.2], [0.45, 0], [0.72, 0.2], [0.35, 0.45], [0.55, 0.75], [0, 1]];
    [['#ff3d00', 1], ['#ff9100', 0.74], ['#ffea00', 0.48]].forEach(([r, k]) => {
      ctx.fillStyle = r; ctx.beginPath();
      pts.forEach(([fx, fy], i) => { const x = L / 2 - fx * L * k, y = fy * W / 2 * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x + 4, y); });
      ctx.closePath(); ctx.fill();
    });
  } else if (desen === 3) { // yıldız
    ctx.fillStyle = parlaklik(boya) > 0.6 ? '#e53935' : '#ffeb3b';
    [[-L * 0.32, -W * 0.22, 5], [L * 0.32, W * 0.2, 5], [-L * 0.05, W * 0.28, 4], [L * 0.38, -W * 0.25, 4]].forEach(([x, y, r]) => { yildizYol(ctx, x, y, r); ctx.fill(); });
  } else if (desen === 4) { // damalı
    ctx.fillStyle = kont; const s = 6;
    for (let x = -L / 2; x < L / 2; x += s) for (let y = -W / 2; y < W / 2; y += s)
      if (((Math.round((x + L) / s) + Math.round((y + W) / s)) % 2) === 0) ctx.fillRect(x, y, s, s);
  } else if (desen === 5) { // kaplan
    ctx.fillStyle = 'rgba(20,10,0,.65)';
    for (let x = -L * 0.4; x < L * 0.45; x += L * 0.16) {
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x - 3, s * W / 2); ctx.quadraticCurveTo(x + 4, s * W * 0.2, x + 1, s * W * 0.05);
        ctx.lineTo(x + 5, s * W * 0.25); ctx.lineTo(x + 4, s * W / 2); ctx.closePath(); ctx.fill();
      }
    }
  }
}
// Arabayı Selim ve silahıyla birlikte çizer (merkez 0,0)
function arabaCiz(ctx, d, oz, aci, tAci, g, zaman, flas) {
  const L = d.L, W = d.W;
  const boya = BOYALAR[oz.boya] || BOYALAR[0];
  const jant = JANTLAR[oz.jant] || JANTLAR[0];
  ctx.save();
  ctx.rotate(aci);
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, -L / 2 + 4, -W / 2 + 5, L, W, 10); ctx.fill();
  tekerlekCiz(ctx, d, jant, zaman);
  // gövde boyası
  govdeYolu(ctx, d); ctx.fillStyle = boya; ctx.fill();
  // desen + ışık gölgelendirme (gövdeye kırpılmış)
  ctx.save(); govdeYolu(ctx, d); ctx.clip();
  desenCiz(ctx, oz.desen, d, boya);
  const gr = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = gr; ctx.fillRect(-L, -W, 2 * L, 2 * W);
  ctx.restore();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.5)'; govdeYolu(ctx, d); ctx.stroke();
  // ön cam ve arka cam
  if (d.tip !== 'buggy' && d.tip !== 'tank') {
    ctx.fillStyle = '#1d2b3a';
    const w1 = L * 0.08, w2 = L * 0.27, ic = d.tip === 'kamyon' ? 9 : 5;
    ctx.beginPath(); ctx.moveTo(w1, -W / 2 + ic); ctx.lineTo(w2, -W / 2 + ic + 2); ctx.lineTo(w2, W / 2 - ic - 2); ctx.lineTo(w1, W / 2 - ic); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,255,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w1 + 4, -W / 2 + ic + 3); ctx.lineTo(w2 - 3, -W / 2 + ic + 5); ctx.stroke();
    ctx.fillStyle = '#1d2b3a'; rr(ctx, -L * 0.45, -W / 2 + ic + 2, L * 0.07, W - 2 * ic - 4, 2); ctx.fill();
  }
  if (d.tip === 'buggy') { // koruma kafesi
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L * 0.12, -W / 2 + 6); ctx.lineTo(L * 0.12, W / 2 - 6); ctx.stroke();
  }
  if (d.tip === 'tank') { // ön zırh plakası ve perçinler
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(L * 0.22, -W / 2 + 10, L * 0.2, W - 20);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (const x of [-L * 0.35, L * 0.1, L * 0.38]) { daire(ctx, x, -W / 2 + 12, 1.5); daire(ctx, x, W / 2 - 12, 1.5); }
  }
  if (d.tip === 'polis') { // siren lambası
    const yan = Math.floor(zaman / 8) % 2;
    ctx.fillStyle = yan ? '#ff1744' : '#7f0000'; ctx.fillRect(L * 0.0, -W * 0.35, 6, W * 0.35);
    ctx.fillStyle = yan ? '#0d47a1' : '#2979ff'; ctx.fillRect(L * 0.0, 0, 6, W * 0.35);
  }
  // farlar ve stop lambaları
  ctx.fillStyle = '#fff59d'; daire(ctx, L / 2 - 4, -W / 2 + 7, 3); daire(ctx, L / 2 - 4, W / 2 - 7, 3);
  ctx.fillStyle = '#ff1744'; ctx.fillRect(-L / 2 + 1, -W / 2 + 6, 3, 5); ctx.fillRect(-L / 2 + 1, W / 2 - 11, 3, 5);
  // Selim'in çıktığı tavan kapağı
  ctx.fillStyle = '#151515'; daire(ctx, d.selimX, 0, 12.5);
  // hasar alınca beyaz parlama
  if (flas > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, flas / 10)})`; govdeYolu(ctx, d); ctx.fill(); }
  ctx.restore();
  // Selim ve silahı (arabadan bağımsız döner)
  ctx.save();
  ctx.translate(Math.cos(aci) * d.selimX, Math.sin(aci) * d.selimX);
  selimUstCiz(ctx, tAci, g);
  ctx.restore();
}
// Garaj kartları için küçük araba resmi
function arabaIkonCiz(c, id) {
  const w = c.clientWidth || 112, h = c.clientHeight || 62;
  c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
  const ctx = c.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
  const d = ARABA_HARITA[id];
  const oz = K.arabalar[id] || { boya: d.boya, desen: 0, jant: 0 };
  const s = Math.min(w * 0.8 / d.L, h * 0.8 / (d.W + 8));
  ctx.translate(w / 2, h / 2); ctx.scale(s, s);
  arabaCiz(ctx, d, oz, 0, -0.3, SILAH_HARITA[K.silah].g, 0, 0);
}

// ================= ZOMBİ =================
function zombiCiz(ctx, z) {
  const b = z.boy;
  ctx.save(); ctx.translate(z.x, z.y);
  // gölge
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(3, 4, b * 1.05, b * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(z.yon);
  const renk = z.yavas > 0 ? '#9fe4ff' : z.renk;
  const koyu = tonla(renk, -0.35);
  // uzanan kollar (yürürken sallanır)
  const sal = Math.sin(z.adim) * b * 0.25;
  ctx.lineCap = 'round'; ctx.strokeStyle = tonla(renk, -0.15); ctx.lineWidth = b * 0.38;
  ctx.beginPath(); ctx.moveTo(0, -b * 0.62); ctx.lineTo(b * 1.25 + sal, -b * 0.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, b * 0.62); ctx.lineTo(b * 1.25 - sal, b * 0.55); ctx.stroke();
  // gövde
  ctx.fillStyle = renk; daire(ctx, 0, 0, b);
  ctx.lineWidth = 2; ctx.strokeStyle = koyu; ctx.stroke();
  // tipe özel süslemeler
  if (z.tip === 'sisko') { ctx.fillStyle = koyu; daire(ctx, -b * 0.4, -b * 0.3, b * 0.15); daire(ctx, -b * 0.2, b * 0.45, b * 0.12); daire(ctx, -b * 0.55, b * 0.15, b * 0.1); }
  if (z.tip === 'patlayan') {
    ctx.fillStyle = `rgba(255,235,59,${0.6 + Math.sin(z.adim * 3) * 0.4})`;
    daire(ctx, -b * 0.35, -b * 0.35, b * 0.22); daire(ctx, -b * 0.4, b * 0.3, b * 0.2); daire(ctx, 0, b * 0.05, b * 0.16);
  }
  if (z.tip === 'tukurucu') { ctx.fillStyle = '#9c27b0'; daire(ctx, b * 0.6, -b * 0.55, b * 0.22); daire(ctx, b * 0.6, b * 0.55, b * 0.22); }
  if (z.tip === 'boss') { // taç
    ctx.fillStyle = '#ffd600'; ctx.strokeStyle = '#b28704'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? b * 0.32 : b * 0.5; ctx.lineTo(-b * 0.25 + Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e53935'; daire(ctx, -b * 0.25, 0, b * 0.1);
  }
  // gözler (biri büyük biri küçük — komik görünüm)
  const gx = b * 0.45, gy = b * 0.36, gr = b * 0.27;
  ctx.fillStyle = '#fff'; daire(ctx, gx, -gy, gr); daire(ctx, gx, gy, gr * 0.78);
  ctx.fillStyle = z.tip === 'boss' ? '#d50000' : '#1a1a1a';
  daire(ctx, gx + gr * 0.35, -gy, gr * 0.45); daire(ctx, gx + gr * 0.3, gy, gr * 0.38);
  // ağız ve diş
  ctx.fillStyle = '#3b1f14'; rr(ctx, b * 0.68, -b * 0.22, b * 0.14, b * 0.44, 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(b * 0.7, -b * 0.12, b * 0.1, b * 0.1);
  // vurulunca beyaz parlama
  if (z.flas > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#fff'; daire(ctx, 0, 0, b); ctx.globalAlpha = 1; }
  ctx.restore();
  // yanıyorsa alev
  if (z.yanma > 0) {
    ctx.fillStyle = `rgba(255,${(120 + Math.random() * 100) | 0},0,.65)`;
    daire(ctx, z.x + rand(-b / 2, b / 2), z.y - b * 0.4 + rand(-3, 3), b * 0.38);
  }
  // can barı
  if (z.tip !== 'boss' && z.can < z.maxCan) {
    const w = b * 2;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(z.x - w / 2, z.y - b - 10, w, 5);
    ctx.fillStyle = '#76ff03'; ctx.fillRect(z.x - w / 2, z.y - b - 10, w * clamp(z.can / z.maxCan, 0, 1), 5);
  }
}

// ================= HARİTA NESNELERİ =================
function engelCiz(ctx, e, tip) {
  if (e.tip === 'kutu') { // bina
    ctx.fillStyle = '#8a939c'; rr(ctx, e.x - 14, e.y - 14, e.w + 28, e.h + 28, 10); ctx.fill(); // kaldırım
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(e.x + 10, e.y + 10, e.w, e.h);            // gölge
    ctx.fillStyle = tonla(e.renk, -0.3); ctx.fillRect(e.x, e.y, e.w, e.h);                  // duvar
    ctx.fillStyle = e.renk; ctx.fillRect(e.x + 7, e.y + 7, e.w - 14, e.h - 14);              // çatı
    for (const dt of e.detay) { ctx.fillStyle = dt.r; ctx.fillRect(e.x + dt.x, e.y + dt.y, dt.w, dt.h); }
    return;
  }
  const x = e.x, y = e.y, R = e.r;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; daire(ctx, x + 7, y + 9, R); // gölge
  switch (e.alt) {
    case 'agac':
      ctx.fillStyle = '#2b6327'; daire(ctx, x, y, R);
      ctx.fillStyle = '#3d8a35'; daire(ctx, x - R * 0.18, y - R * 0.18, R * 0.72);
      ctx.fillStyle = '#5aab4a'; daire(ctx, x - R * 0.35, y - R * 0.35, R * 0.36);
      break;
    case 'cam': // karlı çam
      ctx.fillStyle = '#1f5a3a'; yildizYol(ctx, x, y, R); ctx.fill();
      ctx.fillStyle = '#2e7d4f'; daire(ctx, x, y, R * 0.5);
      ctx.fillStyle = '#fff'; daire(ctx, x - R * 0.3, y - R * 0.3, R * 0.22); daire(ctx, x + R * 0.25, y - R * 0.1, R * 0.15); daire(ctx, x, y, R * 0.14);
      break;
    case 'kaktus':
      ctx.fillStyle = '#43a047'; daire(ctx, x, y, R);
      daire(ctx, x + R * 0.95, y - R * 0.1, R * 0.45); daire(ctx, x - R * 0.85, y + R * 0.3, R * 0.4);
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - R * 0.7, y); ctx.lineTo(x + R * 0.7, y); ctx.moveTo(x, y - R * 0.7); ctx.lineTo(x, y + R * 0.7); ctx.stroke();
      ctx.fillStyle = '#ff4081'; daire(ctx, x - R * 0.25, y - R * 0.3, R * 0.18);
      break;
    case 'varil': // patlayıcı varil
      ctx.fillStyle = '#c62828'; daire(ctx, x, y, R);
      ctx.strokeStyle = '#7f0000'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e53935'; daire(ctx, x, y, R * 0.66);
      ctx.fillStyle = '#ffd600';
      ctx.beginPath(); ctx.moveTo(x, y - R * 0.45); ctx.lineTo(x + R * 0.42, y + R * 0.3); ctx.lineTo(x - R * 0.42, y + R * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - R * 0.18, 2, R * 0.3);
      break;
    default: { // kaya (dünyaya göre renk)
      const renk = tip === 'col' ? '#b08b5b' : tip === 'kar' ? '#90a4ae' : tip === 'volkan' ? '#3e2723' : '#7d7d7d';
      ctx.fillStyle = renk; cokgenYol(ctx, x, y, R, e.nokta, 1); ctx.fill();
      ctx.fillStyle = tonla(renk, 0.2); cokgenYol(ctx, x - R * 0.15, y - R * 0.15, R, e.nokta, 0.6); ctx.fill();
      if (tip === 'kar') { ctx.fillStyle = '#fff'; cokgenYol(ctx, x - R * 0.2, y - R * 0.25, R, e.nokta, 0.45); ctx.fill(); }
      if (tip === 'volkan') {
        ctx.strokeStyle = '#ff6d00'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - R * 0.5, y - R * 0.1); ctx.lineTo(x - R * 0.1, y + R * 0.1); ctx.lineTo(x + R * 0.2, y - R * 0.3); ctx.lineTo(x + R * 0.5, y); ctx.stroke();
      }
    }
  }
}
// Yerdeki küçük süsler (dekor)
function susCiz(ctx, s, tip) {
  const { x, y } = s, k = s.s;
  switch (tip) {
    case 'sehir':
      if (s.t === 0) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 * k, y + 4 * k); ctx.lineTo(x + 16 * k, y - 3 * k); ctx.stroke(); }
      else if (s.t === 1) { ctx.fillStyle = '#3d454d'; daire(ctx, x, y, 9 * k); ctx.fillStyle = '#4c555e'; daire(ctx, x, y, 6 * k); }
      else { ctx.fillStyle = 'rgba(255,255,255,.1)'; daire(ctx, x, y, 3 * k); }
      break;
    case 'col':
      ctx.fillStyle = s.t === 0 ? '#c9a466' : s.t === 1 ? '#a8885a' : '#f0d79c';
      daire(ctx, x, y, (s.t === 2 ? 5 : 3) * k);
      break;
    case 'orman':
      if (s.t === 2) { ctx.fillStyle = pickRenk(s); daire(ctx, x, y, 3 * k); ctx.fillStyle = '#fff59d'; daire(ctx, x, y, 1.2 * k); }
      else { ctx.strokeStyle = '#3a6b2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 * k, y - 8 * k); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - 9 * k); ctx.moveTo(x, y); ctx.lineTo(x + 4 * k, y - 7 * k); ctx.stroke(); }
      break;
    case 'kar':
      ctx.fillStyle = s.t === 0 ? '#ffffff' : s.t === 1 ? 'rgba(144,202,249,.45)' : '#c9d8e6';
      if (s.t === 1) { ctx.beginPath(); ctx.ellipse(x, y, 22 * k, 12 * k, 0.3, 0, Math.PI * 2); ctx.fill(); }
      else daire(ctx, x, y, 5 * k);
      break;
    case 'volkan':
      ctx.fillStyle = s.t === 0 ? 'rgba(255,109,0,.8)' : s.t === 1 ? '#2b1a16' : 'rgba(255,171,64,.5)';
      daire(ctx, x, y, (s.t === 1 ? 6 : 2.5) * k);
      break;
  }
}
const CICEK_RENK = ['#ff80ab', '#ffffff', '#ffd54f', '#b388ff'];
function pickRenk(s) { return CICEK_RENK[Math.floor((s.x + s.y) % 4)]; }

// Lav gölü
function lavCiz(ctx, l, zaman) {
  ctx.fillStyle = '#bf360c'; cokgenYol(ctx, l.x, l.y, l.r + 6, l.nokta, 1); ctx.fill();
  ctx.fillStyle = '#ff6d00'; cokgenYol(ctx, l.x, l.y, l.r, l.nokta, 1); ctx.fill();
  ctx.fillStyle = `rgba(255,214,0,${0.45 + Math.sin(zaman * 0.05 + l.x) * 0.25})`;
  cokgenYol(ctx, l.x, l.y, l.r, l.nokta, 0.55); ctx.fill();
}

// ================= SELİM PORTRESİ (menü için, önden görünüm) =================
// mutlu = true ise ağzı açık gülüyor
function selimPortreCiz(c, mutlu) {
  const w = c.clientWidth || 220, h = c.clientHeight || 220;
  c.width = Math.round(w * DPR); c.height = Math.round(h * DPR);
  const ctx = c.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
  const k = Math.min(w, h) / 240;
  ctx.save(); ctx.translate((w - 240 * k) / 2, (h - 240 * k) / 2); ctx.scale(k, k);
  // arka ışık halkası
  const gl = ctx.createRadialGradient(120, 120, 10, 120, 120, 118);
  gl.addColorStop(0, 'rgba(255,214,64,.55)'); gl.addColorStop(1, 'rgba(255,214,64,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, 240, 240);
  const ten = '#f3cfae', tenKoyu = '#e0b08c', sac = '#3b2417';
  // kollar: sarı ve kırmızı
  ctx.fillStyle = '#f6a623'; rr(ctx, 28, 192, 46, 60, 18); ctx.fill();
  ctx.fillStyle = '#a8102e'; rr(ctx, 166, 192, 46, 60, 18); ctx.fill();
  // tişört
  ctx.fillStyle = '#fafafa'; rr(ctx, 52, 182, 136, 80, 26); ctx.fill();
  // boyun ve yaka
  ctx.fillStyle = tenKoyu; ctx.fillRect(108, 158, 24, 30);
  ctx.strokeStyle = '#a8102e'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(120, 184, 22, 10, 0, 0, Math.PI); ctx.stroke();
  // tişört yazısı
  ctx.fillStyle = '#a8102e'; ctx.font = 'bold 26px "Lilita One", system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SELİM', 120, 230);
  // kulaklar
  ctx.fillStyle = ten; daire(ctx, 62, 116, 12); daire(ctx, 178, 116, 12);
  ctx.fillStyle = tenKoyu; daire(ctx, 62, 116, 6); daire(ctx, 178, 116, 6);
  // kafa
  ctx.fillStyle = ten; ctx.beginPath(); ctx.ellipse(120, 110, 56, 60, 0, 0, Math.PI * 2); ctx.fill();
  // kısa koyu kahve saç ve kakül
  ctx.fillStyle = sac; ctx.beginPath();
  ctx.moveTo(63, 112);
  ctx.bezierCurveTo(54, 58, 92, 38, 124, 40);
  ctx.bezierCurveTo(162, 40, 188, 62, 177, 112);
  ctx.lineTo(172, 96);
  ctx.quadraticCurveTo(168, 80, 150, 78);
  ctx.quadraticCurveTo(136, 88, 122, 78);
  ctx.quadraticCurveTo(106, 89, 92, 79);
  ctx.quadraticCurveTo(74, 82, 68, 98);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(118, 96, 44, 1.2 * Math.PI, 1.55 * Math.PI); ctx.stroke();
  // kaşlar
  ctx.strokeStyle = sac; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(85, 96); ctx.quadraticCurveTo(97, 90, 108, 95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(132, 95); ctx.quadraticCurveTo(143, 90, 155, 96); ctx.stroke();
  // büyük kahverengi gözler
  for (const gx of [97, 143]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(gx, 114, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b3a1e'; daire(ctx, gx + 1, 116, 8.5);
    ctx.fillStyle = '#120a05'; daire(ctx, gx + 1, 116, 4.6);
    ctx.fillStyle = '#fff'; daire(ctx, gx + 4, 112, 2.6);
  }
  // burun
  ctx.strokeStyle = tenKoyu; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(120, 130, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // yanaklar
  ctx.fillStyle = 'rgba(255,120,120,.28)'; daire(ctx, 84, 138, 10); daire(ctx, 156, 138, 10);
  // ağız
  if (mutlu) {
    ctx.fillStyle = '#8d2f2a'; ctx.beginPath(); ctx.moveTo(101, 145); ctx.quadraticCurveTo(120, 172, 139, 145); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(108, 145, 24, 5);
  } else {
    ctx.strokeStyle = '#8d4a3a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(105, 148); ctx.quadraticCurveTo(121, 157, 136, 147); ctx.stroke();
  }
  ctx.restore();
}
