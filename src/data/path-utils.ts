import path from "node:path";
import os from "node:os";

export function getClaudeDir(): string {
  return path.join(os.homedir(), ".claude");
}

export function getProjectsDir(): string {
  return path.join(getClaudeDir(), "projects");
}

// The encoding is lossy: both "/" and "-" become "-" in directory names.
// We can't perfectly decode, but we can extract useful display names.
export function decodeProjectPath(encoded: string): string {
  const home = os.homedir(); // e.g., /Users/themadme
  const homeEncoded = home.replace(/\//g, "-"); // e.g., -Users-themadme

  // Strip the home prefix
  let remainder = encoded;
  if (encoded.startsWith(homeEncoded)) {
    remainder = encoded.slice(homeEncoded.length);
  }

  // Strip known directory prefixes (keep dashes intact -- they're likely part of names)
  if (remainder.startsWith("-Projects-")) {
    return remainder.slice("-Projects-".length);
  }
  if (remainder.startsWith("-Developer-")) {
    return remainder.slice("-Developer-".length);
  }
  if (remainder.startsWith("-code-")) {
    return remainder.slice("-code-".length);
  }

  // For paths directly under home (e.g., ~/.hermes -> "--hermes")
  if (remainder.startsWith("-")) {
    return remainder.slice(1);
  }

  // Fallback
  return remainder || encoded;
}

// Extract a display name from an actual filesystem path
export function projectNameFromPath(realPath: string): string {
  if (!realPath) return "-";
  const home = os.homedir();
  let rel = realPath;
  if (realPath.startsWith(home)) {
    rel = realPath.slice(home.length);
  }
  // Remove leading slash
  rel = rel.replace(/^\//, "");
  // If it's just "Projects" or "Developer", use "~" as name
  if (rel === "Projects" || rel === "Developer" || rel === "") {
    return "~";
  }
  // Remove leading Projects/ or Developer/ etc.
  rel = rel.replace(/^(Projects|Developer|code)\//, "");
  return rel || path.basename(realPath);
}
