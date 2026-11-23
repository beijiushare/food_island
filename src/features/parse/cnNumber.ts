/**
 * 中文数字 → number。
 * 支持：二、十二、二十、二十五、一百零五、半、一两半（后处理在 sentence.ts）
 */
const DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const DECADES: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
};

export function cnToNumber(input: string): number | null {
  const text = input.trim();
  if (text === '') return null;

  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);

  if (text === '半') return 0.5;

  // 「两」单独出现当作 2（两个鸡蛋 / 两碗饭）
  if (text === '两') return 2;

  let total = 0;
  let section = 0;
  let lastDigit = 0;
  let sawAnything = false;

  for (const ch of text) {
    if (ch in DIGITS) {
      lastDigit = DIGITS[ch];
      sawAnything = true;
      continue;
    }
    if (ch in DECADES) {
      const unit = DECADES[ch];
      section += (lastDigit === 0 ? 1 : lastDigit) * unit;
      lastDigit = 0;
      sawAnything = true;
      continue;
    }
    return null;
  }

  total = section + lastDigit;
  return sawAnything ? total : null;
}
