// Tarayıcıda uçtan uca arayüz kontrolü (isteğe bağlı; Playwright + Chromium gerekir, ikisi de ücretsiz).
// Proje bağımlılığı DEĞİLDİR: global kurulu Playwright kullanılır (npm i -g playwright).
// Oyun saatini hızlandırmak için Playwright'ın sahte saati (page.clock) kullanılır.
//
// Kontroller: konsol hatası yok · yatay taşma yok (telefon dikey/yatay, masaüstü) ·
// tam bir Beyin Testi (4 oyun) ve final tartısı · rekorun kaydı · antrenmanda açık her oyunun
// sonuna kadar oynanması, kilitli oyunlar · klavye ve duraklatma · dışa/içe aktarma · erişilebilir adlar.
// Kullanım: npm run ui   (SHOTS=klasör ile ekran görüntüsü kaydeder)

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAGE = pathToFileURL(resolve(ROOT, 'dist/zihin-molasi.html')).href;
const SHOTS = process.env.SHOTS ? resolve(process.env.SHOTS) : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(resolve(globalRoot, 'noop.js'))('playwright');
  }
}

const { chromium } = await loadPlaywright();
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launchOpts);
const failures = [];
const log = (ok, msg) => {
  console.log(`${ok ? '✓' : '✕'} ${msg}`);
  if (!ok) failures.push(msg);
};

async function newPage(viewport, colorScheme = 'light') {
  const context = await browser.newContext({ viewport, colorScheme, hasTouch: viewport.width < 800 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.clock.install();
  await page.goto(PAGE);
  return { context, page, errors };
}

const overflow = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);
const shot = async (page, name) => SHOTS && page.screenshot({ path: resolve(SHOTS, `${name}.png`) });

// Ekrandaki oyuna uygun rastgele bir eylem yapar.
const act = (page) =>
  page.evaluate(() => {
    const ok = (el) => el && !el.disabled && el.offsetParent !== null;
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    for (const sel of ['#continue', '.mg-ready', '#ms-ready']) {
      const b = document.querySelector(sel);
      if (ok(b)) return b.click(), sel;
    }
    const groups = [
      '.mg-cell:not([aria-pressed])', '.ps-cell:not(.is-ok)', '.as-letter', '.nh-num[aria-pressed="false"]',
      '.bb-bubble:not(.is-popped)', '.fa-alien', '.dd-key', '.choice',
    ];
    for (const sel of groups) {
      const list = [...document.querySelectorAll(sel)].filter(ok);
      if (list.length) return pick(list).click(), sel;
    }
    const press = document.querySelector('.df-press');
    if (ok(press) && Math.random() < 0.5) return press.click(), 'press';
    return 'wait';
  });

// Sonuç ekranındaki düğmeyi görene kadar oynar (sahte saati ilerleterek).
async function playUntil(page, doneSelector, maxSteps = 900) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.locator(doneSelector).count()) return true;
    await act(page);
    await page.clock.runFor(250);
  }
  return page.locator(doneSelector).count().then(Boolean);
}

