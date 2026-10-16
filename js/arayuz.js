'use strict';
/* =========================================================
   SELİM: ZOMBİ AVCISI  —  arayuz.js
   Menüler, garaj, silah dükkânı, bölüm seçimi, HUD,
   sonuç ekranı ve ana oyun döngüsü.
   ========================================================= */

const hudEl = $('#hud'), mobilEl = $('#mobilKontrol');
let aktifEkran = 'menu';
let garajSecili = null;

// ================= EKRAN YÖNETİMİ =================
function ekranGoster(id) {
  aktifEkran = id;
  document.querySelectorAll('.ekran').forEach(e => e.classList.toggle('aktif', e.id === id));
  const oyunda = id === 'oyun';
  hudEl.style.display = oyunda ? 'block' : 'none';
  mobilEl.style.display = oyunda ? 'flex' : 'none';
  if (id === 'menu') menuHazirla();
  else if (id === 'bolumler') bolumlerCiz();
  else if (id === 'garaj') garajCiz();
  else if (id === 'silahlar') silahlarCiz();
}
function overlayKapat() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('aktif')); }

// Kısa bilgi mesajı (alt kısımda)
let toastZaman = null;
function toast(yazi) {
  const t = $('#toast'); t.textContent = yazi; t.classList.add('goster');
  clearTimeout(toastZaman); toastZaman = setTimeout(() => t.classList.remove('goster'), 1800);
}
// Ortada büyük yazı (bölüm başı, boss geldi)
function banner(b1, b2) {
  const el = $('#banner');
  $('#banner1').textContent = b1; $('#banner2').textContent = b2 || '';
  el.classList.remove('goster'); void el.offsetWidth; el.classList.add('goster');
}

// ================= ANA MENÜ =================
function menuHazirla() {
  $('#menuPara').innerHTML = paraHtml(K.para);
  sesYazisi();
  selimPortreCiz($('#selimPortre'), false);
  $('#menuIpucu').innerHTML = DOKUNMATIK
    ? '🕹️ Ekranın <b>sol</b> tarafına dokunup sürükle: araba sürer.<br>Selim zombilere <b>otomatik</b> ateş eder. Sağa dokunursan oraya nişan alır.<br>Hızla çarparak zombileri ezebilirsin!'
    : '⌨️ <b>WASD / Ok tuşları</b>: sür · <b>Fare</b>: nişan al + ateş (bırakınca otomatik)<br><b>Boşluk</b>: nitro · <b>Q / E</b>: silah değiştir · <b>P</b>: duraklat<br>Hızla çarparak zombileri ezebilirsin!';
}
function sesYazisi() {
  const y = K.ses ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
  $('#sesBtn').textContent = y; $('#sesBtn2').textContent = y;
}
function sesDegistir() { K.ses = !K.ses; kaydet(); sesYazisi(); Ses.baslat(); Ses.cal('tik'); }
$('#sesBtn').addEventListener('click', sesDegistir);
$('#sesBtn2').addEventListener('click', sesDegistir);

// ================= BÖLÜM SEÇİMİ =================
function bolumlerCiz() {
  $('#bolumPara').innerHTML = paraHtml(K.para);
  let h = '';
  DUNYALAR.forEach((d, di) => {
    h += `<div class="dunya"><h3><span class="dunyaRenk" style="background:${d.zemin}"></span>${di + 1}. ${d.ad}</h3><div class="bolumIzgara">`;
    for (let i = 1; i <= 6; i++) {
      const n = di * 6 + i, acik = n <= K.acik, y = K.yildiz[n] || 0, boss = n % 6 === 0;
      h += acik
        ? `<button class="bolumBtn ${boss ? 'boss' : ''}" data-bolum="${n}">${n}<small>${boss ? 'BOSS' : ''}</small><small>${'★'.repeat(y)}${'☆'.repeat(3 - y)}</small></button>`
        : `<button class="bolumBtn kilit" disabled>🔒</button>`;
    }
    h += '</div></div>';
  });
  $('#bolumListe').innerHTML = h;
}
$('#bolumListe').addEventListener('click', e => {
  const b = e.target.closest('[data-bolum]');
  if (b) { Ses.baslat(); Ses.cal('tik'); oyunBaslat(parseInt(b.dataset.bolum, 10)); }
});

