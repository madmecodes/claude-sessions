import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Table } from "../components/table.js";
import { KeyHint } from "../components/key-hint.js";
import { useSelectedRow } from "../hooks/use-selected-row.js";
import { buildSearchIndex, fuzzySearch, aiSearch } from "../data/search.js";
import { timeAgo, shortModel } from "../utils/format.js";
import type { SessionEntry, Column } from "../types.js";

type SortMode = "recent" | "messages" | "project";
// typing: user is typing in the search bar
// results: search done, user navigates results
type SearchPhase = "off" | "typing" | "results";

interface SessionsScreenProps {
  active: boolean;
  contentHeight: number;
  terminalWidth: number;
  sessions: SessionEntry[];
  loading: boolean;
  error: string | null;
  onResume: (sessionId: string, projectPath: string) => void;
  onRefresh: () => void;
  onBusyChange: (busy: boolean) => void;
}

const COLUMNS: Column[] = [
  { key: "projectName", label: "Project", width: 22 },
  { key: "firstPrompt", label: "First Prompt" },
  { key: "msgs", label: "Msgs", width: 7 },
  { key: "gitBranch", label: "Branch", width: 14 },
  { key: "modified", label: "Modified", width: 10 },
  { key: "model", label: "Model", width: 8 },
];

export function SessionsScreen({
  active,
  contentHeight,
  terminalWidth,
  sessions,
  loading,
  error,
  onResume,
  onRefresh,
  onBusyChange,
}: SessionsScreenProps) {
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showDetail, setShowDetail] = useState(false);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("off");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"fuzzy" | "ai">("ai");
  const [aiResults, setAiResults] = useState<SessionEntry[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexBuiltRef = useRef(false);

  // Report busy state to parent (block q from quitting)
  useEffect(() => {
    onBusyChange(searchPhase === "typing" || showDetail);
  }, [searchPhase, showDetail, onBusyChange]);

  // Build search index when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !indexBuiltRef.current) {
      buildSearchIndex(sessions);
      indexBuiltRef.current = true;
    }
  }, [sessions]);

  useEffect(() => {
    if (sessions.length > 0) {
      buildSearchIndex(sessions);
    }
  }, [sessions]);

  // AI search trigger
  const triggerAiSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setAiResults([]);
      return;
    }
    setIsAiSearching(true);
    aiSearch(q).then((results) => {
      setAiResults(results.map((r) => r.session));
      setIsAiSearching(false);
      // Auto-switch to results phase when AI search completes
      setSearchPhase("results");
    }).catch(() => {
      setIsAiSearching(false);
      setSearchPhase("results");
    });
  }, []);

  // No auto-search. All searches trigger on Enter only.

  // Compute displayed sessions
  const displaySessions = useMemo(() => {
    let list: SessionEntry[];

    if ((searchPhase === "typing" || searchPhase === "results") && searchQuery.trim()) {
      if (searchType === "fuzzy") {
        list = fuzzySearch(searchQuery).map((r) => r.session);
      } else {
        list = aiResults;
      }
    } else {
      list = [...sessions];
      switch (sortMode) {
        case "messages":
          list.sort((a, b) => b.messageCount - a.messageCount);
          break;
        case "project":
          list.sort((a, b) => a.projectName.localeCompare(b.projectName));
          break;
        default:
          break;
      }
    }

    return list;
  }, [sessions, sortMode, searchPhase, searchQuery, searchType, aiResults]);

  const rows = useMemo(
    () =>
      displaySessions.map((s) => ({
        projectName: s.projectName,
        firstPrompt: s.firstPrompt,
        msgs: s.approximate ? `~${s.messageCount}` : String(s.messageCount),
        gitBranch: s.gitBranch,
        modified: timeAgo(s.modified),
        model: shortModel(s.model),
      })),
    [displaySessions],
  );

  // j/k navigation active when: not typing in search, not in detail panel
  const navActive = active && searchPhase !== "typing" && !showDetail;
  const { selectedIndex, setSelectedIndex } = useSelectedRow(rows.length, navActive);
  const selectedSession = displaySessions[selectedIndex];

  useInput(
    (input, key) => {
      if (!active) return;

      // Detail panel mode
      if (showDetail) {
        if (key.escape || input === "q") {
          setShowDetail(false);
        }
        if (key.return && selectedSession) {
          onResume(selectedSession.sessionId, selectedSession.projectPath);
        }
        if ((input === "r" || input === "R") && selectedSession) {
          onResume(selectedSession.sessionId, selectedSession.projectPath);
        }
        return;
      }

      // Results phase: user navigates filtered results
      if (searchPhase === "results") {
        if (key.escape) {
          // Clear search, go back to full list
          setSearchQuery("");
          setSearchPhase("off");
          setAiResults([]);
          setSelectedIndex(0);
          return;
        }
        if (input === "/") {
          // Re-enter typing mode
          setSearchPhase("typing");
          return;
        }
        if (key.return && selectedSession) {
          onResume(selectedSession.sessionId, selectedSession.projectPath);
          return;
        }
        if ((input === "r" || input === "R") && selectedSession) {
          onResume(selectedSession.sessionId, selectedSession.projectPath);
          return;
        }
        if (input === "i" && selectedSession) {
          setShowDetail(true);
          return;
        }
        // j/k handled by useSelectedRow
        return;
      }

      // Typing phase: keystrokes go to search input
      if (searchPhase === "typing") {
        if (key.escape) {
          if (searchQuery) {
            setSearchQuery("");
            setAiResults([]);
          } else {
            setSearchPhase("off");
          }
          return;
        }
        if (key.return && searchQuery.trim()) {
          if (searchType === "fuzzy") {
            setSearchPhase("results");
            setSelectedIndex(0);
          } else {
            // AI: trigger search, it will transition to results when done
            triggerAiSearch(searchQuery);
          }
          return;
        }
        if (key.ctrl && input === "a") {
          setSearchType((prev) => (prev === "fuzzy" ? "ai" : "fuzzy"));
          return;
        }
        if (key.backspace || key.delete) {
          setSearchQuery((q) => q.slice(0, -1));
          return;
        }
        if (key.upArrow || key.downArrow || key.tab) return;
        if (key.ctrl || key.meta) return;
        if (input) {
          setSearchQuery((q) => q + input);
          return;
        }
        return;
      }

      // Off phase: normal browsing
      if (input === "/") {
        setSearchPhase("typing");
        setSearchQuery("");
        setAiResults([]);
        return;
      }
      if (key.return && selectedSession) {
        onResume(selectedSession.sessionId, selectedSession.projectPath);
        return;
      }
      if ((input === "r" || input === "R") && selectedSession) {
        onResume(selectedSession.sessionId, selectedSession.projectPath);
        return;
      }
      if (input === "i" && selectedSession) {
        setShowDetail(true);
        return;
      }
      if (input === "s") {
        setSortMode((prev) => {
          const modes: SortMode[] = ["recent", "messages", "project"];
          const idx = modes.indexOf(prev);
          return modes[(idx + 1) % modes.length]!;
        });
        setSelectedIndex(0);
      }
      if (input === "f") {
        onRefresh();
      }
    },
    { isActive: active },
  );

  if (loading && sessions.length === 0) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color="yellow">Loading sessions...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  const detailHeight = showDetail ? 9 : 0;
  const tableHeight = contentHeight - detailHeight - 3;

  return (
    <Box flexDirection="column">
      {/* Search bar / Sort indicator */}
      {searchPhase === "typing" ? (
        <Box paddingX={1} gap={1}>
          <Text bold color="cyan">/</Text>
          <Text>{searchQuery}<Text color="cyan">_</Text></Text>
          <Text color={searchType === "ai" ? "magenta" : "yellow"}>[{searchType}]</Text>
          {isAiSearching && <Text color="magenta"> searching...</Text>}
        </Box>
      ) : searchPhase === "results" ? (
        <Box paddingX={1} gap={1}>
          <Text bold color="cyan">/</Text>
          <Text color="yellow">{searchQuery}</Text>
          <Text color={searchType === "ai" ? "magenta" : "yellow"}> [{searchType}]</Text>
          <Text dimColor> {displaySessions.length} results -- Enter:resume  /:edit  Esc:clear</Text>
        </Box>
      ) : (
        <Box paddingX={1} gap={1}>
          <Text dimColor>Sort: </Text>
          <Text color="yellow">{sortMode}</Text>
          {loading && <Text color="yellow"> (refreshing...)</Text>}
        </Box>
      )}

      {isAiSearching ? (
        <Box paddingX={2} paddingY={1}>
          <Text color="magenta">Searching with AI...</Text>
        </Box>
      ) : (
        <Table
          columns={COLUMNS}
          rows={rows as unknown as Record<string, unknown>[]}
          selectedIndex={selectedIndex}
          maxVisible={Math.max(5, tableHeight)}
          terminalWidth={terminalWidth}
        />
      )}

      {showDetail && selectedSession && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
          marginX={1}
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Text bold color="cyan">Session Detail</Text>
            <Text dimColor>{selectedSession.sessionId.slice(0, 8)}</Text>
          </Box>
          <Box gap={4}>
            <Box>
              <Text dimColor>Project: </Text>
              <Text bold>{selectedSession.projectName}</Text>
            </Box>
            <Box>
              <Text dimColor>Branch: </Text>
              <Text>{selectedSession.gitBranch}</Text>
            </Box>
            <Box>
              <Text dimColor>Model: </Text>
              <Text>{selectedSession.model || "-"}</Text>
            </Box>
          </Box>
          <Box gap={4}>
            <Box>
              <Text dimColor>Created: </Text>
              <Text>{new Date(selectedSession.created).toLocaleString()}</Text>
            </Box>
            <Box>
              <Text dimColor>Messages: </Text>
              <Text>{selectedSession.messageCount}</Text>
            </Box>
          </Box>
          <Box>
            <Text dimColor>Prompt: </Text>
            <Text>{selectedSession.firstPrompt}</Text>
          </Box>
          <Box>
            <Text dimColor>Path: </Text>
            <Text dimColor>{selectedSession.projectPath}</Text>
          </Box>
          <Text dimColor>Enter/R:resume  Esc:close</Text>
        </Box>
      )}

      <KeyHint
        hints={
          searchPhase === "typing"
            ? [
                { key: "Enter", label: "search" },
                { key: "Esc", label: "cancel" },
                { key: "Ctrl+A", label: `mode(${searchType})` },
              ]
            : searchPhase === "results"
            ? [
                { key: "j/k", label: "navigate" },
                { key: "Enter", label: "resume" },
                { key: "i", label: "detail" },
                { key: "/", label: "edit search" },
                { key: "Esc", label: "clear" },
              ]
            : [
                { key: "/", label: "search" },
                { key: "j/k", label: "navigate" },
                { key: "Enter", label: "resume" },
                { key: "i", label: "detail" },
                { key: "s", label: `sort(${sortMode})` },
                { key: "f", label: "refresh" },
              ]
        }
      />
    </Box>
  );
}
