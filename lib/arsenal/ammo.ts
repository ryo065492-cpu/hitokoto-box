import type { Entry } from "@/domain/types";

export type AmmoStatus = "unused" | "next" | "doing" | "parked" | "done";
export type AmmoPriority = "高" | "中" | "低";

export type AmmoKind =
  | "アプリ改善"
  | "生活改善"
  | "家事・買い物"
  | "書類・予定"
  | "家族運用"
  | "調査したいこと"
  | "Codex改修候補"
  | "ChatGPT相談候補";

export interface AmmoItemStatus {
  id: string;
  sourceEntryIds: string[];
  title: string;
  status: AmmoStatus;
  updatedAt: string;
}

export interface AmmoCard {
  id: string;
  sourceEntryIds: string[];
  title: string;
  kind: AmmoKind;
  sourceText: string;
  reason: string;
  nextStep: string;
  priority: AmmoPriority;
  status: AmmoStatus;
  chatGptPrompt: string;
  codexPrompt: string;
  familyQuestion: string;
}

export interface ArsenalSummary {
  entryCount: number;
  appImprovementCount: number;
  lifeImprovementCount: number;
  newTopics: string[];
  topThree: string[];
  doNotDo: string[];
}

export interface ArsenalView {
  generatedAt: string;
  cards: AmmoCard[];
  summary: ArsenalSummary;
}

const APP_IMPROVEMENT_KEYWORDS = [
  "画面",
  "ボタン",
  "入力",
  "保存",
  "分かりにくい",
  "わかりにくい",
  "使いにくい",
  "文字",
  "音声",
  "写真",
  "どこ",
  "見えない",
  "反応"
];

const LIFE_IMPROVEMENT_KEYWORDS = [
  "献立",
  "買い物",
  "冷蔵庫",
  "洗剤",
  "片付け",
  "掃除",
  "書類",
  "学校",
  "保育園",
  "予定",
  "家事"
];

const RESEARCH_KEYWORDS = ["調べたい", "比較", "どれがいい", "あとで見る", "旅行", "買うか迷う"];
const CODEX_KEYWORDS = ["アプリ", "画面", "入力", "保存", "削除", "確認", "使いにくい"];
const HOUSEWORK_KEYWORDS = ["献立", "買い物", "冷蔵庫", "洗剤", "片付け", "掃除", "家事"];
const PAPERWORK_KEYWORDS = ["書類", "学校", "保育園", "予定", "役所", "提出"];
const FAMILY_OPERATION_KEYWORDS = ["家族", "共有", "連絡", "お願い", "決める", "当番"];
const CHATGPT_KEYWORDS = ["相談", "迷う", "説明", "メール", "報告", "文章"];
const REPEAT_KEYWORDS = ["また", "毎回", "いつも", "よく", "毎週", "毎月"];