// ================= ORTAK HTML PARÇALARI =================
const statSatir = (ad, v, maks) => `<div class="statSira"><b>${ad}</b><div class="statBar"><i style="width:${clamp(v / maks * 100, 4, 100)}%"></i></div></div>`;
const pipHtml = sev => { let s = ''; for (let i = 0; i < MAKS_SEVIYE; i++) s += `<i class="${i < sev ? 'dolu' : ''}"></i>`; return `<div class="pipler">${s}</div>`; };

// ================= GARAJ =================
function garajCiz() {
  if (!garajSecili || !ARABA_HARITA[garajSecili]) garajSecili = K.araba;
  $('#garajPara').innerHTML = paraHtml(K.para);
  // araba kartları
  const liste = $('#arabaListe');
  liste.innerHTML = ARABALAR.map(a => {
    const sahip = !!K.arabalar[a.id];
    const alt = sahip ? (K.araba === a.id ? '✔ Kullanılıyor' : 'Senin') : paraHtml(a.fiyat);
    return `<button class="arabaKart ${a.id === garajSecili ? 'secili' : ''}" data-araba="${a.id}"><canvas data-arabaikon="${a.id}"></canvas><div>${a.ad}</div><small>${alt}</small></button>`;
  }).join('');
  liste.querySelectorAll('canvas[data-arabaikon]').forEach(c => arabaIkonCiz(c, c.dataset.arabaikon));
  // seçili arabanın detayları
  const d = ARABA_HARITA[garajSecili], sahip = K.arabalar[d.id], st = arabaStat(d.id);
  let h = `<h3 style="margin:0 0 4px">${d.ad}</h3><div style="color:var(--soluk);font-size:14px;margin-bottom:8px">${d.aciklama}</div>`;
  h += statSatir('Hız', st.hiz, 9.6) + statSatir('Can', st.can, 800) + statSatir('Ezme', st.carpma, 225) + statSatir('Dönüş', d.donus, 0.095);
  if (!sahip) {
    h += `<button class="btn sari" style="width:100%;margin-top:10px" data-al-araba="${d.id}" ${K.para < d.fiyat ? 'disabled' : ''}>Satın Al &nbsp;${paraHtml(d.fiyat)}</button>`;
    if (K.para < d.fiyat) h += `<div style="text-align:center;color:var(--soluk);font-size:13px;margin-top:6px">${d.fiyat - K.para} altın daha topla!</div>`;
  } else {
    if (K.araba !== d.id) h += `<button class="btn yesil" style="width:100%;margin-top:10px" data-sec-araba="${d.id}">Bu Arabayı Kullan</button>`;
    h += '<h4>Yükseltmeler</h4>';
    for (const y of YUKSELTMELER) {
      const sev = sahip[y.id], fiyat = yukseltmeFiyat(d.fiyat, y, sev);
      h += `<div class="yukSira"><div class="ad"><div>${y.ad}</div><small>${y.aciklama}</small>${pipHtml(sev)}</div>`;
      h += sev >= MAKS_SEVIYE ? '<span class="maks">MAKS</span>' : `<button class="btn kucuk sari" data-yuk="${y.id}" ${K.para < fiyat ? 'disabled' : ''}>${paraHtml(fiyat)}</button>`;
      h += '</div>';
    }
    h += '<h4>Boya</h4><div class="renkler">' + BOYALAR.map((r, i) => `<button class="renk ${sahip.boya === i ? 'secili' : ''}" style="background:${r}" data-boya="${i}" aria-label="Boya ${i + 1}"></button>`).join('') + '</div>';
    h += '<h4>Desen</h4><div class="desenler">' + DESENLER.map((ds, i) => {
      const var_ = K.desenler.includes(i);
      return `<button class="btn kucuk desenBtn ${sahip.desen === i ? 'secili' : ''}" data-desen="${i}">${ds.ad}${var_ ? '' : ' ' + paraHtml(ds.fiyat)}</button>`;
    }).join('') + '</div>';
    h += '<h4>Jant</h4><div class="renkler">' + JANTLAR.map((r, i) => `<button class="renk ${sahip.jant === i ? 'secili' : ''}" style="background:${r}" data-jant="${i}" aria-label="Jant ${i + 1}"></button>`).join('') + '</div>';
  }
  $('#arabaDetay').innerHTML = h;
}
$('#garaj').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.git) return;
  Ses.baslat();
  const ds = b.dataset;
  const d = ARABA_HARITA[garajSecili], sahip = K.arabalar[d.id];
  if (ds.araba) { garajSecili = ds.araba; Ses.cal('tik'); garajCiz(); return; }
  if (ds.alAraba) {
    const a = ARABA_HARITA[ds.alAraba];
    if (K.para >= a.fiyat) {
      K.para -= a.fiyat;
      K.arabalar[a.id] = { motor: 0, zirh: 0, tampon: 0, nitro: 0, boya: a.boya, desen: 0, jant: 0 };
      K.araba = a.id; kaydet(); Ses.cal('al'); toast(`${a.ad} artık senin! 🎉`);
    } else Ses.cal('hata');
    garajCiz(); return;
  }
  if (ds.secAraba) { K.araba = ds.secAraba; kaydet(); Ses.cal('tik'); toast(`${ARABA_HARITA[K.araba].ad} seçildi`); garajCiz(); return; }
  if (!sahip) return;
  if (ds.yuk) {
    const y = YUKSELTMELER.find(v => v.id === ds.yuk), sev = sahip[y.id], fiyat = yukseltmeFiyat(d.fiyat, y, sev);
    if (sev < MAKS_SEVIYE && K.para >= fiyat) { K.para -= fiyat; sahip[y.id]++; kaydet(); Ses.cal('al'); toast(`${y.ad} seviye ${sahip[y.id]}!`); }
    else Ses.cal('hata');
    garajCiz(); return;
  }
  if (ds.boya !== undefined) { sahip.boya = +ds.boya; kaydet(); Ses.cal('tik'); garajCiz(); return; }
  if (ds.jant !== undefined) { sahip.jant = +ds.jant; kaydet(); Ses.cal('tik'); garajCiz(); return; }
  if (ds.desen !== undefined) {
    const i = +ds.desen;
    if (!K.desenler.includes(i)) {
      if (K.para < DESENLER[i].fiyat) { Ses.cal('hata'); toast('Yeterli altın yok'); return; }
      K.para -= DESENLER[i].fiyat; K.desenler.push(i); Ses.cal('al'); toast(`${DESENLER[i].ad} deseni açıldı!`);
    } else Ses.cal('tik');
    sahip.desen = i; kaydet(); garajCiz();
  }
});
// Garajdaki dönen büyük araba görüntüsü
function garajOnizleme(t) {
  const c = $('#garajOn'), w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  if (c.width !== Math.round(w * DPR)) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
  const ctx = c.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2 + 6, 110, 60, 0, 0, Math.PI * 2); ctx.fill();
  const d = ARABA_HARITA[garajSecili] || ARABA_HARITA[K.araba];
  const oz = K.arabalar[d.id] || { boya: d.boya, desen: 0, jant: 0 };
  ctx.save(); ctx.translate(w / 2, h / 2);
  const s = Math.min(2.4, h / (d.L * 1.1)); ctx.scale(s, s);
  const aci = t / 1600;
  arabaCiz(ctx, d, oz, aci, aci + Math.sin(t / 700) * 0.9, SILAH_HARITA[K.silah].g, t / 16, 0);
  ctx.restore();
}

