// Tarayıcıda uçtan uca arayüz kontrolü (isteğe bağlı; Playwright + Chromium gerekir, ikisi de ücretsiz).
// Proje bağımlılığı DEĞİLDİR: global kurulu Playwright kullanılır (npm i -g playwright).
//
// Kontroller: konsol hatası yok · yatay taşma yok (telefon dikey/yatay, masaüstü) ·
// her mini oyun bir oturumu sonuna kadar oynanır · klavyeyle başlatma ve cevaplama ·
// yeniden açınca kayıtlar korunur · tüm düğmelerin erişilebilir adı var.
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
  await page.goto(PAGE);
  return { context, page, errors };
}

const overflow = (page) =>
  page.evaluate(() => document.scrollingElement.scrollWidth - document.documentElement.clientWidth);

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: resolve(SHOTS, `${name}.png`), fullPage: false });
}

// Bir oyun oturumunu (süre baskısı kapalı = 12 tur) sonuna kadar oynar.
async function playToEnd(page, gameName, { maxMs = 90000, keyboard = false } = {}) {
  const deadline = Date.now() + maxMs;
  let steps = 0;
  while (Date.now() < deadline) {
    if (await page.locator('#again').count()) return { ok: true, steps };
    const act = await page.evaluate((kb) => {
      const visible = (el) => el && !el.disabled && el.offsetParent !== null;
      const cont = document.querySelector('#continue');
      if (visible(cont)) return cont.click(), 'continue';
      const ready = document.querySelector('.mg-ready');
      if (visible(ready)) return ready.click(), 'ready';
      const cells = [...document.querySelectorAll('.mg-cell')].filter((c) => !c.disabled && !c.getAttribute('aria-pressed'));
      if (cells.length) return cells[Math.floor(Math.random() * cells.length)].click(), 'cell';
      const press = document.querySelector('.df-press');
      if (visible(press)) return Math.random() < 0.5 ? (press.click(), 'press') : 'wait';
      const choices = [...document.querySelectorAll('.choice')].filter(visible);
      if (choices.length) {
        if (kb) return 'key';
        choices[Math.floor(Math.random() * choices.length)].click();
        return 'choice';
      }
      return 'wait';
    }, keyboard);
    if (act === 'key') await page.keyboard.press('1');
    if (act !== 'wait') steps += 1;
    await page.waitForTimeout(act === 'wait' ? 120 : 60);
  }
  return { ok: false, steps };
}

