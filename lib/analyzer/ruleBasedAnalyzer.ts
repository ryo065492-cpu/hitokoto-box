import type {
  AnalysisCategory,
  AnalysisTag,
  DeveloperNote,
  Entry,
  WeeklyInsight,
  WeeklyInsightCategory
} from "@/domain/types";
import { getWeekRange, isWithinWeek } from "@/lib/dates/week";
import { createId } from "@/lib/utils/id";
import type { AnalysisResult, Analyzer } from "@/lib/analyzer/analyzer";

const RULES: Array<{
  keywords: string[];
  matches?: RegExp[];
  categories: AnalysisCategory[];
}> = [
  {
    keywords: ["また", "毎回", "いつも", "毎週", "毎月", "よく"],
    categories: ["habit", "automation_candidate"]
  },
  {
    keywords: ["冷蔵庫", "買い物", "スーパー", "献立", "食材"],
    categories: ["shopping", "housework"]
  },
  {
    keywords: ["書類", "申請", "保育園", "学校", "役所", "提出"],
    categories: ["paperwork"]
  },
  {
    keywords: ["会議", "メール", "報告", "説明", "相談", "上司", "部長"],
    categories: ["communication", "work", "ai_candidate"]
  },
  {
    keywords: ["Excel", "エクセル", "CSV", "表", "集計", "転記", "数字"],
    categories: ["automation_candidate", "ai_candidate", "work"]
  },
  {
    keywords: ["画面", "ボタン", "保存", "使いにくい", "わかりにくい", "邪魔", "前のほうが"],
    categories: ["app_feedback"]
  },
  {
    keywords: ["調べ", "比較", "どれがいい", "サービス", "価格"],
    categories: ["ai_candidate"]
  }
];

const CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  housework: "家のこと",
  shopping: "買い物まわり",
  paperwork: "書類や提出ごと",
  schedule: "予定まわり",
  communication: "連絡や会話",
  work: "仕事まわり",
  app_feedback: "画面や使い心地の違和感",
  automation_candidate: "くり返しの手間",
  ai_candidate: "相談や下書きに回せそう",
  habit: "何度も起きている",
  other: "まだ分類しない"
};

const CATEGORY_PRIORITY: AnalysisCategory[] = [
  "app_feedback",
  "automation_candidate",
  "ai_candidate",
  "shopping",
  "housework",
  "paperwork",
  "communication",
  "work",
  "habit",
  "schedule",
  "other"
];

const INSIGHT_COPY: Record<
  AnalysisCategory,
  {
    title: string;
    summary: (count: number) => string;
    suggestedAction: string;
    category: WeeklyInsightCategory;
  }
