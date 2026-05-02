import React from "react";
import { Box, Text } from "ink";

interface Hint {
  key: string;
  label: string;
}

interface KeyHintProps {
  hints: Hint[];
}

export function KeyHint({ hints }: KeyHintProps) {
  return (
    <Box paddingX={1} gap={1} flexWrap="wrap">
      {hints.map((hint) => (
        <Box key={hint.key}>
          <Text bold color="yellow">{hint.key}</Text>
          <Text dimColor>:{hint.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
