import React from 'react';
import { Text } from 'ink';
import { t } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import type { TaskStatus } from '../../db/schema.js';

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const i18n = t();
  const theme = useTheme();

  const statusColors: Record<TaskStatus, string> = {
    inbox: theme.colors.statusInbox,
    next: theme.colors.statusNext,
    waiting: theme.colors.statusWaiting,
    someday: theme.colors.statusSomeday,
    done: theme.colors.statusDone,
  };

  return (
    <Text color={statusColors[status]} bold>
      {i18n.status[status]}
    </Text>
  );
}
