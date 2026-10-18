// Oyun kaydı. Yeni oyun eklemek için: src/games/ altına ortak arayüzü uygulayan
// bir modül yaz ve aşağıdaki listeye ekle. Başka hiçbir dosyanın değişmesi gerekmez.
//
// Ortak arayüz:
//   definition                         { id, name, category, icon, description, howTo[], targetRtMs, options? }
//   createState({ rng, options })      oturum boyunca saklanan oyun durumu
//   nextRound(state, { rng, level })   yeni tur verisi (saf veri, DOM yok); round.key tekrar kontrolü içindir
//   evaluate(state, round, input)      { outcome, explanation?, extraBonus?, targetRtMs? }
//   render(ctx)                        turu ctx.root içine çizer, ctx.answer(input) ile cevap verir

import * as memoryGrid from './memoryGrid.js';
import * as quickMatch from './quickMatch.js';
import * as mentalMath from './mentalMath.js';
import * as dualFocus from './dualFocus.js';
import * as patternShift from './patternShift.js';
import * as logicCircuit from './logicCircuit.js';
import * as sequenceDetective from './sequenceDetective.js';
import * as wordSort from './wordSort.js';
import * as mentalRotation from './mentalRotation.js';

export const GAMES = [
  memoryGrid,
  quickMatch,
  mentalMath,
  dualFocus,
  patternShift,
  logicCircuit,
  sequenceDetective,
  wordSort,
  mentalRotation,
];

export const CATEGORIES = {
  memory: { name: 'Hafıza' },
  match: { name: 'Hızlı eşleştirme' },
  numeric: { name: 'Sayısal' },
  pattern: { name: 'Görsel örüntü' },
  attention: { name: 'Dikkat ve tepki' },
  verbal: { name: 'Sözel' },
  spatial: { name: 'Mekânsal' },
  logic: { name: 'Mantık' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

export const gameById = (id) => GAMES.find((g) => g.definition.id === id) || null;
export const gamesInCategory = (cat) => GAMES.filter((g) => g.definition.category === cat);
