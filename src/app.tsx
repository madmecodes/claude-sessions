import React, { useState, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./components/header.js";
import { TabBar } from "./components/tab-bar.js";
import { SessionsScreen } from "./screens/sessions.js";
import { MemoryScreen } from "./screens/memory.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { useDataLoader } from "./hooks/use-data-loader.js";
import { loadAllSessions } from "./data/sessions.js";
import type { TabName } from "./types.js";

const TABS: TabName[] = ["Sessions", "Memory"];
const CHROME_HEIGHT = 8;

interface AppProps {
  onResume: (sessionId: string, projectPath: string) => void;
  initialTab?: TabName;
}

export function App({ onResume, initialTab }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [activeTab, setActiveTab] = useState<TabName>(initialTab ?? "Sessions");
  const [showHelp, setShowHelp] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  const { data: sessions, loading, error, refresh } = useDataLoader(loadAllSessions);

  const sessionList = sessions ?? [];
  const contentHeight = Math.max(5, rows - CHROME_HEIGHT);

  const projectCount = useMemo(() => {
    const names = new Set(sessionList.map((s) => s.projectName));
    return names.size;
  }, [sessionList]);

  useInput((input, key) => {
    if (input === "q" && !(activeTab === "Sessions" && sessionsBusy)) {
      exit();
      return;
    }

    if (input === "?") {
      setShowHelp((prev) => !prev);
      return;
    }

    if (showHelp) return;

    if (key.tab) {
      const idx = TABS.indexOf(activeTab);
      if (key.shift) {
        setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length]!);
      } else {
        setActiveTab(TABS[(idx + 1) % TABS.length]!);
      }
      return;
    }

    const num = parseInt(input, 10);
    if (num >= 1 && num <= TABS.length) {
      setActiveTab(TABS[num - 1]!);
    }
  });

  if (showHelp) {
    return (
      <Box flexDirection="column" height={rows} width={columns}>
        <Header sessionCount={sessionList.length} projectCount={projectCount} />
        <Box flexDirection="column" paddingX={2} paddingY={1} borderStyle="round" borderColor="cyan" flexGrow={1}>
          <Text bold color="cyan">Keyboard Shortcuts</Text>
          <Text />
          <Text><Text bold>q / Ctrl+C</Text>       Quit</Text>
          <Text><Text bold>Tab / Shift+Tab</Text>   Cycle tabs</Text>
          <Text><Text bold>1-2</Text>               Jump to tab</Text>
          <Text><Text bold>j/k / arrows</Text>      Navigate rows</Text>
          <Text><Text bold>G</Text>                 Jump to bottom</Text>
          <Text><Text bold>PgUp/PgDn</Text>         Page up/down</Text>
          <Text />
          <Text bold color="cyan">Sessions Tab</Text>
          <Text><Text bold>/</Text>                 Search sessions</Text>
          <Text><Text bold>Ctrl+A</Text>            Toggle fuzzy/AI search</Text>
          <Text><Text bold>Enter</Text>             Show session detail</Text>
          <Text><Text bold>R</Text>                 Resume selected session</Text>
          <Text><Text bold>s</Text>                 Cycle sort mode</Text>
          <Text><Text bold>f</Text>                 Refresh data</Text>
          <Text><Text bold>Esc</Text>               Clear search / close detail</Text>
          <Text />
          <Text bold color="cyan">Memory Tab</Text>
          <Text><Text bold>Enter</Text>             Expand/collapse project</Text>
          <Text><Text bold>h/l</Text>               Switch pane focus</Text>
          <Text />
          <Text dimColor>Press ? to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows} width={columns}>
      <Header sessionCount={sessionList.length} projectCount={projectCount} />
      <TabBar tabs={TABS} activeTab={activeTab} />
      <Box borderStyle="single" borderTop={false} flexDirection="column" flexGrow={1}>
        {activeTab === "Sessions" && (
          <SessionsScreen
            active={activeTab === "Sessions"}
            contentHeight={contentHeight}
            terminalWidth={columns}
            sessions={sessionList}
            loading={loading}
            error={error}
            onResume={onResume}
            onRefresh={refresh}
            onBusyChange={setSessionsBusy}
          />
        )}
        {activeTab === "Memory" && (
          <MemoryScreen
            active={activeTab === "Memory"}
            contentHeight={contentHeight}
            terminalWidth={columns}
          />
        )}
      </Box>
    </Box>
  );
}
