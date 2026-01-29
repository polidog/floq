import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { KanbanColumn, type KanbanColumnType } from './KanbanColumn.js';
import { HelpModal } from './HelpModal.js';
import { FunctionKeyBar } from './FunctionKeyBar.js';
import { getDb, schema } from '../../db/index.js';
import { t, fmt } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import { isTursoEnabled, getTursoConfig } from '../../config.js';
import { VERSION } from '../../version.js';
import type { Task } from '../../db/schema.js';

const COLUMNS: KanbanColumnType[] = ['todo', 'doing', 'done'];

type KanbanMode = 'normal' | 'add' | 'help' | 'task-detail';

interface KanbanBoardProps {
  onSwitchToGtd?: () => void;
}

export function KanbanBoard({ onSwitchToGtd }: KanbanBoardProps): React.ReactElement {
  const theme = useTheme();
  const { exit } = useApp();
  const [mode, setMode] = useState<KanbanMode>('normal');
  const [inputValue, setInputValue] = useState('');
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Record<KanbanColumnType, number>>({
    todo: 0,
    doing: 0,
    done: 0,
  });
  const [tasks, setTasks] = useState<Record<KanbanColumnType, Task[]>>({
    todo: [],
    doing: [],
    done: [],
  });
  const [message, setMessage] = useState<string | null>(null);

  const i18n = t();

  // Status mapping:
  // TODO = inbox + someday
  // Doing = next + waiting
  // Done = done
  const loadTasks = useCallback(async () => {
    const db = getDb();

    // TODO: inbox + someday (non-project tasks)
    const todoTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['inbox', 'someday']),
        eq(schema.tasks.isProject, false)
      ));

    // Doing: next + waiting (non-project tasks)
    const doingTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['next', 'waiting']),
        eq(schema.tasks.isProject, false)
      ));

    // Done: done (non-project tasks)
    const doneTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.status, 'done'),
        eq(schema.tasks.isProject, false)
      ));

    setTasks({
      todo: todoTasks,
      doing: doingTasks,
      done: doneTasks,
    });
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const currentColumn = COLUMNS[currentColumnIndex];
  const currentTasks = tasks[currentColumn];
  const selectedTaskIndex = selectedTaskIndices[currentColumn];

  const addTask = useCallback(async (title: string) => {
    if (!title.trim()) return;

    const db = getDb();
    const now = new Date();
    await db.insert(schema.tasks)
      .values({
        id: uuidv4(),
        title: title.trim(),
        status: 'inbox', // New tasks go to inbox (which maps to TODO)
        createdAt: now,
        updatedAt: now,
      });

    setMessage(fmt(i18n.tui.added, { title: title.trim() }));
    await loadTasks();
  }, [i18n.tui.added, loadTasks]);

  const handleInputSubmit = async (value: string) => {
    if (value.trim()) {
      await addTask(value);
    }
    setInputValue('');
    setMode('normal');
  };

  const moveTaskRight = useCallback(async (task: Task) => {
    const db = getDb();
    let newStatus: 'inbox' | 'next' | 'waiting' | 'someday' | 'done';

    // Determine new status based on current status
    if (task.status === 'inbox' || task.status === 'someday') {
      // TODO -> Doing (next)
      newStatus = 'next';
    } else if (task.status === 'next' || task.status === 'waiting') {
      // Doing -> Done
      newStatus = 'done';
    } else {
      // Already done, do nothing
      return;
    }

    await db.update(schema.tasks)
      .set({ status: newStatus, waitingFor: null, updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));

    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks]);

  const moveTaskLeft = useCallback(async (task: Task) => {
    const db = getDb();
    let newStatus: 'inbox' | 'next' | 'waiting' | 'someday' | 'done';

    // Determine new status based on current status
    if (task.status === 'next' || task.status === 'waiting') {
      // Doing -> TODO (inbox)
      newStatus = 'inbox';
    } else if (task.status === 'done') {
      // Done -> Doing (next)
      newStatus = 'next';
    } else {
      // Already in TODO, do nothing
      return;
    }

    await db.update(schema.tasks)
      .set({ status: newStatus, waitingFor: null, updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));

    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks]);

  const markTaskDone = useCallback(async (task: Task) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));

    setMessage(fmt(i18n.tui.completed, { title: task.title }));
    await loadTasks();
  }, [i18n.tui.completed, loadTasks]);

  const getColumnLabel = (column: KanbanColumnType): string => {
    return i18n.kanban[column];
  };

  useInput((input, key) => {
    // Handle help mode - any key closes
    if (mode === 'help') {
      setMode('normal');
      return;
    }

    // Handle add mode
    if (mode === 'add') {
      if (key.escape) {
        setInputValue('');
        setMode('normal');
      }
      return;
    }

    // Clear message on any input
    if (message) {
      setMessage(null);
    }

    // Show help
    if (input === '?') {
      setMode('help');
      return;
    }

    // Quit
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Add task
    if (input === 'a') {
      setMode('add');
      return;
    }

    // Direct column switch with number keys
    if (input === '1') {
      setCurrentColumnIndex(0);
      return;
    }
    if (input === '2') {
      setCurrentColumnIndex(1);
      return;
    }
    if (input === '3') {
      setCurrentColumnIndex(2);
      return;
    }

    // Navigate between columns
    if (key.leftArrow || input === 'h') {
      setCurrentColumnIndex((prev) => (prev > 0 ? prev - 1 : COLUMNS.length - 1));
      return;
    }

    if (key.rightArrow || input === 'l') {
      setCurrentColumnIndex((prev) => (prev < COLUMNS.length - 1 ? prev + 1 : 0));
      return;
    }

    // Navigate within column
    if (key.upArrow || input === 'k') {
      setSelectedTaskIndices((prev) => ({
        ...prev,
        [currentColumn]: prev[currentColumn] > 0 ? prev[currentColumn] - 1 : Math.max(0, currentTasks.length - 1),
      }));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedTaskIndices((prev) => ({
        ...prev,
        [currentColumn]: prev[currentColumn] < currentTasks.length - 1 ? prev[currentColumn] + 1 : 0,
      }));
      return;
    }

    // Move task right (Enter)
    if (key.return && currentTasks.length > 0 && currentColumn !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskRight(task).then(() => {
        // Adjust selection if needed
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndices((prev) => ({
            ...prev,
            [currentColumn]: Math.max(0, prev[currentColumn] - 1),
          }));
        }
      });
      return;
    }

    // Move task left (Backspace)
    if ((key.backspace || key.delete) && currentTasks.length > 0 && currentColumn !== 'todo') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskLeft(task).then(() => {
        // Adjust selection if needed
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndices((prev) => ({
            ...prev,
            [currentColumn]: Math.max(0, prev[currentColumn] - 1),
          }));
        }
      });
      return;
    }

    // Mark as done (d)
    if (input === 'd' && currentTasks.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      markTaskDone(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndices((prev) => ({
            ...prev,
            [currentColumn]: Math.max(0, prev[currentColumn] - 1),
          }));
        }
      });
      return;
    }

    // Refresh
    if (input === 'r') {
      loadTasks();
      setMessage(i18n.tui.refreshed);
      return;
    }
  });

  // Help modal overlay
  if (mode === 'help') {
    return (
      <Box flexDirection="column" padding={1}>
        <HelpModal onClose={() => setMode('normal')} isKanban={true} />
      </Box>
    );
  }

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  // Turso connection info
  const tursoEnabled = isTursoEnabled();
  const tursoHost = tursoEnabled ? (() => {
    const config = getTursoConfig();
    if (config) {
      try {
        return new URL(config.url).host;
      } catch {
        return config.url;
      }
    }
    return '';
  })() : '';

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color={theme.colors.primary}>
            {formatTitle(i18n.tui.title)}
          </Text>
          <Text color={theme.colors.accent}> [KANBAN]</Text>
          <Text color={theme.colors.textMuted}>
            {theme.name === 'modern' ? ` v${VERSION}` : ` VER ${VERSION}`}
          </Text>
          {tursoEnabled && (
            <Text color={theme.colors.accent}>
              {theme.name === 'modern' ? ' ☁️ ' : ' [SYNC] '}{tursoHost}
            </Text>
          )}
          {!tursoEnabled && (
            <Text color={theme.colors.textMuted}>
              {theme.name === 'modern' ? ' 💾 local' : ' [LOCAL]'}
            </Text>
          )}
        </Box>
        <Text color={theme.colors.textMuted}>{i18n.tui.helpHint}</Text>
      </Box>

      {/* Column headers (numbers) */}
      <Box marginBottom={1}>
        {COLUMNS.map((column, index) => (
          <Box key={column} flexGrow={1} flexBasis={0} marginRight={index < 2 ? 1 : 0}>
            <Text color={currentColumnIndex === index ? theme.colors.textHighlight : theme.colors.textMuted}>
              {index + 1}:
            </Text>
          </Box>
        ))}
      </Box>

      {/* Kanban columns */}
      <Box flexDirection="row">
        {COLUMNS.map((column, index) => (
          <KanbanColumn
            key={column}
            title={getColumnLabel(column)}
            tasks={tasks[column]}
            isActive={index === currentColumnIndex}
            selectedTaskIndex={selectedTaskIndices[column]}
            columnIndex={index}
          />
        ))}
      </Box>

      {/* Add task input */}
      {mode === 'add' && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.newTask}
          </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder={i18n.tui.placeholder}
          />
          <Text color={theme.colors.textMuted}> {i18n.tui.inputHelp}</Text>
        </Box>
      )}

      {/* Message */}
      {message && mode === 'normal' && (
        <Box marginTop={1}>
          <Text color={theme.colors.textHighlight}>{message}</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        {theme.style.showFunctionKeys ? (
          <FunctionKeyBar keys={[
            { key: 'a', label: i18n.tui.keyBar.add },
            { key: 'd', label: i18n.tui.keyBar.done },
            { key: 'Enter', label: '→' },
            { key: 'BS', label: '←' },
            { key: '?', label: i18n.tui.keyBar.help },
            { key: 'q', label: i18n.tui.keyBar.quit },
          ]} />
        ) : (
          <Text color={theme.colors.textMuted}>
            a=add d=done Enter=→ BS=← h/l=col j/k=task ?=help q=quit
          </Text>
        )}
      </Box>
    </Box>
  );
}
