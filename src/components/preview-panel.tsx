import React from "react";
import { Box, Text } from "ink";

interface PreviewPanelProps {
  title: string;
  content: string;
  maxHeight: number;
  scrollOffset: number;
  width?: number;
}

export function PreviewPanel({ title, content, maxHeight, scrollOffset, width }: PreviewPanelProps) {
  const lines = content.split("\n");
  const visibleLines = lines.slice(scrollOffset, scrollOffset + maxHeight);
  const totalLines = lines.length;

  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">{title}</Text>
        {totalLines > maxHeight && (
          <Text dimColor>{scrollOffset + 1}-{Math.min(scrollOffset + maxHeight, totalLines)}/{totalLines}</Text>
        )}
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {visibleLines.map((line, i) => {
          if (line.startsWith("# ")) {
            return <Text key={i} bold color="cyan">{line}</Text>;
          }
          if (line.startsWith("## ")) {
            return <Text key={i} bold color="blue">{line}</Text>;
          }
          if (line.startsWith("### ")) {
            return <Text key={i} bold>{line}</Text>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return <Text key={i}>{line}</Text>;
          }
          if (line.startsWith("```")) {
            return <Text key={i} dimColor>{line}</Text>;
          }
          return <Text key={i}>{line}</Text>;
        })}
      </Box>
    </Box>
  );
}