try {
  // ---- 1) Telefon dikey: tam Beyin Testi ----
  {
    const { context, page, errors } = await newPage({ width: 360, height: 760 });
    log((await overflow(page)) <= 0, 'telefon: Beyin Testi ana sayfasında yatay taşma yok');
    log((await page.textContent('h1')).includes('Beynin kaç gram'), 'ana sayfa Beyin Testi');
    await shot(page, 'home-phone');
    await page.click('#start-test');
    for (let i = 0; i < 4; i++) {
      const name = await page.textContent('.intro-title');
      await page.click('#start-step');
      await page.clock.runFor(2500);
      let maxOver = await overflow(page);
      if (i === 2) await shot(page, 'test-step-phone');
      const done = await playUntil(page, i < 3 ? '#next-step' : '#weigh', 400);
      maxOver = Math.max(maxOver, await overflow(page));
      const grams = (await page.textContent('#step-grams').catch(() => '')) || '';
      log(done && /\d+ g/.test(grams), `${i + 1}/4 ${name}: 60 sn sonunda gram sonucu (${grams})`);
      log(maxOver <= 0, `${name}: yatay taşma yok`);
      await page.click(i < 3 ? '#next-step' : '#weigh');
    }
    await page.clock.runFor(2000);
    const total = await page.textContent('#brain-weight');
    log(/\d+ g/.test(total), `final tartısı beyin ağırlığını gösteriyor (${total})`);
    log((await page.textContent('.badge')).includes('rekor'), 'ilk test rekor olarak kaydedildi');
    log((await overflow(page)) <= 0, 'final ekranında yatay taşma yok');
    await shot(page, 'final-phone');
    await page.reload();
    log((await page.textContent('.bt-record')).includes('Rekorun'), 'yeniden açınca rekor beyin ağırlığı korunuyor');
    // Antrenman: kilitli ve açık oyunlar
    await page.click('#nav-settings');
    await page.check('#set-relaxed');
    await page.click('#nav-training');
    const locked = await page.locator('.game-row.is-locked').count();
    log(locked === 4, `1 testten sonra 4 Beyin Testi oyunu hâlâ kilitli (${locked})`);
    const names = await page.$$eval('button.game-row strong', (els) => els.map((e) => e.textContent));
    log(names.length === 13, `antrenmanda 13 açık oyun (${names.length})`);
    for (const name of names) {
      await page.click('#nav-training');
      await page.locator('button.game-row', { hasText: name }).click();
      await page.click('#start-game');
      await page.clock.runFor(2500);
      let maxOver = await overflow(page);
      const ok = await playUntil(page, '#again', 600);
      maxOver = Math.max(maxOver, await overflow(page));
      log(ok, `antrenman ${name}: oturum sonuna kadar oynandı`);
      log(maxOver <= 0, `antrenman ${name}: yatay taşma yok`);
    }
    await page.click('#nav-stats');
    log((await overflow(page)) <= 0, 'istatistik ekranında yatay taşma yok');
    log((await page.textContent('.panel')).includes('Beyin Testi'), 'istatistikte Beyin Testi bölümü var');
    // Dışa aktar → içe aktar
    await page.click('#nav-settings');
    await page.click('#export');
    const exported = await page.inputValue('#export-box');
    await page.setInputFiles('#import-file', { name: 'veri.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
    await page.waitForSelector('#import-confirm', { timeout: 3000 }).catch(() => {});
    log(await page.locator('#import-confirm').count() === 1, 'içe aktarma önce özet gösterip onay istiyor');
    await page.click('#import-confirm');
    log((await page.textContent('#data-msg')).includes('içe aktarıldı'), 'onaydan sonra veriler içe aktarıldı');
    await page.setInputFiles('#import-file', { name: 'kotu.json', mimeType: 'application/json', buffer: Buffer.from('{bozuk') });
    await page.clock.runFor(200);
    log((await page.textContent('#data-msg')).startsWith('İçe aktarılamadı'), 'bozuk dosya reddediliyor');
    await page.click('#nav-home');
    const unnamed = await page.$$eval('button', (bs) => bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim())).length);
    log(unnamed === 0, 'tüm düğmelerin erişilebilir adı var');
    log(errors.length === 0, `telefon: konsol hatası yok ${errors.join(' | ')}`);
    await context.close();
  }

  // ---- 2) Masaüstü koyu tema: klavye ve duraklatma ----
  {
    const { context, page, errors } = await newPage({ width: 1280, height: 800 }, 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    log(bg !== 'rgb(253, 240, 225)', `koyu tema uygulanıyor (${bg})`);
    await shot(page, 'home-desktop-dark');
    await page.click('#nav-training');
    await page.locator('button.game-row', { hasText: 'Zihinden Hesap' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#start-game');
    await page.clock.runFor(100); // odak setTimeout(…, 0) ile verilir
    await page.keyboard.press('Enter');
    await page.clock.runFor(2500);
    log(await page.locator('.banner:visible').count() === 1, 'ilk oynayışta alıştırma turu bandı görünüyor');
    let handled = 0;
    for (let k = 0; k < 6; k++) {
      await page.waitForSelector('.choice:not([disabled])', { timeout: 4000 }).catch(() => {});
      await page.keyboard.press(String(1 + (k % 4)));
      if (await page.locator('.feedback.is-ok, .feedback.is-bad').count()) handled += 1;
      await page.clock.runFor(2000);
    }
    log(handled === 6, `1–4 tuşlarıyla verilen 6 cevabın hepsi işlendi (${handled})`);
    log(!(await page.textContent('.feedback')).includes('null'), 'geri bildirimde "null" metni yok');
    await page.keyboard.press('Escape');
    log(await page.locator('.pause-layer:visible').count() === 1, 'Esc oyunu duraklatıyor');
    const t1 = await page.textContent('.time-text');
    await page.clock.runFor(3000);
    const t2 = await page.textContent('.time-text');
    log(t1 === t2, `duraklatınca süre durur (${t1} = ${t2})`);
    await page.click('#quit');
    await page.waitForSelector('#again', { timeout: 3000 }).catch(() => {});
    log(await page.locator('#again').count() === 1, 'oyunu bitir → sonuç ekranı');
    // Düşürme!: klavyeyle sonuç yazma
    await page.click('#nav-training');
    await page.locator('button.game-row', { hasText: 'Düşürme!' }).click();
    await page.click('#start-game');
    await page.clock.runFor(4000);
    const before = await page.textContent('#hud-score');
    for (let k = 0; k < 4; k++) {
      const exprs = await page.$$eval('.dd-ball:not(.is-popped):not(.is-dropped)', (els) => els.map((e) => e.textContent));
      if (exprs.length) {
        const value = String(Function(`return ${exprs[0].replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')}`)());
        for (const ch of value) await page.keyboard.press(ch);
      }
      await page.clock.runFor(1500);
    }
    const after = await page.textContent('#hud-score');
    log(parseInt(after, 10) > parseInt(before, 10), `Düşürme!: klavyeyle yazılan sonuçlar topları patlatıyor (skor ${before} → ${after})`);
    log(errors.length === 0, `masaüstü: konsol hatası yok ${errors.join(' | ')}`);
    await context.close();
  }

  // ---- 3) Telefon yatay ----
  {
    const { context, page, errors } = await newPage({ width: 740, height: 360 });
    log((await overflow(page)) <= 0, 'telefon yatay: ana sayfada yatay taşma yok');
    await page.click('#start-test');
    await page.click('#start-step');
    await page.clock.runFor(2500);
    log((await overflow(page)) <= 0, 'telefon yatay: oyun ekranında yatay taşma yok');
    await shot(page, 'play-landscape');
    log(errors.length === 0, `yatay: konsol hatası yok ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} kontrol başarısız` : '\nTüm arayüz kontrolleri geçti');
process.exit(failures.length ? 1 : 0);
