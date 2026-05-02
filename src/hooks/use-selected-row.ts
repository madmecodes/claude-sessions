import { useState, useCallback } from "react";
import { useInput } from "ink";

interface UseSelectedRowResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export function useSelectedRow(rowCount: number, active = true): UseSelectedRowResult {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (!active || rowCount === 0) return;

      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (key.downArrow || input === "j") {
        setSelectedIndex((prev) => (prev < rowCount - 1 ? prev + 1 : prev));
      } else if (input === "G") {
        setSelectedIndex(rowCount - 1);
      } else if (key.pageDown) {
        setSelectedIndex((prev) => Math.min(prev + 10, rowCount - 1));
      } else if (key.pageUp) {
        setSelectedIndex((prev) => Math.max(prev - 10, 0));
      }
    },
    { isActive: active },
  );

  const safeSetIndex = useCallback(
    (index: number) => {
      setSelectedIndex(Math.max(0, Math.min(index, rowCount - 1)));
    },
    [rowCount],
  );

  return {
    selectedIndex: Math.min(selectedIndex, Math.max(0, rowCount - 1)),
    setSelectedIndex: safeSetIndex,
  };
}
