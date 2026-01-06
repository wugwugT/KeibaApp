// src/services/ocr/index.ts

import ExpoImageRecogniseText from 'expo-image-recognise-text';

export type OCRParsed = {
  place: string | null;
  race_no: number | null;
  total_investment: number | null;
  raw_text: string;
};

export async function extractJRAItemsFromOCR(base64: string): Promise<OCRParsed> {
  const withPrefix = base64.startsWith('data:')
    ? base64
    : `data:image/jpeg;base64,${base64}`;

  // 画像 → テキスト
  const text = await ExpoImageRecogniseText.recognizeTextFromBase64Async(withPrefix);
  const rawText =
    Array.isArray(text)
      ? text.map((t: any) => t.text ?? t).join(' ')
      : String(text ?? '');

  console.log('OCR raw text:', rawText);

  // 改行・連続スペースを1つに
  const normalized = rawText.replace(/\s+/g, ' ');

  // 場名（取れたらラッキー。nullでもOK運用）
  const placeMatch = normalized.match(/(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)/);
  const place = placeMatch ? placeMatch[1] : null;

  // レース番号（9レース / 9R / 9H 誤読など）
  const raceMatch =
    normalized.match(/(\d{1,2})\s*レース/) ||
    normalized.match(/(\d{1,2})R/) ||
    normalized.match(/(\d{1,2})H/);

  const race_no = raceMatch ? Number(raceMatch[1]) : null;

  // 金額候補抽出：100〜20000の3〜4桁数字だけ拾う
  const moneyCandidates = [...normalized.matchAll(/([1-9]\d{2,3})[^\d]/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((n) => n >= 100 && n <= 20000);

  // 1000の倍数を最優先 → 100の倍数 → それ以外
  const thousandUnit = moneyCandidates.filter((n) => n % 1000 === 0);
  const hundredUnit = moneyCandidates.filter((n) => n % 100 === 0 && n % 1000 !== 0);

  const picked =
    (thousandUnit.length
      ? thousandUnit[thousandUnit.length - 1]
      : hundredUnit.length
      ? hundredUnit[hundredUnit.length - 1]
      : moneyCandidates[moneyCandidates.length - 1] ?? null);

  const total_investment = picked ?? null;

  const parsed: OCRParsed = {
    place,
    race_no,
    total_investment,
    raw_text: rawText,
  };

  console.log('OCR JRA parsed:', parsed);

  return parsed;
}

export function isValidOCRData(data: OCRParsed | null | undefined): boolean {
  if (!data) return false;
  // A路線：金額 or レース番号どちらか取れれば「補助入力」としてOK
  return !!data.total_investment || !!data.race_no;
}
