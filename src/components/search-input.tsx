import React from "react";
import { Box, Text, useInput } from "ink";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  mode: "fuzzy" | "ai";
  isActive: boolean;
  isSearching?: boolean;
}

export function SearchInput({ value, onChange, mode, isActive, isSearching }: SearchInputProps) {
  useInput(
    (input, key) => {
      if (!isActive) return;
      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }
      if (key.return || key.escape || key.tab || key.upArrow || key.downArrow) return;
      if (key.ctrl || key.meta) return;
      if (input) {
        onChange(value + input);
      }
    },
    { isActive },
  );

  return (
    <Box paddingX={1} gap={1}>
      <Text bold color="cyan">Search:</Text>
      <Text>
        {value || <Text dimColor>type to search sessions...</Text>}
        {isActive && <Text color="cyan">_</Text>}
      </Text>
      <Text color={mode === "ai" ? "magenta" : "yellow"}>[{mode}]</Text>
      {isSearching && <Text color="yellow">...</Text>}
    </Box>
  );
}
