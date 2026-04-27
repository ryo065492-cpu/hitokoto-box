import type { Entry } from "@/domain/types";

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
  "写真"
];

const LIFE_IMPROVEMENT_KEYWORDS = [
  "献立",
  "買い物",
  "冷蔵庫",
  "洗剤",
  "片付け",
  "書類",
  "学校",
  "保育園",
  "予定",
  "家事"
];

const PRODUCT_PRINCIPLES = [
  "表は入れるだけ",
  "裏でまとめる",
  "家族に分類させない",
  "ホーム画面を静かに保つ",
  "家族の不満リストにしない"
];

export interface DeveloperPackEntry {
  id: string;
  text: string;
  source: Entry["source"];
  createdAt: string;
}

export interface DeveloperPack {
  generatedAt: string;
  version: string;
  entryCount: number;
  recentEntries: DeveloperPackEntry[];
  appImprovementEntries: DeveloperPackEntry[];
  lifeImprovementEntries: DeveloperPackEntry[];
  newTopics: string[];
  frequentThemes: string[];
  chatGptSummary: string;
  codexInstruction: string;
  familyBetaReview: string;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function toPackEntry(entry: Entry): DeveloperPackEntry {
  return {
    id: entry.id,
    text: entry.text,
    source: entry.source,
    createdAt: entry.createdAt
  };
}

function formatDate(value: string): string {
  if (!value) {
    return "日時不明";
  }

  return value.slice(0, 16).replace("T", " ");
}

function snippet(text: string, length = 80): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length)}...`;
}

function formatEntryLines(entries: DeveloperPackEntry[], limit = 50): string {
  const targetEntries = entries.slice(0, limit);

  if (!targetEntries.length) {
    return "- まだありません";
  }

  return targetEntries
    .map((entry, index) => `- ${index + 1}. ${formatDate(entry.createdAt)} / ${entry.source} / ${snippet(entry.text, 120)}`)
    .join("\n");
}

function keywordMatches(entries: DeveloperPackEntry[], keywords: string[]): Array<{ keyword: string; count: number }> {
  return keywords
    .map((keyword) => ({
      keyword,
      count: entries.filter((entry) => entry.text.includes(keyword)).length
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.keyword.localeCompare(right.keyword, "ja"));
}

function buildFrequentThemes(entries: DeveloperPackEntry[]): string[] {
  return keywordMatches(entries, [...APP_IMPROVEMENT_KEYWORDS, ...LIFE_IMPROVEMENT_KEYWORDS])
    .slice(0, 6)
    .map((item) => `${item.keyword}（${item.count}件）`);
}

function buildNewTopics(entries: DeveloperPackEntry[]): string[] {
  const uncategorized = entries.filter(
    (entry) =>
      !includesAny(entry.text, APP_IMPROVEMENT_KEYWORDS) &&
      !includesAny(entry.text, LIFE_IMPROVEMENT_KEYWORDS)
  );
  const repeated = keywordMatches(uncategorized, ["メール", "会議", "Excel", "エクセル", "調べ", "比較", "連絡", "掃除"])
    .filter((item) => item.count > 1)
    .map((item) => `${item.keyword}（${item.count}件）`);
  const uncategorizedSnippets = uncategorized.slice(0, 5).map((entry) => `未分類: ${snippet(entry.text, 40)}`);
  const topics = [...repeated, ...uncategorizedSnippets];

  return topics.length ? topics.slice(0, 8) : ["まだ大きな新規話題はありません"];
}

function formatPrinciples(): string {
  return PRODUCT_PRINCIPLES.map((principle) => `- ${principle}`).join("\n");
}

function topImprovementCandidates(
  appEntries: DeveloperPackEntry[],
  lifeEntries: DeveloperPackEntry[]
): string[] {
  const candidates = [
    appEntries[0] ? `入力体験の迷いを減らす: ${snippet(appEntries[0].text, 50)}` : undefined,
    lifeEntries[0] ? `生活の繰り返し負担を1つ軽くする: ${snippet(lifeEntries[0].text, 50)}` : undefined,
    appEntries[1] ? `確認や保存の安心感を見直す: ${snippet(appEntries[1].text, 50)}` : undefined,
    lifeEntries[1] ? `家族で試せる小さな仕組みにする: ${snippet(lifeEntries[1].text, 50)}` : undefined
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.length ? candidates.slice(0, 3) : ["まずは数日入力を続け、同じ困りごとが繰り返すかを見る"];
}

function buildChatGptSummary(
  version: string,
  recentEntries: DeveloperPackEntry[],
  appEntries: DeveloperPackEntry[],
  lifeEntries: DeveloperPackEntry[],
  newTopics: string[]
): string {
  return [
    "ChatGPTに相談するためのまとめ",
    "",
    "プロダクト名：ひとこと箱",
    `現在のバージョン：${version}`,
    "",
    "現在の思想",
    formatPrinciples(),
    "",
    "直近50件のひとこと",
    formatEntryLines(recentEntries, 50),
    "",
    "そのうちアプリ改善っぽいもの",
    formatEntryLines(appEntries, 20),
    "",
    "生活改善っぽいもの",
    formatEntryLines(lifeEntries, 20),
    "",
    "新しく出てきた話題",
    newTopics.map((topic) => `- ${topic}`).join("\n"),
    "",
    "相談したいこと",
    "- 何を改善すべきか",
    "- どれを今は触らないべきか",
    "- Codexに渡すならどう書くか",
    "- 家族の不満リストにせず、静かな受け皿として育てるには何を守るべきか"
  ].join("\n");
}

function buildCodexInstruction(
  version: string,
  appEntries: DeveloperPackEntry[],
  lifeEntries: DeveloperPackEntry[],
  frequentThemes: string[]
): string {
  return [
    `${version} または次バージョンとして直したいこと`,
    "",
    "実際の家族入力から見えた課題",
    formatEntryLines([...appEntries, ...lifeEntries].slice(0, 12), 12),
    "",
    "よく出たテーマ",
    frequentThemes.length ? frequentThemes.map((theme) => `- ${theme}`).join("\n") : "- まだ十分な傾向はありません",
    "",
    "守るべき思想",
    formatPrinciples(),
    "- 通常画面にAI分析、Codex、共有設定、カテゴリ選択を出さない",
    "",
    "変更してよい画面",
    "- /developer",
    "- /review",
    "- /weekly",
    "- /entries",
    "- /settings の奥まったデータ管理",
    "",
    "変更してはいけないこと",
    "- ホーム画面をダッシュボード化しない",
    "- 家族に分類や整理を求めない",
    "- 保存後に大量の提案を出さない",
    "- メンバー管理や共有設定を表に出さない",
    "",
    "受け入れ条件",
    "- ホーム画面は入れるだけのまま",
    "- 改善候補は裏側の画面にだけ出る",
    "- 直近の原文Entry.textを失わない",
    "- 家族が読んでも責められている感じがしない",
    "- 既存のlint/build/testが通る",
    "",
    "テスト項目",
    "- ホーム画面に追加文言が出ていない",
    "- developer側で改善材料をコピーできる",
    "- admin cookieなしでは裏側データを取得できない",
    "- review/weeklyは最大3件の思想を守る",
    "- Entry.text保存の既存テストが壊れていない"
  ].join("\n");
}

function buildFamilyBetaReview(
  recentEntries: DeveloperPackEntry[],
  appEntries: DeveloperPackEntry[],
  lifeEntries: DeveloperPackEntry[],
  frequentThemes: string[],
  improvementCandidates: string[]
): string {
  return [
    "家族内βレビュー",
    "",
    `入力件数：${recentEntries.length}件（直近50件まで）`,
    "",
    "最近の入力例",
    formatEntryLines(recentEntries, 8),
    "",
    "よく出たテーマ",
    frequentThemes.length ? frequentThemes.map((theme) => `- ${theme}`).join("\n") : "- まだ十分な傾向はありません",
    "",
    "使いにくさに関する声",
    formatEntryLines(appEntries, 8),
    "",
    "生活改善につながりそうな声",
    formatEntryLines(lifeEntries, 8),
    "",
    "次に試す改善候補トップ3",
    improvementCandidates.map((candidate, index) => `- ${index + 1}. ${candidate}`).join("\n"),
    "",
    "今はやらない方がいいこと",
    "- ホーム画面に分類、共有、AI分析を出す",
    "- 家族に入力ルールを覚えさせる",
    "- 一度に全部改善しようとする",
    "- センシティブな情報を入れる前提で運用を広げる"
  ].join("\n");
}

export function buildDeveloperPack(entries: Entry[], version = "v0.9"): DeveloperPack {
  const recentEntries = entries.slice(0, 50).map(toPackEntry);
  const appImprovementEntries = recentEntries.filter((entry) =>
    includesAny(entry.text, APP_IMPROVEMENT_KEYWORDS)
  );
  const lifeImprovementEntries = recentEntries.filter((entry) =>
    includesAny(entry.text, LIFE_IMPROVEMENT_KEYWORDS)
  );
  const frequentThemes = buildFrequentThemes(recentEntries);
  const newTopics = buildNewTopics(recentEntries);
  const improvementCandidates = topImprovementCandidates(appImprovementEntries, lifeImprovementEntries);

  return {
    generatedAt: new Date().toISOString(),
    version,
    entryCount: recentEntries.length,
    recentEntries,
    appImprovementEntries,
    lifeImprovementEntries,
    newTopics,
    frequentThemes,
    chatGptSummary: buildChatGptSummary(
      version,
      recentEntries,
      appImprovementEntries,
      lifeImprovementEntries,
      newTopics
    ),
    codexInstruction: buildCodexInstruction(version, appImprovementEntries, lifeImprovementEntries, frequentThemes),
    familyBetaReview: buildFamilyBetaReview(
      recentEntries,
      appImprovementEntries,
      lifeImprovementEntries,
      frequentThemes,
      improvementCandidates
    )
  };
}
