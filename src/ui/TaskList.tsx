import React from 'react';
import { Box, Text } from 'ink';
import { TaskItem } from './components/TaskItem.js';
import { StatusBadge } from './components/StatusBadge.js';
import { t } from '../i18n/index.js';
import type { Task, TaskStatus } from '../db/schema.js';

interface TaskListProps {
  status: TaskStatus;
  tasks: Task[];
  selectedIndex: number;
  isActiveList: boolean;
}

export function TaskList({
  status,
  tasks,
  selectedIndex,
  isActiveList,
}: TaskListProps): React.ReactElement {
  const i18n = t();

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <StatusBadge status={status} />
        <Text color="gray"> ({tasks.length})</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        {tasks.length === 0 ? (
          <Text color="gray" italic>
            {i18n.tui.noTasks}
          </Text>
        ) : (
          tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={isActiveList && index === selectedIndex}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