const DEFAULT_DO_NOT_DO = [
  "ホーム画面に弾薬庫や分析を出す",
  "家族に分類や整理を求める",
  "一度に全部改善しようとする",
  "誰かの不満リストとして扱う"
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function snippet(text: string, length = 44): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length)}...`;
}

function classifyEntry(entry: Entry): AmmoKind | undefined {
  const text = entry.text;

  if (includesAny(text, CODEX_KEYWORDS)) {
    return "Codex改修候補";
  }

  if (includesAny(text, RESEARCH_KEYWORDS)) {
    return "調査したいこと";
  }

  if (includesAny(text, HOUSEWORK_KEYWORDS)) {
    return "家事・買い物";
  }

  if (includesAny(text, PAPERWORK_KEYWORDS)) {
    return "書類・予定";
  }

  if (includesAny(text, FAMILY_OPERATION_KEYWORDS)) {
    return "家族運用";
  }

  if (includesAny(text, APP_IMPROVEMENT_KEYWORDS)) {
    return "アプリ改善";
  }

  if (includesAny(text, LIFE_IMPROVEMENT_KEYWORDS)) {
    return "生活改善";
  }

  if (includesAny(text, CHATGPT_KEYWORDS)) {
    return "ChatGPT相談候補";
  }

  return undefined;
}

function priorityFor(entry: Entry, kind: AmmoKind): AmmoPriority {
  if (includesAny(entry.text, REPEAT_KEYWORDS) || kind === "Codex改修候補") {
    return "高";
  }

  if (kind === "調査したいこと" || kind === "ChatGPT相談候補") {
    return "中";
  }

  return "中";
}

function scoreFor(entry: Entry, kind: AmmoKind): number {
  const priority = priorityFor(entry, kind);
  const repeatScore = includesAny(entry.text, REPEAT_KEYWORDS) ? 4 : 0;
  const kindScore = kind === "Codex改修候補" || kind === "家事・買い物" ? 3 : 2;
  const priorityScore = priority === "高" ? 5 : priority === "中" ? 3 : 1;

  return repeatScore + kindScore + priorityScore;
}

function titleFor(kind: AmmoKind, text: string): string {
  switch (kind) {
    case "Codex改修候補":
      return `アプリを直す弾: ${snippet(text, 28)}`;
    case "アプリ改善":
      return `使いやすさの弾: ${snippet(text, 28)}`;
    case "家事・買い物":
      return `家事を軽くする弾: ${snippet(text, 28)}`;
    case "書類・予定":
      return `迷いを減らす弾: ${snippet(text, 28)}`;
    case "家族運用":
      return `家族の回し方を整える弾: ${snippet(text, 28)}`;
    case "調査したいこと":
      return `調べものの弾: ${snippet(text, 28)}`;
    case "ChatGPT相談候補":
      return `相談してほどく弾: ${snippet(text, 28)}`;
    default:
      return `生活を楽にする弾: ${snippet(text, 28)}`;
  }
}

function reasonFor(kind: AmmoKind, text: string): string {
  if (includesAny(text, REPEAT_KEYWORDS)) {
    return "繰り返し出ている困りごとなので、小さく直すだけでも効きそうです。";
  }

  switch (kind) {
    case "Codex改修候補":
    case "アプリ改善":
      return "入力や確認の負担に関わる声なので、ひとこと箱自体を静かに使いやすくできます。";
    case "家事・買い物":
    case "生活改善":
      return "日常の小さな面倒を減らせる可能性があります。";
    case "書類・予定":
      return "迷いや確認の手間を減らす仕組みにしやすい内容です。";
    case "調査したいこと":
      return "比較や調査をまとめれば、あとで判断しやすくなります。";
    case "家族運用":
      return "人を責めずに、家族の回し方を少し楽にできそうです。";
    default:
      return "まだ形は粗いですが、相談材料として使えそうです。";
  }
}

function nextStepFor(kind: AmmoKind): string {
  switch (kind) {
    case "Codex改修候補":
    case "アプリ改善":
      return "Codexに渡す前に、ホーム画面をうるさくしない受け入れ条件を1つ決める。";
    case "家事・買い物":
    case "生活改善":
      return "家族に1問だけ確認して、今週1つだけ試す形にする。";
    case "書類・予定":
      return "迷う場面を1つに絞り、テンプレやチェックリスト化できるか見る。";
    case "調査したいこと":
      return "ChatGPTに比較軸を作ってもらい、決めるための材料にする。";
    case "家族運用":
      return "誰かを担当にせず、仕組みで楽にできる聞き方をする。";
    default:
      return "まずはChatGPTに整理してもらい、今やるか寝かせるか決める。";
  }
}

function promptHeader(): string {
  return [
    "これはひとこと箱の改善候補です。",
    "プロダクト思想を守りながら、次にどう扱うべきか整理してください。",
    "守る思想: 表は入れるだけ / 裏でまとめる / 家族に分類させない / ホーム画面を静かに保つ / 家族の不満リストにしない"
  ].join("\n");
}

function buildChatGptPrompt(card: Omit<AmmoCard, "chatGptPrompt" | "codexPrompt" | "familyQuestion">): string {
  return [
    promptHeader(),
    "",
    `種類: ${card.kind}`,
    `優先度: ${card.priority}`,
    `元のひとこと: ${card.sourceText}`,
    `なぜ使えそうか: ${card.reason}`,
    `次の一手: ${card.nextStep}`,
    "",
    "お願い:",
    "- 今やるべきか、寝かせるべきかを判断してください",
    "- 家族を責めない言い方にしてください",
    "- 必要ならCodexに渡す短い指示に変換してください"
  ].join("\n");
}

function buildCodexPrompt(card: Omit<AmmoCard, "chatGptPrompt" | "codexPrompt" | "familyQuestion">): string {
  return [
    "v0.xxとして以下の改善を実装してください。ただしホーム画面はうるさくしないでください。",
    "",
    `改善候補: ${card.title}`,
    `種類: ${card.kind}`,
    `元のひとこと: ${card.sourceText}`,
    `なぜ使えそうか: ${card.reason}`,
    `次の一手: ${card.nextStep}`,
    "",
    "守ること:",
    "- ホーム画面に分類、共有、AI分析、Codex文言を出さない",
    "- 保存後に大量の提案を出さない",
    "- 原文Entry.textを最優先に守る",
    "- 変更は裏側画面か小さなUX改善に留める",
    "",
    "受け入れ条件:",
    "- lint/build/test が通る",
    "- ホーム画面の静けさが壊れていない",
    "- 既存データの読み込みが壊れていない"
  ].join("\n");
}

function buildFamilyQuestion(card: Omit<AmmoCard, "chatGptPrompt" | "codexPrompt" | "familyQuestion">): string {
  return `これ、もう少し楽にできたら助かる？それとも今は気にしなくていい？\n\n「${snippet(card.sourceText, 80)}」`;
}

function toCard(entry: Entry, kind: AmmoKind, status?: AmmoStatus): AmmoCard {
  const base = {
    id: `ammo_${entry.id}`,
    sourceEntryIds: [entry.id],
    title: titleFor(kind, entry.text),
    kind,
    sourceText: entry.text,
    reason: reasonFor(kind, entry.text),
    nextStep: nextStepFor(kind),
    priority: priorityFor(entry, kind),
    status: status ?? "unused"
  };

  return {
    ...base,
    chatGptPrompt: buildChatGptPrompt(base),
    codexPrompt: buildCodexPrompt(base),
    familyQuestion: buildFamilyQuestion(base)
  };
}

function countMatches(entries: Entry[], keywords: string[]): number {
  return entries.filter((entry) => includesAny(entry.text, keywords)).length;
}

function newTopics(entries: Entry[]): string[] {
  const topics = entries
    .filter(
      (entry) =>
        !includesAny(entry.text, APP_IMPROVEMENT_KEYWORDS) &&
        !includesAny(entry.text, LIFE_IMPROVEMENT_KEYWORDS) &&
        !includesAny(entry.text, RESEARCH_KEYWORDS)
    )
    .slice(0, 5)
    .map((entry) => snippet(entry.text, 42));

  return topics.length ? topics : ["まだ大きな新規話題はありません"];
}

function buildSummary(entries: Entry[], cards: AmmoCard[]): ArsenalSummary {
  return {
    entryCount: entries.length,
    appImprovementCount: countMatches(entries, APP_IMPROVEMENT_KEYWORDS),
    lifeImprovementCount: countMatches(entries, LIFE_IMPROVEMENT_KEYWORDS),
    newTopics: newTopics(entries),
    topThree: cards.slice(0, 3).map((card) => card.title),
    doNotDo: DEFAULT_DO_NOT_DO
  };
}

export function buildArsenalView(
  entries: Entry[],
  statuses: Record<string, AmmoStatus> = {}
): ArsenalView {
  const scoredCards = entries
    .slice(0, 50)
    .map((entry, index) => {
      const kind = classifyEntry(entry);

      if (!kind) {
        return undefined;
      }

      return {
        index,
        score: scoreFor(entry, kind),
        card: toCard(entry, kind, statuses[`ammo_${entry.id}`])
      };
    })
    .filter((item): item is { index: number; score: number; card: AmmoCard } => Boolean(item))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const cards = scoredCards.slice(0, 5).map((item) => item.card);

  return {
    generatedAt: new Date().toISOString(),
    cards,
    summary: buildSummary(entries.slice(0, 50), cards)
  };
}
