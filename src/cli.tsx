import React from "react";
import { render } from "ink";
import meow from "meow";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { App } from "./app.js";
import type { TabName } from "./types.js";

const cli = meow(
  `
  Usage
    $ claude-sessions

  Options
    --help       Show help
    --version    Show version
    --tab        Start on specific tab (1-2)

  Keyboard Shortcuts
    q            Quit
    Tab          Switch tabs
    1-2          Jump to tab
    j/k          Navigate rows
    /            Search sessions
    Enter        Session detail
    R            Resume session
    s            Cycle sort
    Ctrl+A       Toggle fuzzy/AI search
    ?            Help overlay
`,
  {
    importMeta: import.meta,
    flags: {
      tab: { type: "number" },
    },
  },
);

function main() {
  const claudeDir = path.join(os.homedir(), ".claude");
  if (!fs.existsSync(claudeDir)) {
    console.error("Error: ~/.claude directory not found.");
    console.error("Make sure Claude Code is installed and has been used at least once.");
    process.exit(1);
  }

  let initialTab: TabName | undefined;
  if (cli.flags.tab) {
    const tabs: TabName[] = ["Sessions", "Memory"];
    initialTab = tabs[cli.flags.tab - 1];
  }

  let resumeId: string | null = null;
  let resumeCwd: string | null = null;

  const instance = render(
    <App
      onResume={(sessionId, projectPath) => {
        resumeId = sessionId;
        resumeCwd = projectPath || null;
        instance.unmount();
      }}
      initialTab={initialTab}
    />,
    { patchConsole: false },
  );

  instance.waitUntilExit().then(() => {
    if (resumeId) {
      const cleanEnv = { ...process.env };
      delete cleanEnv.CLAUDECODE;
      try {
        execFileSync("claude", ["--dangerously-skip-permissions", "--resume", resumeId], {
          stdio: "inherit",
          env: cleanEnv,
          cwd: resumeCwd || undefined,
        });
      } catch {
        // claude exited with error, terminal output was already shown
      }
    }
  });
}

main();
