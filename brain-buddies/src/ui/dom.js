// Küçük DOM yardımcıları. innerHTML kullanılmaz; metin her zaman textContent ile yazılır.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, String(v));
        else el.style[prop] = v;
      }
    }
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

// Numaralı seçenek düğmeleri. 1–9 tuşlarıyla da seçilebilir (ctx.onKey ile bağlanır).
// items: [{ content: Node|string, label: string, value }]
export function choiceGrid(ctx, items, onPick, { columns, className = '' } = {}) {
  let locked = false;
  const buttons = items.map((item, i) =>
    h(
      'button',
      {
        type: 'button',
        class: 'choice',
        'aria-label': `${i + 1}. seçenek: ${item.label}`,
        onclick: () => pick(i),
      },
      h('span', { class: 'choice-key', 'aria-hidden': 'true' }, i < 9 ? String(i + 1) : ''),
      item.content,
    ),
  );
  const grid = h(
    'div',
    {
      class: `choices ${className}`,
      role: 'group',
      'aria-label': 'Seçenekler',
      style: { '--cols': columns || Math.min(items.length, items.length === 4 ? 2 : 3) },
    },
    buttons,
  );
  function pick(i) {
    if (locked) return;
    locked = true;
    buttons.forEach((b) => (b.disabled = true));
    onPick(items[i].value, i, buttons[i]);
  }
  ctx.onKey((e) => {
    const n = Number.parseInt(e.key, 10);
    if (n >= 1 && n <= items.length) {
      pick(n - 1);
      return true;
    }
    return false;
  });
  return { el: grid, buttons, mark: (i, cls) => buttons[i]?.classList.add(cls) };
}