> = {
  shopping: {
    title: "買い物まわりで迷いが重なっています",
    summary: (count) => `買い物や献立まわりのひとことが今週 ${count} 回ありました。`,
    suggestedAction: "冷蔵庫前で困る内容を1つだけ先にメモしておく",
    category: "life_improvement"
  },
  housework: {
    title: "家の中の段取りを軽くできそうです",
    summary: (count) => `家事にまつわる手間が今週 ${count} 回出てきました。`,
    suggestedAction: "いちばん面倒だった流れを1つだけ短くする",
    category: "family_operation"
  },
  paperwork: {
    title: "書類まわりの迷いが続いています",
    summary: (count) => `書類や提出の話題が今週 ${count} 回ありました。`,
    suggestedAction: "次に書く書類の見本を1つだけ残しておく",
    category: "life_improvement"
  },
  communication: {
    title: "連絡文の下書きを助ける余地があります",
    summary: (count) => `会議後のメールや説明の迷いが今週 ${count} 回ありました。`,
    suggestedAction: "よく使う連絡文のたたきを1つだけ作る",
    category: "ai_use"
  },
  work: {
    title: "仕事の整理に小さな補助が効きそうです",
    summary: (count) => `仕事まわりの迷いが今週 ${count} 回出てきました。`,
    suggestedAction: "毎回迷う報告を1つだけ定型化する",
    category: "ai_use"
  },
  app_feedback: {
    title: "画面まわりの違和感が繰り返し出ています",
    summary: (count) => `このアプリの使い心地に関する声が今週 ${count} 回ありました。`,
    suggestedAction: "いちばん不安になる場面を1つだけ先に直す",
    category: "product_feedback"
  },
  automation_candidate: {
    title: "同じ手間を減らせる可能性があります",
    summary: (count) => `くり返し起きる面倒ごとが今週 ${count} 回ありました。`,
    suggestedAction: "手順の多い作業を1つだけ自動化候補として見る",
    category: "automation"
  },
  ai_candidate: {
    title: "相談や下書きを任せやすい場面があります",
    summary: (count) => `AIに相談しやすい内容が今週 ${count} 回出てきました。`,
    suggestedAction: "相談したい内容を1つだけ短く言い換えてみる",
    category: "ai_use"
  },
  habit: {
    title: "同じ種類の負担が続いています",
    summary: (count) => `何度も出てくる困りごとが今週 ${count} 回ありました。`,
    suggestedAction: "くり返し起きる流れを1つだけ止める工夫を試す",
    category: "family_operation"
  },
  schedule: {
    title: "予定まわりの整理余地があります",
    summary: (count) => `予定に関するひとことが今週 ${count} 回ありました。`,
    suggestedAction: "次の予定確認を1つだけ短くする",
    category: "family_operation"
  },
  other: {
    title: "まだ分類しない違和感があります",
    summary: (count) => `ことばになりきっていない種が今週 ${count} 回ありました。`,
    suggestedAction: "気になる場面を1つだけ言い換えて残す",
    category: "life_improvement"
  }
};

function detectCategories(text: string): AnalysisCategory[] {
  if (!text.trim()) {
    return [];
  }

  const found = new Set<AnalysisCategory>();

  for (const rule of RULES) {
    const matchedKeyword = rule.keywords.some((keyword) => text.includes(keyword));
    const matchedPattern = rule.matches?.some((pattern) => pattern.test(text)) ?? false;

    if (matchedKeyword || matchedPattern) {
      rule.categories.forEach((category) => found.add(category));
    }
  }

  if (found.size === 0) {
    found.add("other");
  }

  return CATEGORY_PRIORITY.filter((category) => found.has(category));
}

function buildTag(entryId: string, category: AnalysisCategory, createdAt: string): AnalysisTag {
  return {
    id: createId("tag"),
    entryId,
    category,
    label: CATEGORY_LABELS[category],
    confidence: category === "other" ? 0.34 : 0.74,
    hiddenFromNormalUi: true,
    createdAt
  };
}

