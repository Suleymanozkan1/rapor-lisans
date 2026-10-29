#!/usr/bin/env node
// Project-local design lint. Implements a subset of the code-certain checks
// from the avoid-ai-design tell catalog (IDs in brackets) plus a WCAG
// contrast check of the colour tokens in src/app/globals.css.
// Exit code 1 if any error-level finding remains.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const files = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx|ts|css)$/.test(name)) files.push(p)
  }
})(path.join(root, 'src'))

const rules = [
  { id: 'SD4d', level: 'error', re: /\s·\s/, what: 'metadata joined with middle dots' },
  { id: 'SD4/T5', level: 'error', re: /text-transform:\s*uppercase/, what: 'all-caps label styling' },
  { id: 'CP3', level: 'error', re: /[→←↑↓]/, what: 'arrow glyph stapled to text' },
  { id: 'C1/C6', level: 'error', re: /linear-gradient|bg-clip-text|background-clip:\s*text/, what: 'gradient fill' },
  { id: 'T1', level: 'error', re: /font-family:[^;]*\bInter\b/, what: 'Inter as a face' },
  { id: 'T2', level: 'error', re: /Space Grotesk|Geist|Syne|Sora|Instrument Serif|Fraunces|Cal Sans/, what: 'overused "tasteful" font' },
  { id: 'K3', level: 'error', re: /backdrop-filter|backdrop-blur/, what: 'glassmorphism' },
  { id: 'K2', level: 'warn', re: /box-shadow:/, what: 'shadow (check it is not on every surface)' },
  { id: 'K4', level: 'warn', re: /border-(left|top):\s*\d+px solid var\(--(action|warn|danger|ok)\)/, what: 'coloured stripe on a box' },
  { id: 'I2', level: 'error', re: /[\u{1F300}-\u{1FAFF}✨⭐]/u, what: 'emoji used as decoration' },
  { id: 'M4', level: 'error', re: /cubic-bezier\([^)]*1\.[1-9]|animate-bounce|easeOutBack/, what: 'bounce easing' },
  { id: 'CP1/CP2', level: 'error', re: /\b(seamless|cutting-edge|best-in-class|Elevate your|Unleash)\b|sorunsuz|en iyi çözüm|yenilikçi çözüm/i, what: 'generic marketing copy' },
]

const findings = []
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (line.includes('design-scan-ignore')) return
    for (const r of rules) if (r.re.test(line)) findings.push({ ...r, file: path.relative(root, f), line: i + 1, text: line.trim().slice(0, 100) })
  })
}

const css = readFileSync(path.join(root, 'src/app/globals.css'), 'utf8')
const motionOk = /prefers-reduced-motion:\s*reduce/.test(css)
if (!motionOk) findings.push({ id: 'M6', level: 'error', file: 'src/app/globals.css', line: 0, what: 'no prefers-reduced-motion rule' })
const focusOk = /:focus-visible/.test(css)
if (!focusOk) findings.push({ id: 'K7', level: 'error', file: 'src/app/globals.css', line: 0, what: 'no :focus-visible style' })

// WCAG 2.1 contrast
const tok = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const color = (v) => (v.startsWith('#') ? v : tok[v])
const pairs = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink-2', 'paper', 4.5, 'muted text'],
  ['ink-2', 'surface', 4.5, 'muted text on surface'],
  ['action', 'paper', 4.5, 'links'],
  ['action-hover', 'action-tint', 4.5, 'quiet button hover'],
  ['#ffffff', 'action', 4.5, 'primary button text'],
  ['#ffffff', 'danger', 4.5, 'danger button text'],
  ['danger', 'surface', 4.5, 'danger link'],
  ['ink', 'warn-tint', 4.5, 'warning notice text'],
  ['ink', 'danger-tint', 4.5, 'error notice text'],
  ['ink', 'ok-tint', 4.5, 'success notice text'],
  ['ok', 'surface', 4.5, 'published pill'],
  ['#e9edf1', 'ink', 4.5, 'admin bar text'],
  ['focus', 'paper', 3, 'focus ring (non-text)'],
  ['rule-strong', 'paper', 3, 'strong rules (non-text)'],
]
const contrast = pairs.map(([fg, bg, min, use]) => {
  const r = ratio(color(fg), color(bg))
  return { fg, bg, use, ratio: Math.round(r * 100) / 100, min, pass: r >= min }
})
for (const c of contrast) if (!c.pass) findings.push({ id: 'C9', level: 'error', file: 'src/app/globals.css', line: 0, what: `${c.use}: ${c.fg} on ${c.bg} = ${c.ratio}:1 (< ${c.min})` })

const json = process.argv.includes('--json')
if (json) console.log(JSON.stringify({ files: files.length, findings, contrast }, null, 2))
else {
  console.log(`Taranan dosya: ${files.length}`)
  for (const c of contrast) console.log(`${c.pass ? 'OK ' : 'ERR'} ${c.ratio.toFixed(2).padStart(5)}:1  ${c.use} (${c.fg} / ${c.bg})`)
  if (findings.length === 0) console.log('Bulgu yok.')
  for (const f of findings) console.log(`${f.level.toUpperCase()} [${f.id}] ${f.file}:${f.line} ${f.what}${f.text ? `  | ${f.text}` : ''}`)
}
process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
