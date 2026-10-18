// Kodla çizilen özgün SVG görselleri: şekiller, oklar, ızgara parçaları.

import { colorInfo, describeItem } from '../core/shapes.js';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  for (const c of children.flat()) if (c) el.append(c);
  return el;
}

function polygonPoints(sides, radius, rotation = -90, cx = 50, cy = 50, inner = null) {
  const pts = [];
  const total = inner ? sides * 2 : sides;
  for (let i = 0; i < total; i++) {
    const r = inner && i % 2 ? inner : radius;
    const a = ((rotation + (360 / total) * i) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const SHAPE_BUILDERS = {
  circle: (a) => s('circle', { cx: 50, cy: 50, r: 40, ...a }),
  square: (a) => s('rect', { x: 12, y: 12, width: 76, height: 76, rx: 8, ...a }),
  triangle: (a) => s('polygon', { points: '50,9 92,88 8,88', ...a }),
  star: (a) => s('polygon', { points: polygonPoints(5, 44, -90, 50, 53, 19), ...a }),
  diamond: (a) => s('polygon', { points: '50,5 92,50 50,95 8,50', ...a }),
  hexagon: (a) => s('polygon', { points: polygonPoints(6, 42, 0), ...a }),
};

function fillDefs(pattern, hex, id) {
  switch (pattern) {
    case 'stripes':
      return s(
        'pattern',
        { id, width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        s('rect', { width: 12, height: 12, class: 'shape-bg' }),
        s('rect', { width: 6, height: 12, fill: hex }),
      );
    case 'dots':
      return s(
        'pattern',
        { id, width: 12, height: 12, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 12, height: 12, class: 'shape-bg' }),
        s('circle', { cx: 6, cy: 6, r: 3.6, fill: hex }),
      );
    case 'grid':
      return s(
        'pattern',
        { id, width: 14, height: 14, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 14, height: 14, fill: hex }),
        s('rect', { x: 3, y: 3, width: 8, height: 8, class: 'shape-bg' }),
      );
    case 'half':
      return s(
        'linearGradient',
        { id, x1: 0, y1: 0, x2: 1, y2: 0 },
        s('stop', { offset: '50%', 'stop-color': hex }),
        s('stop', { offset: '50%', class: 'shape-bg-stop' }),
      );
    default:
      return null;
  }
}

// item: { shape, color, rotation?, scale? }
export function shapeSvg(item, { size = 64, label = true } = {}) {
  const info = colorInfo(item.color) || { hex: 'currentColor', pattern: 'solid' };
  const id = `zm-fill-${++uid}`;
  const defs = fillDefs(info.pattern, info.hex, id);
  const fill = info.pattern === 'solid' ? info.hex : info.pattern === 'hollow' ? 'none' : `url(#${id})`;
  const scale = item.scale ?? 1;
  const rot = item.rotation ?? 0;
  const body = (SHAPE_BUILDERS[item.shape] || SHAPE_BUILDERS.circle)({
    fill,
    stroke: info.hex,
    'stroke-width': info.pattern === 'hollow' ? 9 : 4,
    'stroke-linejoin': 'round',
  });
  const svg = s(
    'svg',
    {
      viewBox: '0 0 100 100',
      width: size,
      height: size,
      class: 'shape',
      role: label ? 'img' : null,
      'aria-hidden': label ? null : 'true',
      focusable: 'false',
    },
    defs ? s('defs', {}, defs) : null,
    s('g', { transform: `rotate(${rot} 50 50) translate(50 50) scale(${scale}) translate(-50 -50)` }, body),
  );
  if (label) svg.append(s('title', {}, document.createTextNode(describeItem(item))));
  return svg;
}

// Yön oku; deg: 0 = yukarı, saat yönünde.
export function arrowSvg(deg, { size = 56, title } = {}) {
  return s(
    'svg',
    { viewBox: '0 0 100 100', width: size, height: size, class: 'arrow', role: 'img', focusable: 'false' },
    title ? s('title', {}, document.createTextNode(title)) : null,
    s(
      'g',
      { transform: `rotate(${deg} 50 50)` },
      s('path', {
        d: 'M50 10 L80 46 H61 V90 H39 V46 H20 Z',
        fill: 'currentColor',
        'stroke-linejoin': 'round',
      }),
    ),
  );
}

// Izgara üzerinde dolu hücrelerden oluşan parça. cells: [[r,c], ...], n: ızgara boyutu
export function pieceSvg(cells, n, { size = 84, title } = {}) {
  const cell = 100 / n;
  return s(
    'svg',
    { viewBox: '-2 -2 104 104', width: size, height: size, class: 'piece', role: 'img', focusable: 'false' },
    title ? s('title', {}, document.createTextNode(title)) : null,
    s('rect', { x: 0, y: 0, width: 100, height: 100, rx: 4, class: 'piece-bg' }),
    cells.map(([r, c]) =>
      s('rect', {
        x: c * cell + 1.5,
        y: r * cell + 1.5,
        width: cell - 3,
        height: cell - 3,
        rx: 3,
        class: 'piece-cell',
      }),
    ),
  );
}
