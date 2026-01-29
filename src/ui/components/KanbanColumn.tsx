import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import type { Task } from '../../db/schema.js';
import type { BorderStyleType } from '../theme/types.js';

export type KanbanColumnType = 'todo' | 'doing' | 'done';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  isActive: boolean;
  selectedTaskIndex: number;
  columnIndex: number;
}

export function KanbanColumn({
  title,
  tasks,
  isActive,
  selectedTaskIndex,
  columnIndex,
}: KanbanColumnProps): React.ReactElement {
  const theme = useTheme();

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      borderStyle={theme.borders.list as BorderStyleType}
      borderColor={isActive ? theme.colors.borderActive : theme.colors.border}
      marginRight={columnIndex < 2 ? 1 : 0}
    >
      {/* Column header */}
      <Box
        paddingX={1}
        justifyContent="center"
        borderStyle={undefined}
      >
        <Text
          bold
          color={isActive ? theme.colors.primary : theme.colors.textMuted}
          inverse={isActive && theme.style.tabActiveInverse}
        >
          {title} ({tasks.length})
        </Text>
      </Box>

      {/* Tasks list */}
      <Box flexDirection="column" paddingX={1} paddingY={1} minHeight={8}>
        {tasks.length === 0 ? (
          <Text color={theme.colors.textMuted} italic>-</Text>
        ) : (
          tasks.map((task, index) => {
            const isSelected = isActive && index === selectedTaskIndex;
            const shortId = task.id.slice(0, 6);

            return (
              <Box key={task.id}>
                <Text
                  color={isSelected ? theme.colors.textSelected : theme.colors.text}
                  bold={isSelected}
                >
                  {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                  [{shortId}] {task.title}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
