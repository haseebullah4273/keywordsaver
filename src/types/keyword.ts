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
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordData {
  mainTargets: MainTarget[];
  folders: Folder[];
}

export interface BulkInputResult {
  added: string[];
  skipped: string[];
  duplicates: string[];
}