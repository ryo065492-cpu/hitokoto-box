export const APP_SCHEMA_VERSION = 1;

export interface FamilyMember {
  id: string;
  name: string;
  createdAt: string;
}

export type EntrySource = "text" | "voice" | "photo" | "mixed" | "ios_shortcut" | "ios_share_sheet";
export type EntryVisibility = "private" | "family";

export interface Entry {
  id: string;
  memberId: string;
  text: string;
  mediaIds: string[];
  source: EntrySource;
  visibility: EntryVisibility;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MediaItem {
  id: string;
  entryId: string;
  type: "image";
  mimeType: string;
  blob: Blob;
  width?: number;
  height?: number;
  createdAt: string;
}

export type AnalysisCategory =
  | "housework"
  | "shopping"
  | "paperwork"
  | "schedule"
  | "communication"
  | "work"
  | "app_feedback"
  | "automation_candidate"
  | "ai_candidate"
  | "habit"
  | "other";

export interface AnalysisTag {
  id: string;
  entryId: string;
  category: AnalysisCategory;
  label: string;
  confidence: number;
  hiddenFromNormalUi: boolean;
  createdAt: string;
}

export type WeeklyInsightCategory =
  | "life_improvement"
  | "ai_use"
  | "automation"
  | "family_operation"
  | "product_feedback";

export interface WeeklyInsight {
  id: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  summary: string;
  suggestedAction: string;
  category: WeeklyInsightCategory;
  sourceEntryIds: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

export type DeveloperNoteStatus = "new" | "planned" | "doing" | "done" | "archived";

export interface DeveloperNote {
  id: string;
  sourceEntryId: string;
  rawText: string;
  interpretedIssue: string;
  userPain: string;
  idealExperience: string;
  suggestedFix: string;
  acceptanceCriteria: string[];
  oneQuestionToAsk?: string;
  codexPrompt: string;
  status: DeveloperNoteStatus;
  createdAt: string;
}

export interface AppSettings {
  schemaVersion: number;
  familyMembers: FamilyMember[];
  defaultMemberId: string;
  /** quiet is a product premise in v0.1, not a user-facing mode switch. */
  quietMode: boolean;
}

export interface MediaExportItem {
  id: string;
  entryId: string;
  type: "image";
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: string;
  blobBase64?: string;
}

export interface ExportDataBundle {
  schemaVersion: number;
  exportedAt: string;
  settings: AppSettings;
  entries: Entry[];
  mediaItems: MediaExportItem[];
  analysisTags: AnalysisTag[];
  weeklyInsights: WeeklyInsight[];
  developerNotes: DeveloperNote[];
}

const DEFAULT_CREATED_AT = "2026-04-24T00:00:00.000Z";

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: "ryo", name: "諒", createdAt: DEFAULT_CREATED_AT },
  { id: "wife", name: "妻", createdAt: DEFAULT_CREATED_AT },
  { id: "family", name: "家族", createdAt: DEFAULT_CREATED_AT }
];

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: APP_SCHEMA_VERSION,
  familyMembers: DEFAULT_FAMILY_MEMBERS,
  defaultMemberId: DEFAULT_FAMILY_MEMBERS[0].id,
  quietMode: true
};
