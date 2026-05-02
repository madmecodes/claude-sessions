import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { Table } from "../components/table.js";
import { SearchInput } from "../components/search-input.js";
import { KeyHint } from "../components/key-hint.js";
import { useSelectedRow } from "../hooks/use-selected-row.js";
import { buildSearchIndex, fuzzySearch, aiSearch } from "../data/search.js";
import { timeAgo, shortModel } from "../utils/format.js";
import type { SessionEntry, SearchResult, Column } from "../types.js";

interface SearchScreenProps {
  active: boolean;
  contentHeight: number;
  terminalWidth: number;
  sessions: SessionEntry[];
  onResume: (sessionId: string) => void;
}

const COLUMNS: Column[] = [
  { key: "projectName", label: "Project", width: 22 },
  { key: "firstPrompt", label: "First Prompt" },
  { key: "score", label: "Score", width: 7 },
  { key: "modified", label: "Modified", width: 10 },
  { key: "model", label: "Model", width: 8 },
];

export function SearchScreen({
  active,
  contentHeight,
  terminalWidth,
  sessions,
  onResume,
}: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"fuzzy" | "ai">("fuzzy");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focusInput, setFocusInput] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexBuiltRef = useRef(false);

  // Build index on first mount
  useEffect(() => {
    if (sessions.length > 0 && !indexBuiltRef.current) {
      buildSearchIndex(sessions);
      indexBuiltRef.current = true;
    }
  }, [sessions]);

  // Rebuild if sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      buildSearchIndex(sessions);
    }
  }, [sessions]);

  const doSearch = useCallback(
    (q: string, m: "fuzzy" | "ai") => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      if (m === "fuzzy") {
        setResults(fuzzySearch(q));
      } else {
        setIsSearching(true);
        aiSearch(q).then((r) => {
          setResults(r);
          setIsSearching(false);
        }).catch(() => {
          setIsSearching(false);
        });
      }
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = mode === "ai" ? 800 : 200;
    debounceRef.current = setTimeout(() => doSearch(query, mode), delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mode, doSearch]);

  const rows = results.map((r) => ({
    projectName: r.session.projectName,
    firstPrompt: r.session.firstPrompt,
    score: (r.matchScore * 100).toFixed(0) + "%",
    modified: timeAgo(r.session.modified),
    model: shortModel(r.session.model),
    _session: r.session,
  }));

  const { selectedIndex } = useSelectedRow(rows.length, active && !focusInput && !showDetail);
  const selectedSession = results[selectedIndex]?.session;

  useInput(
    (input, key) => {
      if (!active) return;

      if (showDetail) {
        if (key.escape || key.return) {
          setShowDetail(false);
        }
        if ((input === "r" || input === "R") && selectedSession) {
          onResume(selectedSession.sessionId);
        }
        return;
      }

      // Toggle search mode
      if (key.ctrl && input === "a") {
        setMode((prev) => (prev === "fuzzy" ? "ai" : "fuzzy"));
        return;
      }

      // Switch focus between input and results
      if (key.escape && focusInput) {
        setFocusInput(false);
        return;
      }

      if (input === "/" && !focusInput) {
        setFocusInput(true);
        return;
      }

      if (key.tab) {
        setFocusInput((prev) => !prev);
        return;
      }

      // Actions on results
      if (!focusInput) {
        if (key.return && selectedSession) {
          setShowDetail(true);
        }
        if ((input === "r" || input === "R") && selectedSession) {
          onResume(selectedSession.sessionId);
        }
      }
    },
    { isActive: active },
  );

  const tableHeight = contentHeight - (showDetail ? 12 : 4);

  return (
    <Box flexDirection="column">
      <SearchInput
        value={query}
        onChange={setQuery}
        mode={mode}
        isActive={active && focusInput}
        isSearching={isSearching}
      />
      {results.length === 0 && query.trim() && !isSearching ? (
        <Box paddingX={2} paddingY={1}>
          <Text dimColor>No results for "{query}"</Text>
        </Box>
      ) : results.length === 0 && !query.trim() ? (
        <Box paddingX={2} paddingY={1}>
          <Text dimColor>Type to search across all sessions. Ctrl+A to toggle AI mode.</Text>
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
          </Box>
          <Box>
            <Text dimColor>Prompt: </Text>
            <Text>{selectedSession.firstPrompt}</Text>
          </Box>
          <Text dimColor>R:resume  Esc:close</Text>
        </Box>
      )}
      <KeyHint
        hints={[
          { key: "/", label: "focus search" },
          { key: "Tab", label: "switch focus" },
          { key: "Ctrl+A", label: `mode(${mode})` },
          { key: "Enter", label: "detail" },
          { key: "R", label: "resume" },
        ]}
      />
    </Box>
  );
}
