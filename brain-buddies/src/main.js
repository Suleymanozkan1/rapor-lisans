// Uygulama girişi: kayıt deposunu açar, kabuğu kurar, menüyü gösterir.

import { createProgressRepository, createBrowserStore } from './core/storage.js';
import { createApp } from './ui/app.js';

function boot() {
  const root = document.getElementById('app');
  const repo = createProgressRepository(createBrowserStore());
  const app = createApp({ root, repo });
  app.applySettings();
  root.querySelector('#nav-home').addEventListener('click', app.menu);
  root.querySelector('#nav-training').addEventListener('click', app.training);
  root.querySelector('#nav-stats').addEventListener('click', app.statsScreen);
  root.querySelector('#nav-settings').addEventListener('click', app.settingsScreen);
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', app.applySettings);
  app.menu();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