function buildDeveloperNote(entry: Entry): DeveloperNote {
  const text = entry.text;
  const lower = text.toLowerCase();

  let interpretedIssue = "画面上で迷いや違和感が起きている";
  let userPain = "使えないわけではないが、触るたびに小さく疲れる。";
  let idealExperience = "家族が迷わず操作できて、終わった後に安心して閉じられる。";
  let suggestedFix = "違和感の出た場面を1つに絞って、表示や文言を静かに整える。";
  let acceptanceCriteria = [
    "迷いや不安が出た操作の直後に短い安心材料が見える",
    "追加の説明を読まなくても次の行動が分かる",
    "画面をうるさくせずに違和感が減る"
  ];
  let oneQuestionToAsk = "どの瞬間にいちばん不安になりますか？";

  if (text.includes("保存") && (text.includes("不安") || text.includes("残った") || text.includes("分から"))) {
    interpretedIssue = "保存完了のフィードバックが弱い";
    userPain = "保存できたのか確信が持てず、閉じてよいか迷ってしまう。";
    idealExperience = "保存後にひと目で安心できて、そのまま閉じられる。";
    suggestedFix = "保存成功メッセージと直近の保存確認を短く表示する。";
    acceptanceCriteria = [
      "保存成功時に『残しました』と表示される",
      "表示は数秒で消え、画面を邪魔しない",
      "あとで見る画面で直近の保存内容を確認できる"
    ];
    oneQuestionToAsk = "保存後に見えたら安心できる情報は何ですか？";
  } else if (text.includes("ボタン") || lower.includes("button")) {
    interpretedIssue = "操作要素が多く、判断コストが高い";
    userPain = "どれを押せばよいか一瞬迷い、触る気持ちが少し重くなる。";
    idealExperience = "今必要な操作だけが自然に見えて、迷わず進める。";
    suggestedFix = "優先度の低い操作を奥に寄せて、主操作だけを前に出す。";
    acceptanceCriteria = [
      "最初に見る操作は主要な1つか2つに絞られている",
      "補助操作は必要なときだけ見つけられる",
      "初見でも押す順番に迷いにくい"
    ];
    oneQuestionToAsk = "特にいらないと感じるボタンはどれですか？";
  } else if (text.includes("前のほうが")) {
    interpretedIssue = "変更後の体験が以前より分かりにくく感じられている";
    userPain = "変化の理由が分からず、慣れていた流れを失った感覚がある。";
    idealExperience = "変わっても前より自然で、迷いが増えない。";
    suggestedFix = "変化で失った分かりやすさを戻す部分を特定して改善する。";
    acceptanceCriteria = [
      "以前より分かりやすいかを比較できる",
      "主要な操作の見つけやすさが戻る",
      "変更理由を知らなくても使いやすい"
    ];
    oneQuestionToAsk = "前のほうがよかったのは、見つけやすさと流れのどちらですか？";
  }

  return {
    id: createId("devnote"),
    sourceEntryId: entry.id,
    rawText: text,
    interpretedIssue,
    userPain,
    idealExperience,
    suggestedFix,
    acceptanceCriteria,
    oneQuestionToAsk,
    codexPrompt: [
      "ひとこと箱の体験改善を行ってください。",
      `元の声: ${text}`,
      `課題: ${interpretedIssue}`,
      `理想の体験: ${idealExperience}`,
      `改善案: ${suggestedFix}`,
      `受け入れ条件: ${acceptanceCriteria.join(" / ")}`
    ].join("\n"),
    status: "new",
    createdAt: entry.createdAt
  };
}

function toInsightPriority(count: number): WeeklyInsight["priority"] {
  if (count >= 5) {
    return 5;
  }
  if (count === 4) {
    return 4;
  }
  if (count === 3) {
    return 3;
  }
  if (count === 2) {
    return 2;
  }
  return 1;
}

export class RuleBasedAnalyzer implements Analyzer {
  analyzeEntry(entry: Entry): AnalysisResult {
    const categories = detectCategories(entry.text);
    const tags = categories.map((category) => buildTag(entry.id, category, entry.createdAt));
    const developerNotes = categories.includes("app_feedback") ? [buildDeveloperNote(entry)] : [];

    return {
      tags,
      developerNotes
    };
  }

  generateWeeklyInsights(entries: Entry[]): WeeklyInsight[] {
    const weeklyEntries = entries.filter((entry) => isWithinWeek(entry.createdAt, new Date()));
    const categoryMap = new Map<
      AnalysisCategory,
      {
        count: number;
        entryIds: string[];
      }
    >();

    for (const entry of weeklyEntries) {
      const categories = detectCategories(entry.text);

      for (const category of categories) {
        const current = categoryMap.get(category) ?? { count: 0, entryIds: [] };
        current.count += 1;
        current.entryIds.push(entry.id);
        categoryMap.set(category, current);
      }
    }

    const sorted = [...categoryMap.entries()]
      .filter(([, info]) => info.count > 1)
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, 3);

    const { weekStart, weekEnd } = getWeekRange(new Date());

    return sorted.map(([category, info]) => {
      const copy = INSIGHT_COPY[category];

      return {
        id: createId("insight"),
        weekStart,
        weekEnd,
        title: copy.title,
        summary: copy.summary(info.count),
        suggestedAction: copy.suggestedAction,
        category: copy.category,
        sourceEntryIds: info.entryIds,
        priority: toInsightPriority(info.count),
        createdAt: new Date().toISOString()
      };
    });
  }

  generateDeveloperNotes(entries: Entry[]): DeveloperNote[] {
    return entries
      .flatMap((entry) => this.analyzeEntry(entry).developerNotes)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
