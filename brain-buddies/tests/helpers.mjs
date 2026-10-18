// Test yardımcıları: sahte saat ve her oyun için "doğru" / "yanlış" cevap üreticileri.

export function fakeClock(start = 1000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => {
    t += ms;
    return t;
  };
  return now;
}

export function correctInput(gameId, round) {
  switch (gameId) {
    case 'memoryGrid':
      return { picks: round.targets.slice() };
    case 'dualFocus':
      return { pressed: round.target };
    case 'logicCircuit':
      return { choice: round.options.indexOf(round.answer) };
    case 'patternShoot':
      return { picks: round.cells.slice() };
    case 'alphaSort':
      return { picks: round.order.slice() };
    case 'bubbles':
      return { picks: round.order.slice() };
    case 'numberHunt':
      return { picks: round.solution.slice() };
    case 'dontDrop':
      return { kind: 'pop' };
    case 'freezeAlien':
      return { kind: 'freeze', isTarget: true };
    default:
      return { choice: round.answer };
  }
}

export function wrongInput(gameId, round) {
  switch (gameId) {
    case 'memoryGrid': {
      const total = round.size * round.size;
      const miss = [...Array(total).keys()].find((i) => !round.targets.includes(i));
      return { picks: [miss] };
    }
    case 'dualFocus':
      return { pressed: !round.target };
    case 'logicCircuit': {
      const right = round.options.indexOf(round.answer);
      return { choice: right === 0 ? 1 : 0 };
    }
    case 'patternShoot':
      return { picks: [[...Array(round.size * round.size).keys()].find((i) => !round.cells.includes(i))] };
    case 'alphaSort':
    case 'bubbles':
      return { picks: [round.order[1]] };
    case 'numberHunt': {
      const others = round.numbers.map((_, i) => i).filter((i) => !round.solution.includes(i));
      return { picks: others.slice(0, round.solution.length) };
    }
    case 'gearWheel':
      return { choice: (round.answer + 1) % round.gears.length };
    case 'dontDrop':
      return { kind: 'wrong' };
    case 'freezeAlien':
      return { kind: 'freeze', isTarget: false };
    default: {
      const count = (round.options || round.items || round.choices || round.bins || round.words).length;
      return { choice: (round.answer + 1) % count };
    }
  }
}
