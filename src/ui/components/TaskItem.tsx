import React from 'react';
import { Box, Text } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import { ProgressBar } from './ProgressBar.js';
import type { Task } from '../../db/schema.js';

export interface ProjectProgress {
  completed: number;
  total: number;
}

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  projectName?: string;
  progress?: ProjectProgress;
}

export function TaskItem({ task, isSelected, projectName, progress }: TaskItemProps): React.ReactElement {
  const shortId = task.id.slice(0, 8);
  const i18n = t();
  const theme = useTheme();

  return (
    <Box>
      <Text color={isSelected ? theme.colors.textSelected : theme.colors.text} bold={isSelected}>
        {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
        [{shortId}] {task.title}
        {task.context && (
          <Text color={theme.colors.accent}> @{task.context}</Text>
        )}
        {projectName && (
          <Text color={theme.colors.statusSomeday}> [{projectName}]</Text>
        )}
        {progress && progress.total > 0 && (
          <ProgressBar completed={progress.completed} total={progress.total} />
        )}
        {task.waitingFor && (
          <Text color={theme.colors.statusWaiting}> ({i18n.status.waiting.toLowerCase()}: {task.waitingFor})</Text>
        )}
        {task.dueDate && (
          <Text color={theme.colors.accent}> (due: {task.dueDate.toLocaleDateString()})</Text>
        )}
      </Text>
    </Box>
  );
}
