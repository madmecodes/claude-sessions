import React from "react";
import { Box, Text } from "ink";
import { useClock } from "../hooks/use-clock.js";

interface HeaderProps {
  sessionCount: number;
  projectCount: number;
}

export function Header({ sessionCount, projectCount }: HeaderProps) {
  const clock = useClock();

  return (
    <Box borderStyle="single" borderBottom={false} paddingX={1} justifyContent="space-between">
      <Box>
        <Text bold color="cyan">claude-sessions</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>{sessionCount} sessions</Text>
        <Text dimColor>{projectCount} projects</Text>
        <Text color="white">{clock}</Text>
      </Box>
    </Box>
  );
}
