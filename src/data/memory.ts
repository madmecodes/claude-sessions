import fs from "node:fs/promises";
import path from "node:path";
import type { MemoryTree, MemoryFile } from "../types.js";
import { getClaudeDir, getProjectsDir, decodeProjectPath } from "./path-utils.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadMemoryTree(): Promise<MemoryTree> {
  const claudeDir = getClaudeDir();
  const projectsDir = getProjectsDir();
  const global: MemoryFile[] = [];
  const projects: MemoryTree["projects"] = [];

  // Global CLAUDE.md
  const globalClaudeMd = path.join(claudeDir, "CLAUDE.md");
  if (await exists(globalClaudeMd)) {
    global.push({
      path: globalClaudeMd,
      projectName: "(global)",
      fileName: "CLAUDE.md",
      type: "claude-md-global",
    });
  }

  // Per-project memory
  let dirs: string[];
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return { global, projects };
  }

  for (const dirName of dirs) {
    const memDir = path.join(projectsDir, dirName, "memory");
    const files: MemoryFile[] = [];

    try {
      const memFiles = await fs.readdir(memDir);
      for (const f of memFiles.filter((f) => f.endsWith(".md"))) {
        files.push({
          path: path.join(memDir, f),
          projectName: decodeProjectPath(dirName),
          fileName: f,
          type: "memory",
        });
      }
    } catch {
      // no memory dir
    }

    // Check for project-level CLAUDE.md
    const projectClaudeMd = path.join(projectsDir, dirName, "CLAUDE.md");
    if (await exists(projectClaudeMd)) {
      files.push({
        path: projectClaudeMd,
        projectName: decodeProjectPath(dirName),
        fileName: "CLAUDE.md",
        type: "claude-md-project",
      });
    }

    if (files.length > 0) {
      projects.push({
        projectName: decodeProjectPath(dirName),
        encodedPath: dirName,
        files,
      });
    }
  }

  // Sort projects alphabetically
  projects.sort((a, b) => a.projectName.localeCompare(b.projectName));

  return { global, projects };
}

export async function loadMemoryContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "(unable to read file)";
  }
}
