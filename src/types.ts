export interface SessionEntry {
  sessionId: string;
  fullPath: string;
  firstPrompt: string;
  searchCorpus: string; // all user messages concatenated for deep search
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  projectName: string;
  model: string;
  version: string;
  approximate: boolean;
}

export interface MemoryFile {
  path: string;
  projectName: string;
  fileName: string;
  type: "memory" | "claude-md-global" | "claude-md-project";
}

export interface MemoryProject {
  projectName: string;
  encodedPath: string;
  files: MemoryFile[];
}

export interface MemoryTree {
  global: MemoryFile[];
  projects: MemoryProject[];
}

export interface SearchResult {
  session: SessionEntry;
  matchScore: number;
  matchedText: string;
  source: "fuzzy" | "ai";
}

export type TabName = "Sessions" | "Memory";

export interface Column {
  key: string;
  label: string;
  width?: number;
  color?: (value: string, row: Record<string, unknown>) => string | undefined;
}
