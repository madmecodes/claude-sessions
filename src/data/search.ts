import Fuse from "fuse.js";
import { spawn } from "node:child_process";
import type { SessionEntry, SearchResult } from "../types.js";

let fuseInstance: Fuse<SessionEntry> | null = null;
let indexedSessions: SessionEntry[] = [];

export function buildSearchIndex(sessions: SessionEntry[]): void {
  indexedSessions = sessions;
  fuseInstance = new Fuse(sessions, {
    keys: [
      { name: "firstPrompt", weight: 0.4 },
      { name: "searchCorpus", weight: 0.35 },
      { name: "projectName", weight: 0.2 },
      { name: "gitBranch", weight: 0.05 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    useExtendedSearch: true,
    includeScore: true,
    includeMatches: true,
  });
}

export function fuzzySearch(query: string): SearchResult[] {
  if (!fuseInstance || !query.trim()) return [];

  const tokens = query.trim().split(/\s+/).filter(Boolean);

  const searchExpr = {
    $and: tokens.map((token) => ({
      $or: [
        { firstPrompt: token },
        { searchCorpus: token },
        { projectName: token },
        { gitBranch: token },
      ],
    })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return fuseInstance.search(searchExpr, { limit: 50 }).map((r) => ({
    session: r.item,
    matchScore: 1 - (r.score ?? 1),
    matchedText: r.matches?.[0]?.value ?? "",
    source: "fuzzy" as const,
  }));
}

function runClaude(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const proc = spawn("claude", ["--print", "-"], {
      env: cleanEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("timeout"));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`exit ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export async function aiSearch(
  query: string,
): Promise<SearchResult[]> {
  if (!indexedSessions.length || !query.trim()) return [];

  // Send up to 150 sessions with 600 chars of corpus each
  const sessionList = indexedSessions
    .slice(0, 150)
    .map(
      (s, i) =>
        `[${i}] ${s.projectName} | ${s.firstPrompt.slice(0, 100)} | ${s.searchCorpus.slice(0, 600)} | ${s.modified.slice(0, 10)}`
    )
    .join("\n");

  const prompt = `Given this search query: "${query}"

Return the indices of the most relevant sessions, ranked by relevance (most relevant first). Return ONLY a JSON array of numbers, nothing else. Maximum 20 results.

Sessions:
${sessionList}`;

  try {
    const stdout = await runClaude(prompt, 30_000);

    // Extract JSON array from response
    const match = stdout.match(/\[[\d,\s]+\]/);
    if (!match) return [];

    const indices: number[] = JSON.parse(match[0]);
    return indices
      .filter((i) => i >= 0 && i < indexedSessions.length)
      .slice(0, 20)
      .map((idx, rank) => ({
        session: indexedSessions[idx]!,
        matchScore: 1 - rank * 0.04,
        matchedText: indexedSessions[idx]!.firstPrompt,
        source: "ai" as const,
      }));
  } catch {
    return [];
  }
}