// ================= SİLAH DÜKKÂNI =================
function silahlarCiz() {
  $('#silahPara').innerHTML = paraHtml(K.para);
  $('#silahListe').innerHTML = SILAHLAR.map(s => {
    const u = K.silahlar[s.id], st = silahStat(s.id);
    let h = `<div class="silahKart ${K.silah === s.id ? 'secili' : ''}"><canvas data-silahikon="${s.id}"></canvas><div class="silahBilgi"><h3>${s.ad}</h3><p>${s.aciklama}</p>`;
    h += statSatir('Hasar', st.hasar * s.sayi, 115) + statSatir('Atış hızı', 60 / st.aralik, 25) + statSatir('Menzil', s.menzil, 600);
    if (!u) {
      h += `<button class="btn sari kucuk" style="margin-top:6px" data-al-silah="${s.id}" ${K.para < s.fiyat ? 'disabled' : ''}>Satın Al &nbsp;${paraHtml(s.fiyat)}</button>`;
    } else {
      h += K.silah === s.id ? '<div class="etiket">✔ Başlangıç silahı</div>' : `<button class="btn kucuk yesil" style="margin-top:6px" data-sec-silah="${s.id}">Başlangıç silahı yap</button>`;
      for (const [alan, ad] of [['hasar', 'Hasar'], ['hiz', 'Atış hızı']]) {
        const sev = u[alan], fiyat = silahYukFiyat(s, sev);
        h += `<div class="yukSira"><div class="ad"><div>${ad} +</div>${pipHtml(sev)}</div>`;
        h += sev >= MAKS_SEVIYE ? '<span class="maks">MAKS</span>' : `<button class="btn kucuk sari" data-syuk="${s.id}|${alan}" ${K.para < fiyat ? 'disabled' : ''}>${paraHtml(fiyat)}</button>`;
        h += '</div>';
      }
    }
    return h + '</div></div>';
  }).join('');
  document.querySelectorAll('canvas[data-silahikon]').forEach(c => silahIkonCiz(c, c.dataset.silahikon));
}
$('#silahListe').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  Ses.baslat();
  const ds = b.dataset;
  if (ds.alSilah) {
    const s = SILAH_HARITA[ds.alSilah];
    if (K.para >= s.fiyat) { K.para -= s.fiyat; K.silahlar[s.id] = { hasar: 0, hiz: 0 }; K.silah = s.id; kaydet(); Ses.cal('al'); toast(`${s.ad} alındı! 💥`); }
    else Ses.cal('hata');
  } else if (ds.secSilah) {
    K.silah = ds.secSilah; kaydet(); Ses.cal('tik');
  } else if (ds.syuk) {
    const [id, alan] = ds.syuk.split('|'), s = SILAH_HARITA[id], u = K.silahlar[id], fiyat = silahYukFiyat(s, u[alan]);
    if (u[alan] < MAKS_SEVIYE && K.para >= fiyat) { K.para -= fiyat; u[alan]++; kaydet(); Ses.cal('al'); toast(`${s.ad} güçlendi!`); }
    else Ses.cal('hata');
  } else return;
  silahlarCiz();
});

