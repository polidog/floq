import React from 'react';
import { Box, Text } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { Task } from '../../db/schema.js';
import type { BorderStyleType } from '../theme/types.js';

interface SearchResultsProps {
  results: Task[];
  selectedIndex: number;
  query: string;
}

export function SearchResults({ results, selectedIndex, query }: SearchResultsProps): React.ReactElement {
  const i18n = t();
  const theme = useTheme();
  const search = i18n.tui.search;

  if (!query) {
    return <></>;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.list as BorderStyleType}
      borderColor={theme.colors.borderActive}
      paddingX={1}
      paddingY={1}
      minHeight={5}
    >
      <Box marginBottom={1}>
        <Text color={theme.colors.secondary} bold>
          [{search.resultsTitle}] ({results.length})
        </Text>
      </Box>

      {results.length === 0 ? (
        <Text color={theme.colors.textMuted} italic>
          {search.noResults}
        </Text>
      ) : (
        results.slice(0, 10).map((task, index) => {
          const isSelected = index === selectedIndex;
          const shortId = task.id.slice(0, 8);
          const displayLabel = task.isProject ? i18n.tui.keyBar.project : i18n.status[task.status];

          return (
            <Box key={task.id}>
              <Text
                color={isSelected ? theme.colors.textSelected : theme.colors.text}
                bold={isSelected}
              >
                {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                [{shortId}] {task.title}
                <Text color={theme.colors.textMuted}> ({displayLabel})</Text>
                {task.waitingFor && (
                  <Text color={theme.colors.statusWaiting}> - {task.waitingFor}</Text>
                )}
              </Text>
            </Box>
          );
        })
      )}

      {results.length > 10 && (
        <Text color={theme.colors.textMuted} italic>
          ... and {results.length - 10} more
        </Text>
      )}
    </Box>
  );
}
