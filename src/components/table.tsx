import React from "react";
import { Box, Text } from "ink";
import type { Column } from "../types.js";
import { truncate } from "../utils/format.js";

interface TableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  selectedIndex: number;
  maxVisible?: number;
  terminalWidth?: number;
}

export function Table({ columns, rows, selectedIndex, maxVisible = 15, terminalWidth }: TableProps) {
  if (rows.length === 0) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text dimColor>No data</Text>
      </Box>
    );
  }

  const halfWindow = Math.floor(maxVisible / 2);
  let startIdx = Math.max(0, selectedIndex - halfWindow);
  const endIdx = Math.min(rows.length, startIdx + maxVisible);
  if (endIdx - startIdx < maxVisible) {
    startIdx = Math.max(0, endIdx - maxVisible);
  }
  const visibleRows = rows.slice(startIdx, endIdx);

  const availableWidth = (terminalWidth ?? 120) - 4;
  const fixedTotal = columns.reduce((sum, col) => sum + (col.width ?? 0), 0);
  const flexCols = columns.filter((col) => !col.width);
  const remainingWidth = Math.max(0, availableWidth - fixedTotal);
  const flexWidth = flexCols.length > 0 ? Math.floor(remainingWidth / flexCols.length) : 0;

  const colWidths = columns.map((col) => {
    if (col.width) return col.width;
    const headerLen = col.label.length;
    const maxDataLen = rows.slice(0, 50).reduce((max, row) => {
      const val = String(row[col.key] ?? "");
      return Math.max(max, val.length);
    }, 0);
    const natural = Math.min(Math.max(headerLen, maxDataLen) + 2, 40);
    return flexWidth > 0 ? Math.max(natural, Math.min(flexWidth, 60)) : natural;
  });

  const separatorWidth = colWidths.reduce((sum, w) => sum + w, 0) + 2;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text> </Text>
        <Text> </Text>
        {columns.map((col, ci) => (
          <Box key={col.key} width={colWidths[ci]}>
            <Text bold dimColor>
              {truncate(col.label, colWidths[ci]! - 1)}
            </Text>
          </Box>
        ))}
      </Box>

      <Box>
        <Text> </Text>
        <Text> </Text>
        <Text dimColor>{"\u2500".repeat(Math.min(separatorWidth, (terminalWidth ?? 120) - 4))}</Text>
      </Box>

      {visibleRows.map((row, vi) => {
        const absoluteIndex = startIdx + vi;
        const isSelected = absoluteIndex === selectedIndex;
        const isDimmed = !isSelected && absoluteIndex % 2 === 1;

        return (
          <Box key={absoluteIndex}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isSelected ? ">" : " "}
            </Text>
            <Text> </Text>
            {columns.map((col, ci) => {
              const raw = String(row[col.key] ?? "-");
              const value = truncate(raw, colWidths[ci]! - 1);
              const cellColor = col.color?.(raw, row as Record<string, unknown>);

              return (
                <Box key={col.key} width={colWidths[ci]}>
                  <Text
                    color={isSelected ? "cyan" : cellColor ?? undefined}
                    bold={isSelected}
                    dimColor={isDimmed && !isSelected && !cellColor}
                  >
                    {value}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}

      {rows.length > maxVisible && (
        <Box paddingLeft={2}>
          <Text dimColor>
            {startIdx > 0 ? "..." : "   "}
            {" "}{selectedIndex + 1}/{rows.length}{" "}
            {endIdx < rows.length ? "..." : "   "}
          </Text>
        </Box>
      )}
    </Box>
  );
}