// ================= OYUN İÇİ GÖSTERGE =================
const H_ = {
  can: $('#canDolu'), canY: $('#canYazi'), nitro: $('#nitroDolu'), iler: $('#ilerDolu'), ilerY: $('#ilerYazi'),
  para: $('#hudPara'), bossBar: $('#bossBar'), bossAd: $('#bossAd'), bossDolu: $('#bossDolu')
};
let hudSayac = 0;
function hudGuncelle() {
  if (++hudSayac % 3) return; // her 3 karede bir güncelle (performans)
  const P = O.P, A = O.ayar;
  H_.can.style.transform = `scaleX(${clamp(P.can / P.maxCan, 0, 1)})`;
  H_.canY.textContent = `${Math.ceil(P.can)} / ${P.maxCan}`;
  H_.nitro.style.transform = `scaleX(${clamp(P.nitro / P.maxNitro, 0, 1)})`;
  if (A.bossVar && O.bossCikti) { H_.iler.style.transform = 'scaleX(1)'; H_.ilerY.textContent = 'BOSS SAVAŞI!'; }
  else {
    H_.iler.style.transform = `scaleX(${clamp(O.oldurulen / A.hedef, 0, 1)})`;
    H_.ilerY.textContent = `Zombi: ${Math.min(O.oldurulen, A.hedef)} / ${A.hedef}${A.bossVar ? ' → BOSS' : ''}`;
  }
  H_.para.textContent = O.para;
  if (O.boss) {
    H_.bossBar.style.display = 'block';
    H_.bossAd.textContent = '👑 ' + O.boss.ad;
    H_.bossDolu.style.transform = `scaleX(${clamp(O.boss.can / O.boss.maxCan, 0, 1)})`;
  } else H_.bossBar.style.display = 'none';
}
function silahHudCiz() {
  if (!O) return;
  const id = O.P.silahlar[O.P.silahIdx];
  silahIkonCiz($('#silahIkon'), id);
  $('#silahAd').textContent = SILAH_HARITA[id].ad + (O.P.silahlar.length > 1 ? ' ⇄' : '');
}
// Dokunmatik düğmeler
const nitroBtn = $('#nitroBtn');
nitroBtn.addEventListener('pointerdown', e => { e.preventDefault(); G.nitroBas = true; nitroBtn.classList.add('basili'); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => nitroBtn.addEventListener(ev, () => { G.nitroBas = false; nitroBtn.classList.remove('basili'); }));
$('#silahBtn').addEventListener('pointerdown', e => { e.preventDefault(); silahDegis(1); });
$('#durBtn').addEventListener('click', duraklatToggle);

// ================= DURAKLATMA =================
function duraklatToggle() {
  if (!O || O.bitti) return;
  O.duraklat = !O.duraklat;
  $('#duraklatEkran').classList.toggle('aktif', O.duraklat);
  G.nitroBas = false; G.joy.aktif = false; G.dok = null;
}
$('#devamBtn').addEventListener('click', () => { if (O && O.duraklat) duraklatToggle(); });
$('#yenidenBtn').addEventListener('click', () => { if (O) oyunBaslat(O.ayar.n); });
document.addEventListener('visibilitychange', () => { if (document.hidden && O && !O.bitti && !O.duraklat) duraklatToggle(); });

// ================= SONUÇ EKRANI =================
function sonucGoster() {
  const n = O.ayar.n, P = O.P;
  let yildiz = 0, bonus = 0;
  if (O.kazandi) {
    const oran = P.can / P.maxCan;
    yildiz = oran > 0.6 ? 3 : oran > 0.3 ? 2 : 1;
    bonus = 50 + n * 15;
    K.yildiz[n] = Math.max(K.yildiz[n] || 0, yildiz);
    if (n < BOLUM_SAYISI) K.acik = Math.max(K.acik, n + 1);
  }
  K.para += O.para + bonus;
  kaydet();
  const sonBolum = O.kazandi && n === BOLUM_SAYISI;
  $('#sonucBaslik').textContent = sonBolum ? 'EFSANE SELİM!' : O.kazandi ? 'KAZANDIN!' : 'ARABA BOZULDU!';
  $('#sonucYildiz').innerHTML = O.kazandi ? [0, 1, 2].map(i => `<span class="${i < yildiz ? 'y' : ''}">★</span>`).join('') : '';
  let bilgi = `Toplanan altın: ${paraHtml(O.para)}`;
  if (bonus) bilgi += `<br>Bölüm ödülü: ${paraHtml(bonus)}`;
  bilgi += `<br>Toplam altının: ${paraHtml(K.para)}`;
  if (sonBolum) bilgi += '<br><b style="color:var(--sari)">Tüm zombi dünyalarını kurtardın! 🏆</b>';
  else if (!O.kazandi) bilgi += '<br>Garajda arabanı güçlendirip tekrar dene!';
  $('#sonucBilgi').innerHTML = bilgi;
  $('#sonrakiBtn').style.display = O.kazandi && n < BOLUM_SAYISI ? '' : 'none';
  $('#sonuc').classList.add('aktif');
  selimPortreCiz($('#sonucSelim'), O.kazandi);
}
$('#sonrakiBtn').addEventListener('click', () => { if (O) { Ses.cal('tik'); oyunBaslat(O.ayar.n + 1); } });
$('#tekrarBtn').addEventListener('click', () => { if (O) { Ses.cal('tik'); oyunBaslat(O.ayar.n); } });

// "data-git" taşıyan tüm düğmeler ekran değiştirir
document.addEventListener('click', e => {
  const b = e.target.closest('[data-git]');
  if (!b) return;
  Ses.baslat(); Ses.cal('tik');
  if (O) { O = null; overlayKapat(); }
  ekranGoster(b.dataset.git);
});

// ================= ANA DÖNGÜ =================
let sonZaman = performance.now();
function dongu(t) {
  let dt = (t - sonZaman) / 16.667; // 60 FPS'e göre normalize edilmiş zaman
  sonZaman = t;
  if (dt > 3) dt = 3; if (dt < 0) dt = 0;
  try {
    if (O) {
      if (!O.duraklat) guncelle(dt);
      if (O) { ciz(); hudGuncelle(); }
    } else if (aktifEkran === 'garaj') garajOnizleme(t);
  } catch (err) { console.error(err); }
  requestAnimationFrame(dongu);
}

// ================= BAŞLANGIÇ =================
yukle();
boyutla();
document.body.classList.add(DOKUNMATIK ? 'dokunmatik' : 'masaustu');
window.addEventListener('resize', () => {
  boyutla();
  if (aktifEkran === 'menu') selimPortreCiz($('#selimPortre'), false);
});
ekranGoster('menu');
// Yazı tipi yüklenince portreyi yeniden çiz (SELİM yazısı için)
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (aktifEkran === 'menu') selimPortreCiz($('#selimPortre'), false); });
requestAnimationFrame(dongu);
