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
  viewMode?: 'gtd' | 'kanban';
}

// Map GTD status to Kanban column
function getKanbanColumn(status: string): 'todo' | 'doing' | 'done' {
  if (status === 'inbox' || status === 'someday') {
    return 'todo';
  }
  if (status === 'next' || status === 'waiting') {
    return 'doing';
  }
  return 'done';
}

export function SearchResults({ results, selectedIndex, query, viewMode = 'gtd' }: SearchResultsProps): React.ReactElement {
  const i18n = t();
  const theme = useTheme();
  const search = i18n.tui.search;

  if (!query) {
    return <></>;
  }

  // Mario theme uses green (pipe color) for search results
  const isMarioStyle = theme.uiStyle === 'mario-block';
  const boxBorderColor = isMarioStyle ? theme.colors.accent : theme.colors.borderActive;

  return (
    <Box
      flexDirection="column"
      borderStyle={theme.borders.list as BorderStyleType}
      borderColor={boxBorderColor}
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
          let displayLabel: string;
          if (task.isProject) {
            displayLabel = i18n.tui.keyBar.project;
          } else if (viewMode === 'kanban') {
            const kanbanColumn = getKanbanColumn(task.status);
            displayLabel = i18n.kanban[kanbanColumn];
          } else {
            displayLabel = i18n.status[task.status];
          }

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
