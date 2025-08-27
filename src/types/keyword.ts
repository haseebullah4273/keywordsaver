export interface RelevantKeyword {
  text: string;
  isDone: boolean;
  completedAt?: Date;
}

export interface MainTarget {
  id: string;
  name: string;
  relevantKeywords: RelevantKeyword[];
  isDone: boolean;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  category?: string;
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