import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import path from "node:path";
import type { SessionEntry } from "../types.js";
import { getProjectsDir, decodeProjectPath, projectNameFromPath } from "./path-utils.js";

interface IndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

interface SessionsIndex {
  version: number;
  entries: IndexEntry[];
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join(" ");
  }
  return String(content);
}

async function scanFullSession(filePath: string, encodedName: string): Promise<SessionEntry | null> {
  try {
    const stat = await fs.stat(filePath);
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let sessionId = "";
    let firstPrompt = "";
    let gitBranch = "-";
    let version = "";
    let model = "";
    let created = "";
    let modified = "";
    let projectPath = "";
    let isSidechain = false;
    let messageCount = 0;
    const corpusParts: string[] = [];
    let corpusLen = 0;
    const CORPUS_MAX = 5000; // cap total corpus size

    for await (const line of rl) {
      try {
        const obj = JSON.parse(line);

        if (obj.type === "file-history-snapshot") continue;

        if (obj.isSidechain) {
          isSidechain = true;
          break;
        }

        if (obj.type === "user" && obj.sessionId && !sessionId) {
          sessionId = obj.sessionId;
          gitBranch = obj.gitBranch || "-";
          version = obj.version || "";
          projectPath = obj.cwd || "";
          if (obj.timestamp) created = obj.timestamp;
        }

        if (obj.type === "user" && !obj.isMeta && obj.message?.content) {
          messageCount++;
          const text = extractText(obj.message.content);
          if (!firstPrompt) {
            firstPrompt = text.slice(0, 200).replace(/\n/g, " ").trim();
          }
          // Add to search corpus
          if (corpusLen < CORPUS_MAX) {
            const chunk = text.slice(0, 500).replace(/\n/g, " ").trim();
            corpusParts.push(chunk);
            corpusLen += chunk.length;
          }
        }

        if (obj.type === "assistant") {
          messageCount++;
          if (obj.message?.model && !model) {
            model = obj.message.model;
          }
        }

        if (obj.timestamp) {
          modified = obj.timestamp;
        }
      } catch {
        // skip malformed lines
      }
    }

    stream.destroy();

    if (!sessionId || isSidechain) return null;

    return {
      sessionId,
      fullPath: filePath,
      firstPrompt: firstPrompt || "(no prompt)",
      searchCorpus: corpusParts.join(" ").slice(0, CORPUS_MAX),
      messageCount,
      created: created || stat.birthtime.toISOString(),
      modified: modified || stat.mtime.toISOString(),
      gitBranch,
      projectPath: projectPath || "",
      projectName: projectPath
        ? projectNameFromPath(projectPath)
        : decodeProjectPath(encodedName),
      model,
      version,
      approximate: false,
    };
  } catch {
    return null;
  }
}

async function loadFromIndex(projectDir: string, encodedName: string): Promise<SessionEntry[] | null> {
  // Skip the index -- we need full corpus from JSONL scan
  // The index only has firstPrompt, not full conversation text
  return null;
}

export async function loadAllSessions(): Promise<SessionEntry[]> {
  const projectsDir = getProjectsDir();

  let dirs: string[];
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const allSessions: SessionEntry[] = [];
  const concurrencyLimit = 10;

  // Process in batches
  for (let i = 0; i < dirs.length; i += concurrencyLimit) {
    const batch = dirs.slice(i, i + concurrencyLimit);

    const batchResults = await Promise.all(
      batch.map(async (dirName) => {
        const projectDir = path.join(projectsDir, dirName);
        const sessions: SessionEntry[] = [];

        try {
          const files = await fs.readdir(projectDir);
          const jsonls = files.filter(
            (f) => f.endsWith(".jsonl") && !f.startsWith(".")
          );

          const scanResults = await Promise.all(
            jsonls.map((f) => scanFullSession(path.join(projectDir, f), dirName))
          );

          for (const entry of scanResults) {
            if (entry) sessions.push(entry);
          }
        } catch {
          // skip unreadable dirs
        }

        return sessions;
      })
    );

    for (const result of batchResults) {
      allSessions.push(...result);
    }
  }

  // Sort by modified date descending
  allSessions.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );

  return allSessions;
}
