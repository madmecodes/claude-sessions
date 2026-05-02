import React from "react";
import { Box, Text } from "ink";
import type { TabName } from "../types.js";

interface TabBarProps {
  tabs: TabName[];
  activeTab: TabName;
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  return (
    <Box borderStyle="single" borderTop={false} borderBottom={false} paddingX={1} gap={1}>
      {tabs.map((tab, i) => {
        const isActive = tab === activeTab;
        return (
          <Box key={tab}>
            <Text
              bold={isActive}
              color={isActive ? "cyan" : "white"}
              inverse={isActive}
            >
              {` ${i + 1}:${tab} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
