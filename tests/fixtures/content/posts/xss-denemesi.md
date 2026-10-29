---
title: "Kötü niyetli içerik <script>alert(1)</script>"
excerpt: XSS denemesi
status: published
createdAt: 2026-04-20T08:00:00Z
publishedAt: 2026-04-20T09:00:00Z
category: egitim
revision: 0
---

<script>window.__xss = 1</script>

<img src=x onerror="window.__xss=2">

[tıkla](javascript:window.__xss=3)

<a href="javascript:alert(1)">ham bağlantı</a>

<iframe src="https://example.com"></iframe>

## Güvenli başlık

Normal metin.
