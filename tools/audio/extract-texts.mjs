// script.js のデータから「アプリが読み上げる可能性のある語・文」をすべて集め、
// tools/audio/texts.json に { key, text } の一覧として書き出す。
// speechText()/audioKey() は script.js の実装をそのまま使う（ブラウザ側とキーを一致させるため）。
//
// 使い方: node tools/audio/extract-texts.mjs
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// DOM を使う処理は何もしないスタブで吸収し、データ定義だけを評価する
const stub = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => "" : k === "length" ? 0 : stub),
  apply: () => stub,
  construct: () => stub,
  set: () => true,
});
const ctx = {
  console,
  URL,
  document: stub,
  navigator: { userAgent: "" },
  location: { href: "", search: "", hash: "", protocol: "file:" },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => stub,
  setTimeout: () => 0,
  clearTimeout() {},
  setInterval: () => 0,
  requestAnimationFrame() {},
  addEventListener() {},
  scrollTo() {},
  alert() {},
  confirm: () => false,
  Blob: function () {},
};
ctx.window = ctx;
ctx.self = ctx;
vm.createContext(ctx);
try {
  vm.runInContext(fs.readFileSync(path.join(root, "script.js"), "utf8"), ctx, { filename: "script.js" });
} catch (e) {
  // 末尾の画面初期化でスタブに無いAPIを呼んでも、データ定義は評価済みなので続行する
  console.warn("script.js の評価中に例外（データ抽出には影響なし）:", e.message);
}
const get = (expr) => vm.runInContext(expr, ctx);
const speechText = get("speechText");
const audioKey = get("audioKey");

const words = new Set();
const sentences = new Set();
const fill = (q) => {
  const correct = q.choices.find((c) => c.id === q.correctChoice);
  return correct ? q.sentence.replace(/_{2,}/, correct.text) : "";
};

// 1. 辞書（クイズの語彙・コロケーション・選択肢・補足語）— 単語ポップアップ・Flash Card
for (const entry of Object.values(get("DICTIONARY"))) {
  words.add(entry.word);
  if (entry.example) sentences.add(entry.example);
}

// 2. 語彙クイズ（全レベル）— 回答後の「文全体を聞く」・文の聴解・Flash Cardの例文
const quizBanks = ["QUESTION_BANK", "A2_EXTRA_QUESTION_BANK", "B1_QUESTION_BANK", "B2_QUESTION_BANK"];
for (const name of quizBanks) {
  for (const q of get(name)) {
    sentences.add(fill(q));
    for (const v of q.vocabulary) {
      words.add(v.word);
      if (v.example) sentences.add(v.example);
    }
    for (const c of q.choices) words.add(c.text);
    for (const c of q.collocations || []) words.add(c.expression);
  }
}

// 3. 並べ替え（全レベル）— 正解文の読み上げ
for (const name of ["BUILDER_BANK", "B1_BUILDER_BANK", "B2_BUILDER_BANK"]) {
  for (const q of get(name)) {
    sentences.add(q.w.join(" ").replace(/\s+([.,!?])/g, "$1"));
    if (q.key && q.key[0]) words.add(q.key[0]);
  }
}

// 4. その他の練習（会話・長文・読解）のキーフレーズ — 単語ポップアップ
// （*_BANK を script.js から機械的に拾うので、新しいバンクを足しても漏れない）
const bankNames = [...fs.readFileSync(path.join(root, "script.js"), "utf8").matchAll(/^const ([A-Z0-9_]+_BANK)\b/gm)]
  .map((m) => m[1])
  .filter((n) => !quizBanks.includes(n) && !/BUILDER/.test(n));
const walkKeys = (node) => {
  if (Array.isArray(node)) return node.forEach(walkKeys);
  if (node && typeof node === "object") {
    if (Array.isArray(node.key) && typeof node.key[0] === "string") words.add(node.key[0]);
    Object.values(node).forEach(walkKeys);
  }
};
bankNames.forEach((name) => walkKeys(get(name)));

// key（ハッシュ）ごとに1件へまとめる。音声は最初に出てきた表記で生成する
const items = new Map();
for (const [kind, set] of [["word", words], ["sentence", sentences]]) {
  for (const raw of set) {
    const text = speechText(raw);
    if (!text || !/[a-zà-ỹđ0-9]/i.test(text)) continue;
    const key = audioKey(text);
    const prev = items.get(key);
    if (prev && prev.text.toLowerCase() !== text.toLowerCase()) {
      throw new Error(`ハッシュ衝突: "${prev.text}" と "${text}"`);
    }
    if (!prev) items.set(key, { key, kind, text });
  }
}

const list = [...items.values()].sort((a, b) => a.key.localeCompare(b.key));
fs.writeFileSync(path.join(root, "tools/audio/texts.json"), JSON.stringify(list, null, 1) + "\n");
const count = (k) => list.filter((i) => i.kind === k).length;
console.log(`texts.json: ${list.length}件（語 ${count("word")} / 文 ${count("sentence")}）`);