try {
  // ---- 1) Telefon dikey: tüm oyunlar, süre baskısı kapalı ----
  {
    const { context, page, errors } = await newPage({ width: 360, height: 740 });
    log((await overflow(page)) <= 0, 'telefon: menüde yatay taşma yok');
    await shot(page, 'menu-phone-light');
    // süre baskısını kapat (ayarlar ekranı üzerinden, gerçek kullanıcı gibi)
    await page.click('#nav-settings');
    await page.check('#set-relaxed');
    log((await overflow(page)) <= 0, 'telefon: ayarlarda yatay taşma yok');
    await page.click('#nav-home');
    const names = await page.$$eval('.game-row strong', (els) => els.map((e) => e.textContent));
    log(names.length === 9, `menüde 9 oyun listeleniyor (${names.length})`);
    for (let i = 0; i < names.length; i++) {
      await page.click('#nav-home');
      await page.locator('.game-row').nth(i).click();
      await page.click('#start-game');
      await page.waitForTimeout(2200); // geri sayım
      let maxOverflow = await overflow(page);
      if (i === 0) await shot(page, 'play-phone');
      const res = await playToEnd(page, names[i]);
      maxOverflow = Math.max(maxOverflow, await overflow(page));
      log(res.ok, `${names[i]}: oturum sonuna kadar oynandı (${res.steps} eylem)`);
      log(maxOverflow <= 0, `${names[i]}: oyun sırasında yatay taşma yok`);
      if (res.ok) {
        const score = await page.textContent('.result-score');
        log(/\d/.test(score), `${names[i]}: sonuç ekranında skor var`);
        if (i === 0) await shot(page, 'result-phone');
      }
    }
    // Yeniden aç: kayıtlar korunuyor mu?
    await page.reload();
    await page.click('#nav-stats');
    const plays = await page.$$eval('table.data tbody tr td:nth-child(2)', (tds) => tds.map((t) => Number(t.textContent)));
    log(plays.length === 9 && plays.every((p) => p === 1), `yeniden açınca her oyun için 1 oynama kayıtlı (${plays.join(',')})`);
    const today = await page.textContent('.stat-grid.three div:first-child dd');
    log(today.startsWith('9'), `bugünkü oturum sayısı 9 (${today})`);
    log((await overflow(page)) <= 0, 'telefon: istatistik ekranında yatay taşma yok (tablo kendi içinde kayar)');
    await shot(page, 'stats-phone');
    // Dışa aktar → içe aktar: önce önizleme ve onay, sonra yazma
    await page.click('#nav-settings');
    await page.click('#export');
    const exported = await page.inputValue('#export-box');
    await page.setInputFiles('#import-file', { name: 'veri.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
    await page.waitForSelector('#import-confirm', { timeout: 3000 }).catch(() => {});
    const summary = await page.textContent('.import-confirm .hint').catch(() => '');
    log(/9 oyun kaydı ve 9 oturum/.test(summary), `içe aktarma önce özet gösterip onay istiyor (${summary.trim().slice(0, 60)})`);
    await page.click('#import-confirm');
    log((await page.textContent('#data-msg')).includes('içe aktarıldı'), 'onaydan sonra veriler içe aktarıldı');
    await page.setInputFiles('#import-file', { name: 'kotu.json', mimeType: 'application/json', buffer: Buffer.from('{bozuk') });
    await page.waitForTimeout(200);
    log((await page.textContent('#data-msg')).startsWith('İçe aktarılamadı'), 'bozuk dosya reddediliyor, veri değişmiyor');
    // Erişilebilir ad kontrolü
    await page.click('#nav-home');
    const unnamed = await page.$$eval('button', (bs) => bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim())).length);
    log(unnamed === 0, 'tüm düğmelerin erişilebilir adı var');
    log(errors.length === 0, `telefon: konsol hatası yok ${errors.join(' | ')}`);
    await context.close();
  }

  // ---- 2) Masaüstü koyu tema: klavyeyle süreli oyun ----
  {
    const { context, page, errors } = await newPage({ width: 1280, height: 800 }, 'dark');
    await shot(page, 'menu-desktop-dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    log(bg !== 'rgb(238, 242, 247)', `koyu tema uygulanıyor (gövde ${bg})`);
    // Klavye: Hızlı başlat yerine Zihinden Hesap'ı Tab + Enter ile aç
    await page.focus('.game-row:nth-of-type(1)');
    const mm = page.locator('.game-row', { hasText: 'Zihinden Hesap' });
    await mm.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#start-game');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2400);
    await shot(page, 'play-desktop-dark');
    log(await page.locator('.banner:visible').count() === 1, 'ilk oynayışta alıştırma turu bandı görünüyor');
    let handled = 0;
    for (let k = 0; k < 6; k++) {
      await page.waitForSelector('.choice:not([disabled])', { timeout: 4000 });
      await page.keyboard.press(String(1 + (k % 4)));
      await page.waitForTimeout(80);
      if (await page.locator('.feedback.is-ok, .feedback.is-bad').count()) handled += 1;
    }
    log(handled === 6, `1–4 tuşlarıyla verilen 6 cevabın hepsi işlendi (${handled})`);
    await page.keyboard.press('Escape');
    log(await page.locator('.pause-layer:visible').count() === 1, 'Esc oyunu duraklatıyor');
    const t1 = await page.textContent('.time-text');
    await page.waitForTimeout(1500);
    const t2 = await page.textContent('.time-text');
    log(t1 === t2, `duraklatınca süre durur (${t1} = ${t2})`);
    await page.click('#quit');
    await page.waitForSelector('#again', { timeout: 5000 }).catch(() => {});
    log(await page.locator('#again').count() === 1, 'oyunu bitir → sonuç ekranı');
    log(errors.length === 0, `masaüstü: konsol hatası yok ${errors.join(' | ')}`);
    await context.close();
  }

  // ---- 3) Telefon yatay ve uyarlanabilir mücadele ekranı ----
  {
    const { context, page, errors } = await newPage({ width: 740, height: 360 });
    log((await overflow(page)) <= 0, 'telefon yatay: menüde yatay taşma yok');
    await page.click('#challenge-start');
    const steps = await page.$$eval('.plan li', (li) => li.length);
    log(steps === 5, `mücadele planı 5 oyun içeriyor (${steps})`);
    const reasons = await page.$$eval('.plan .reason', (r) => r.every((x) => x.textContent.length > 5));
    log(reasons, 'her mücadele adımının nedeni yazılı');
    await page.click('#start-challenge');
    await page.click('#start-game');
    await page.waitForTimeout(2400);
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
