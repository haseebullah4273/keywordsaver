export interface MainTarget {
  id: string;
  name: string;
  relevantKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordData {
  mainTargets: MainTarget[];
}

export interface BulkInputResult {
  added: string[];
  skipped: string[];
  duplicates: string[];
}