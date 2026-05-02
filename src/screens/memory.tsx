import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { PreviewPanel } from "../components/preview-panel.js";
import { KeyHint } from "../components/key-hint.js";
import { useSelectedRow } from "../hooks/use-selected-row.js";
import { useDataLoader } from "../hooks/use-data-loader.js";
import { loadMemoryTree, loadMemoryContent } from "../data/memory.js";
import type { MemoryFile } from "../types.js";

type TreeItem =
  | { type: "global-header" }
  | { type: "project"; name: string; expanded: boolean; fileCount: number }
  | { type: "file"; file: MemoryFile; indent: number };

interface MemoryScreenProps {
  active: boolean;
  contentHeight: number;
  terminalWidth: number;
}

export function MemoryScreen({ active, contentHeight, terminalWidth }: MemoryScreenProps) {
  const { data: tree, loading, error } = useDataLoader(loadMemoryTree);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusPane, setFocusPane] = useState<"tree" | "preview">("tree");
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewScroll, setPreviewScroll] = useState(0);

  // Build flattened tree
  const flatTree = useMemo((): TreeItem[] => {
    if (!tree) return [];
    const items: TreeItem[] = [];

    // Global files
    if (tree.global.length > 0) {
      items.push({ type: "global-header" });
      for (const f of tree.global) {
        items.push({ type: "file", file: f, indent: 2 });
      }
    }

    // Project groups
    for (const proj of tree.projects) {
      const isExpanded = expanded.has(proj.projectName);
      items.push({
        type: "project",
        name: proj.projectName,
        expanded: isExpanded,
        fileCount: proj.files.length,
      });
      if (isExpanded) {
        for (const f of proj.files) {
          items.push({ type: "file", file: f, indent: 2 });
        }
      }
    }

    return items;
  }, [tree, expanded]);

  const { selectedIndex } = useSelectedRow(
    flatTree.length,
    active && focusPane === "tree",
  );

  // Load preview when file is selected
  const selectedItem = flatTree[selectedIndex];
  useEffect(() => {
    if (selectedItem?.type === "file") {
      loadMemoryContent(selectedItem.file.path).then((content) => {
        setPreviewContent(content);
        setPreviewTitle(selectedItem.file.fileName);
        setPreviewScroll(0);
      });
    }
  }, [selectedItem?.type === "file" ? selectedItem.file.path : null]);

  useInput(
    (input, key) => {
      if (!active) return;

      // Switch pane focus
      if (input === "l" && focusPane === "tree") {
        setFocusPane("preview");
        return;
      }
      if (input === "h" && focusPane === "preview") {
        setFocusPane("tree");
        return;
      }

      // Tree actions
      if (focusPane === "tree" && key.return) {
        const item = flatTree[selectedIndex];
        if (item?.type === "project") {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(item.name)) {
              next.delete(item.name);
            } else {
              next.add(item.name);
            }
            return next;
          });
        }
      }

      // Preview scrolling
      if (focusPane === "preview") {
        if (key.downArrow || input === "j") {
          setPreviewScroll((s) => s + 1);
        } else if (key.upArrow || input === "k") {
          setPreviewScroll((s) => Math.max(0, s - 1));
        }
      }
    },
    { isActive: active },
  );

  if (loading && !tree) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color="yellow">Loading memory files...</Text>
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

  if (!tree || flatTree.length === 0) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text dimColor>No memory files found</Text>
      </Box>
    );
  }

  const treeWidth = Math.floor(terminalWidth * 0.38);
  const previewWidth = terminalWidth - treeWidth - 4;
  const maxTreeRows = contentHeight - 3;

  // Compute visible window for tree
  const halfWin = Math.floor(maxTreeRows / 2);
  let treeStart = Math.max(0, selectedIndex - halfWin);
  const treeEnd = Math.min(flatTree.length, treeStart + maxTreeRows);
  if (treeEnd - treeStart < maxTreeRows) {
    treeStart = Math.max(0, treeEnd - maxTreeRows);
  }
  const visibleTree = flatTree.slice(treeStart, treeEnd);

  return (
    <Box flexDirection="column">
      <Box>
        {/* Tree pane */}
        <Box
          flexDirection="column"
          width={treeWidth}
          borderStyle="single"
          borderColor={focusPane === "tree" ? "cyan" : "gray"}
        >
          <Box paddingX={1}>
            <Text bold color="cyan">Memory Files</Text>
          </Box>
          {visibleTree.map((item, vi) => {
            const absIdx = treeStart + vi;
            const isSelected = absIdx === selectedIndex && focusPane === "tree";

            if (item.type === "global-header") {
              return (
                <Box key="global" paddingX={1}>
                  <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                    {isSelected ? "> " : "  "}
                    <Text bold color="yellow">(global)</Text>
                  </Text>
                </Box>
              );
            }

            if (item.type === "project") {
              return (
                <Box key={`p-${item.name}`} paddingX={1}>
                  <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                    {isSelected ? "> " : "  "}
                    {item.expanded ? "v " : "> "}
                    <Text bold>{item.name}</Text>
                    <Text dimColor> ({item.fileCount})</Text>
                  </Text>
                </Box>
              );
            }

            return (
              <Box key={item.file.path} paddingX={1}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {isSelected ? "> " : "  "}
                  {"  "}{item.file.fileName}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Preview pane */}
        {previewContent ? (
          <PreviewPanel
            title={previewTitle}
            content={previewContent}
            maxHeight={contentHeight - 3}
            scrollOffset={previewScroll}
            width={previewWidth}
          />
        ) : (
          <Box
            width={previewWidth}
            borderStyle="single"
            borderColor="gray"
            justifyContent="center"
            alignItems="center"
          >
            <Text dimColor>Select a file to preview</Text>
          </Box>
        )}
      </Box>
      <KeyHint
        hints={[
          { key: "j/k", label: "navigate" },
          { key: "Enter", label: "expand" },
          { key: "h/l", label: "switch pane" },
        ]}
      />
    </Box>
  );
}
