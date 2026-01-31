import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and, inArray, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { KanbanColumn, type KanbanColumnType } from './KanbanColumn.js';
import { HelpModal } from './HelpModal.js';
import { FunctionKeyBar } from './FunctionKeyBar.js';
import { SearchBar } from './SearchBar.js';
import { SearchResults } from './SearchResults.js';
import { getDb, schema } from '../../db/index.js';
import { t, fmt } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import { isTursoEnabled, getContexts, addContext, getContextFilter, setContextFilter as saveContextFilter } from '../../config.js';
import { VERSION } from '../../version.js';
import type { Task, Comment } from '../../db/schema.js';
import type { BorderStyleType } from '../theme/types.js';
import {
  useHistory,
  CreateTaskCommand,
  MoveTaskCommand,
  LinkTaskCommand,
  CreateCommentCommand,
  DeleteCommentCommand,
  SetContextCommand,
} from '../history/index.js';

const COLUMNS: KanbanColumnType[] = ['todo', 'doing', 'done'];

type KanbanMode = 'normal' | 'add' | 'help' | 'task-detail' | 'add-comment' | 'select-project' | 'search' | 'context-filter' | 'set-context' | 'add-context';

type SettingsMode = 'none' | 'theme-select' | 'mode-select' | 'lang-select';

interface KanbanBoardProps {
  onSwitchToGtd?: () => void;
  onOpenSettings?: (mode: SettingsMode) => void;
}

export function KanbanBoard({ onSwitchToGtd, onOpenSettings }: KanbanBoardProps): React.ReactElement {
  const theme = useTheme();
  const { exit } = useApp();
  const history = useHistory();
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(0);
  const [projects, setProjects] = useState<Task[]>([]);
  const [projectSelectIndex, setProjectSelectIndex] = useState(0);
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  // Context filter state - load from config for persistence across sessions/terminals
  const [contextFilter, setContextFilterState] = useState<string | null>(() => getContextFilter());
  const setContextFilter = useCallback((value: string | null) => {
    setContextFilterState(value);
    saveContextFilter(value);
  }, []);
  const [contextSelectIndex, setContextSelectIndex] = useState(0);
  const [availableContexts, setAvailableContexts] = useState<string[]>([]);

  const i18n = t();

  // Status mapping:
  // TODO = inbox + someday
  // Doing = next + waiting
  // Done = done
  const loadTasks = useCallback(async () => {
    const db = getDb();

    // Apply context filter helper
    const filterByContext = (taskList: Task[]): Task[] => {
      if (contextFilter === null) return taskList;
      if (contextFilter === '') return taskList.filter(t => !t.context);
      return taskList.filter(t => t.context === contextFilter);
    };

    // TODO: inbox + someday (non-project tasks)
    let todoTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['inbox', 'someday']),
        eq(schema.tasks.isProject, false)
      ));

    // Doing: next + waiting (non-project tasks)
    let doingTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['next', 'waiting']),
        eq(schema.tasks.isProject, false)
      ));

    // Done: done (non-project tasks) - only show last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let doneTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.status, 'done'),
        eq(schema.tasks.isProject, false),
        gte(schema.tasks.updatedAt, oneWeekAgo)
      ));

    // Load projects for linking
    const projectTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.isProject, true),
        eq(schema.tasks.status, 'next')
      ));

    setTasks({
      todo: filterByContext(todoTasks),
      doing: filterByContext(doingTasks),
      done: filterByContext(doneTasks),
    });
    setProjects(projectTasks);
    setAvailableContexts(getContexts());
  }, [contextFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const loadTaskComments = useCallback(async (taskId: string) => {
    const db = getDb();
    const comments = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, taskId));
    setTaskComments(comments);
  }, []);

  const addCommentToTask = useCallback(async (task: Task, content: string) => {
    const commentId = uuidv4();
    const command = new CreateCommentCommand({
      comment: {
        id: commentId,
        taskId: task.id,
        content: content.trim(),
        createdAt: new Date(),
      },
      description: i18n.tui.commentAdded || 'Comment added',
    });

    await history.execute(command);
    setMessage(i18n.tui.commentAdded || 'Comment added');
    await loadTaskComments(task.id);
  }, [i18n.tui.commentAdded, loadTaskComments, history]);

  const deleteComment = useCallback(async (comment: Comment) => {
    const command = new DeleteCommentCommand({
      comment,
      description: i18n.tui.commentDeleted || 'Comment deleted',
    });

    await history.execute(command);
    setMessage(i18n.tui.commentDeleted || 'Comment deleted');
    if (selectedTask) {
      await loadTaskComments(selectedTask.id);
    }
  }, [i18n.tui.commentDeleted, loadTaskComments, selectedTask, history]);

  const linkTaskToProject = useCallback(async (task: Task, project: Task) => {
    const command = new LinkTaskCommand({
      taskId: task.id,
      fromParentId: task.parentId,
      toParentId: project.id,
      description: fmt(i18n.tui.linkedToProject || 'Linked "{title}" to {project}', { title: task.title, project: project.title }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.linkedToProject || 'Linked "{title}" to {project}', { title: task.title, project: project.title }));
    await loadTasks();
  }, [i18n.tui.linkedToProject, loadTasks, history]);

  const currentColumn = COLUMNS[currentColumnIndex];
  const currentTasks = tasks[currentColumn];
  const selectedTaskIndex = selectedTaskIndices[currentColumn];

  // Get all tasks for search
  const getAllTasks = useCallback((): Task[] => {
    const allTasks: Task[] = [];
    for (const col of COLUMNS) {
      allTasks.push(...tasks[col]);
    }
    return allTasks;
  }, [tasks]);

  // Search tasks by query
  const searchTasks = useCallback((query: string): Task[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const allTasks = getAllTasks();
    return allTasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  }, [getAllTasks]);

  // Handle search query change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const results = searchTasks(value);
    setSearchResults(results);
    setSearchResultIndex(0);
  }, [searchTasks]);

  // Navigate to a task from search results
  const navigateToTask = useCallback((task: Task) => {
    // Determine which column the task belongs to based on status
    let targetColumn: KanbanColumnType;
    if (task.status === 'inbox' || task.status === 'someday') {
      targetColumn = 'todo';
    } else if (task.status === 'next' || task.status === 'waiting') {
      targetColumn = 'doing';
    } else {
      targetColumn = 'done';
    }

    const columnIndex = COLUMNS.indexOf(targetColumn);
    const taskIndex = tasks[targetColumn].findIndex(t => t.id === task.id);

    if (columnIndex >= 0 && taskIndex >= 0) {
      setCurrentColumnIndex(columnIndex);
      setSelectedTaskIndices(prev => ({
        ...prev,
        [targetColumn]: taskIndex,
      }));
      setMode('normal');
    }
  }, [tasks]);

  const addTask = useCallback(async (title: string, context?: string | null) => {
    if (!title.trim()) return;

    const now = new Date();
    const taskId = uuidv4();
    const command = new CreateTaskCommand({
      task: {
        id: taskId,
        title: title.trim(),
        status: 'inbox', // New tasks go to inbox (which maps to TODO)
        context: context || null,
        createdAt: now,
        updatedAt: now,
      },
      description: fmt(i18n.tui.added, { title: title.trim() }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.added, { title: title.trim() }));
    await loadTasks();
  }, [i18n.tui.added, loadTasks, history]);

  const handleInputSubmit = async (value: string) => {
    if (mode === 'add-comment' && selectedTask) {
      if (value.trim()) {
        await addCommentToTask(selectedTask, value);
      }
      setMode('task-detail');
      setInputValue('');
      return;
    }

    // Handle search mode submit
    if (mode === 'search') {
      if (searchResults.length > 0) {
        const task = searchResults[searchResultIndex];
        navigateToTask(task);
      } else {
        setMode('normal');
      }
      setSearchQuery('');
      setSearchResults([]);
      setSearchResultIndex(0);
      return;
    }

    // Handle add-context mode submit
    if (mode === 'add-context') {
      if (value.trim()) {
        const newContext = value.trim().toLowerCase().replace(/^@/, '');
        addContext(newContext);
        setAvailableContexts(getContexts());
        // Set the new context on the current task
        if (currentTasks.length > 0) {
          const task = currentTasks[selectedTaskIndex];
          await setTaskContext(task, newContext);
        }
      }
      setInputValue('');
      setContextSelectIndex(0);
      setMode('normal');
      return;
    }

    if (value.trim()) {
      // Pass contextFilter when adding a task, so it inherits the current filter context
      await addTask(value, contextFilter && contextFilter !== '' ? contextFilter : null);
    }
    setInputValue('');
    setMode('normal');
  };

  const moveTaskRight = useCallback(async (task: Task) => {
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

    const command = new MoveTaskCommand({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: newStatus,
      fromWaitingFor: task.waitingFor,
      toWaitingFor: null,
      description: fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks, history]);

  const moveTaskLeft = useCallback(async (task: Task) => {
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

    const command = new MoveTaskCommand({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: newStatus,
      fromWaitingFor: task.waitingFor,
      toWaitingFor: null,
      description: fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[newStatus] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks, history]);

  const markTaskDone = useCallback(async (task: Task) => {
    const command = new MoveTaskCommand({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: 'done',
      fromWaitingFor: task.waitingFor,
      toWaitingFor: null,
      description: fmt(i18n.tui.completed, { title: task.title }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.completed, { title: task.title }));
    await loadTasks();
  }, [i18n.tui.completed, loadTasks, history]);

  const setTaskContext = useCallback(async (task: Task, context: string | null) => {
    const description = context
      ? fmt(i18n.tui.context?.contextSet || 'Set context @{context} for "{title}"', { context, title: task.title })
      : fmt(i18n.tui.context?.contextCleared || 'Cleared context for "{title}"', { title: task.title });

    const command = new SetContextCommand({
      taskId: task.id,
      fromContext: task.context,
      toContext: context,
      description,
    });

    await history.execute(command);
    setMessage(description);
    await loadTasks();
  }, [i18n.tui.context, loadTasks, history]);

  const getColumnLabel = (column: KanbanColumnType): string => {
    return i18n.kanban[column];
  };

  useInput((input, key) => {
    // Handle help mode - any key closes
    if (mode === 'help') {
      setMode('normal');
      return;
    }

    // Handle search mode
    if (mode === 'search') {
      if (key.escape) {
        setSearchQuery('');
        setSearchResults([]);
        setSearchResultIndex(0);
        setMode('normal');
        return;
      }
      // Navigate search results with arrow keys, Ctrl+j/k, or Ctrl+n/p
      if (key.downArrow || (key.ctrl && (input === 'j' || input === 'n'))) {
        setSearchResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (key.upArrow || (key.ctrl && (input === 'k' || input === 'p'))) {
        setSearchResultIndex((prev) =>
          prev > 0 ? prev - 1 : Math.max(0, searchResults.length - 1)
        );
        return;
      }
      // Let TextInput handle other keys
      return;
    }

    // Handle add mode
    if (mode === 'add' || mode === 'add-comment') {
      if (key.escape) {
        setInputValue('');
        if (mode === 'add-comment') {
          setMode('task-detail');
        } else {
          setMode('normal');
        }
      }
      return;
    }

    // Handle task-detail mode
    if (mode === 'task-detail') {
      if (key.escape || key.backspace || input === 'b') {
        setMode('normal');
        setSelectedTask(null);
        setTaskComments([]);
        setSelectedCommentIndex(0);
        return;
      }

      // Navigate comments
      if (key.upArrow || input === 'k') {
        setSelectedCommentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, taskComments.length - 1)));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedCommentIndex((prev) => (prev < taskComments.length - 1 ? prev + 1 : 0));
        return;
      }

      // Delete comment
      if (input === 'd' && taskComments.length > 0) {
        const comment = taskComments[selectedCommentIndex];
        deleteComment(comment).then(() => {
          if (selectedCommentIndex >= taskComments.length - 1) {
            setSelectedCommentIndex(Math.max(0, selectedCommentIndex - 1));
          }
        });
        return;
      }

      // Add comment
      if (input === 'i') {
        setMode('add-comment');
        return;
      }

      // Link to project (P key)
      if (input === 'P' && projects.length > 0) {
        setProjectSelectIndex(0);
        setMode('select-project');
        return;
      }
      return;
    }

    // Handle select-project mode
    if (mode === 'select-project') {
      if (key.escape) {
        setProjectSelectIndex(0);
        setMode('task-detail');
        return;
      }

      // Navigate projects
      if (key.upArrow || input === 'k') {
        setProjectSelectIndex((prev) => (prev > 0 ? prev - 1 : projects.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setProjectSelectIndex((prev) => (prev < projects.length - 1 ? prev + 1 : 0));
        return;
      }

      // Select project with Enter
      if (key.return && selectedTask && projects.length > 0) {
        const project = projects[projectSelectIndex];
        linkTaskToProject(selectedTask, project);
        setProjectSelectIndex(0);
        setMode('task-detail');
        return;
      }
      return;
    }

    // Handle context-filter mode
    if (mode === 'context-filter') {
      if (key.escape) {
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }

      const contextOptions = ['all', 'none', ...availableContexts];
      if (key.upArrow || input === 'k') {
        setContextSelectIndex((prev) => (prev > 0 ? prev - 1 : contextOptions.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setContextSelectIndex((prev) => (prev < contextOptions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (key.return) {
        const selected = contextOptions[contextSelectIndex];
        if (selected === 'all') {
          setContextFilter(null);
        } else if (selected === 'none') {
          setContextFilter('');
        } else {
          setContextFilter(selected);
        }
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }
      return;
    }

    // Handle set-context mode
    if (mode === 'set-context') {
      if (key.escape) {
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }

      const contextOptions = ['clear', ...availableContexts, 'new'];
      if (key.upArrow || input === 'k') {
        setContextSelectIndex((prev) => (prev > 0 ? prev - 1 : contextOptions.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setContextSelectIndex((prev) => (prev < contextOptions.length - 1 ? prev + 1 : 0));
        return;
      }

      if (key.return && currentTasks.length > 0) {
        const selected = contextOptions[contextSelectIndex];
        if (selected === 'new') {
          setMode('add-context');
          setInputValue('');
          return;
        }
        const task = currentTasks[selectedTaskIndex];
        if (selected === 'clear') {
          setTaskContext(task, null);
        } else {
          setTaskContext(task, selected);
        }
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }
      return;
    }

    // Handle add-context mode
    if (mode === 'add-context') {
      if (key.escape) {
        setInputValue('');
        setMode('set-context');
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

    // Search mode
    if (input === '/') {
      setMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setSearchResultIndex(0);
      return;
    }

    // Context filter mode
    if (input === '@') {
      setContextSelectIndex(0);
      setMode('context-filter');
      return;
    }

    // Set context mode (c key)
    if (input === 'c' && currentTasks.length > 0) {
      setContextSelectIndex(0);
      setMode('set-context');
      return;
    }

    // Settings: Theme selector
    if (input === 'T' && onOpenSettings) {
      onOpenSettings('theme-select');
      return;
    }

    // Settings: Mode selector
    if (input === 'V' && onOpenSettings) {
      onOpenSettings('mode-select');
      return;
    }

    // Settings: Language selector
    if (input === 'L' && onOpenSettings) {
      onOpenSettings('lang-select');
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

    // Open task detail (Enter)
    if (key.return && currentTasks.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      setSelectedTask(task);
      loadTaskComments(task.id);
      setMode('task-detail');
      return;
    }

    // Move task right (m)
    if (input === 'm' && currentTasks.length > 0 && currentColumn !== 'done') {
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
    if (input === 'r' && !(key.ctrl)) {
      loadTasks();
      setMessage(i18n.tui.refreshed);
      return;
    }

    // Undo (u key) - only in normal mode
    if (input === 'u' && mode === 'normal') {
      history.undo().then((didUndo) => {
        if (didUndo) {
          setMessage(fmt(i18n.tui.undone, { action: history.undoDescription || '' }));
          loadTasks();
        } else {
          setMessage(i18n.tui.nothingToUndo);
        }
      }).catch(() => {
        setMessage(i18n.tui.undoFailed);
      });
      return;
    }

    // Redo (Ctrl+r) - only in normal mode
    if (key.ctrl && input === 'r' && mode === 'normal') {
      history.redo().then((didRedo) => {
        if (didRedo) {
          setMessage(fmt(i18n.tui.redone, { action: history.redoDescription || '' }));
          loadTasks();
        } else {
          setMessage(i18n.tui.nothingToRedo);
        }
      }).catch(() => {
        setMessage(i18n.tui.redoFailed);
      });
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
          <Text color={tursoEnabled ? theme.colors.accent : theme.colors.textMuted}>
            {theme.name === 'modern'
              ? (tursoEnabled ? ' ☁️ turso' : ' 💾 local')
              : (tursoEnabled ? ' [DB]TURSO' : ' [DB]local')}
          </Text>
          {contextFilter !== null && (
            <Text color={theme.colors.accent}>
              {' '}@{contextFilter === '' ? (i18n.tui.context?.none || 'none') : contextFilter}
            </Text>
          )}
        </Box>
        <Text color={theme.colors.textMuted}>{i18n.tui.helpHint}</Text>
      </Box>

      {/* Task detail view */}
      {(mode === 'task-detail' || mode === 'add-comment' || mode === 'select-project') && selectedTask ? (
        <Box flexDirection="column">
          {/* Task detail header */}
          <Box marginBottom={1}>
            <Text color={theme.colors.accent} bold>
              {theme.name === 'modern' ? '📋 ' : '>> '}{i18n.tui.taskDetailTitle || 'Task Details'}
            </Text>
            <Text color={theme.colors.textMuted}> (Esc/b: {i18n.tui.back || 'back'}, {i18n.tui.commentHint || 'i: add comment'})</Text>
          </Box>

          {/* Task info */}
          <Box
            flexDirection="column"
            borderStyle={theme.borders.list as BorderStyleType}
            borderColor={theme.colors.border}
            paddingX={1}
            paddingY={1}
            marginBottom={1}
          >
            <Text color={theme.colors.text} bold>{selectedTask.title}</Text>
            {selectedTask.description && (
              <Text color={theme.colors.textMuted}>{selectedTask.description}</Text>
            )}
            <Box marginTop={1}>
              <Text color={theme.colors.secondary} bold>{i18n.tui.taskDetailStatus}: </Text>
              <Text color={theme.colors.accent}>
                {i18n.status[selectedTask.status]}
                {selectedTask.waitingFor && ` (${selectedTask.waitingFor})`}
              </Text>
            </Box>
            <Box>
              <Text color={theme.colors.secondary} bold>{i18n.tui.context?.label || 'Context'}: </Text>
              <Text color={theme.colors.accent}>
                {selectedTask.context ? `@${selectedTask.context}` : (i18n.tui.context?.none || 'No context')}
              </Text>
            </Box>
            {selectedTask.dueDate && (
              <Text color={theme.colors.textMuted}>
                Due: {selectedTask.dueDate.toLocaleDateString()}
              </Text>
            )}
          </Box>

          {/* Comments section */}
          <Box marginBottom={1}>
            <Text color={theme.colors.secondary} bold>
              {i18n.tui.comments || 'Comments'} ({taskComments.length})
            </Text>
          </Box>
          <Box
            flexDirection="column"
            borderStyle={theme.borders.list as BorderStyleType}
            borderColor={theme.colors.border}
            paddingX={1}
            paddingY={1}
            minHeight={5}
          >
            {taskComments.length === 0 ? (
              <Text color={theme.colors.textMuted} italic>
                {i18n.tui.noComments || 'No comments yet'}
              </Text>
            ) : (
              taskComments.map((comment, index) => {
                const isSelected = index === selectedCommentIndex && mode === 'task-detail';
                return (
                  <Box key={comment.id} flexDirection="row" marginBottom={1}>
                    <Text color={isSelected ? theme.colors.textSelected : theme.colors.textMuted}>
                      {isSelected ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                    </Text>
                    <Box flexDirection="column">
                      <Text color={theme.colors.textMuted}>
                        [{comment.createdAt.toLocaleString()}]
                      </Text>
                      <Text color={isSelected ? theme.colors.textSelected : theme.colors.text} bold={isSelected}>
                        {comment.content}
                      </Text>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* Add comment input */}
          {mode === 'add-comment' && (
            <Box marginTop={1}>
              <Text color={theme.colors.secondary} bold>
                {i18n.tui.addComment || 'New comment: '}
              </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleInputSubmit}
                placeholder=""
              />
              <Text color={theme.colors.textMuted}> {i18n.tui.inputHelp}</Text>
            </Box>
          )}

          {/* Project selector */}
          {mode === 'select-project' && (
            <Box flexDirection="column" marginTop={1}>
              <Text color={theme.colors.secondary} bold>
                {i18n.tui.selectProject || 'Select project for'}: {selectedTask.title}
              </Text>
              <Box flexDirection="column" marginTop={1} borderStyle={theme.borders.list as BorderStyleType} borderColor={theme.colors.borderActive} paddingX={1}>
                {projects.map((project, index) => (
                  <Text
                    key={project.id}
                    color={index === projectSelectIndex ? theme.colors.textSelected : theme.colors.text}
                    bold={index === projectSelectIndex}
                  >
                    {index === projectSelectIndex ? theme.style.selectedPrefix : theme.style.unselectedPrefix}{project.title}
                  </Text>
                ))}
              </Box>
              <Text color={theme.colors.textMuted}>{i18n.tui.selectProjectHelp || 'j/k: select, Enter: confirm, Esc: cancel'}</Text>
            </Box>
          )}
        </Box>
      ) : mode === 'search' ? (
        <>
          {/* Search results */}
          {searchQuery && (
            <SearchResults
              results={searchResults}
              selectedIndex={searchResultIndex}
              query={searchQuery}
              viewMode="kanban"
            />
          )}
        </>
      ) : mode === 'context-filter' ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.context?.filter || 'Filter by context'}
          </Text>
          <Box flexDirection="column" marginTop={1} borderStyle={theme.borders.list as BorderStyleType} borderColor={theme.colors.borderActive} paddingX={1}>
            {['all', 'none', ...availableContexts].map((ctx, index) => {
              const label = ctx === 'all'
                ? (i18n.tui.context?.all || 'All')
                : ctx === 'none'
                  ? (i18n.tui.context?.none || 'No context')
                  : `@${ctx}`;
              const isActive = (ctx === 'all' && contextFilter === null) ||
                (ctx === 'none' && contextFilter === '') ||
                (ctx !== 'all' && ctx !== 'none' && contextFilter === ctx);
              return (
                <Text
                  key={ctx}
                  color={index === contextSelectIndex ? theme.colors.textSelected : theme.colors.text}
                  bold={index === contextSelectIndex}
                >
                  {index === contextSelectIndex ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                  {label}
                  {isActive && ' *'}
                </Text>
              );
            })}
          </Box>
          <Text color={theme.colors.textMuted}>{i18n.tui.context?.filterHelp || 'j/k: select, Enter: confirm, Esc: cancel'}</Text>
        </Box>
      ) : mode === 'set-context' && currentTasks.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.context?.setContext || 'Set context'}: {currentTasks[selectedTaskIndex]?.title}
          </Text>
          <Box flexDirection="column" marginTop={1} borderStyle={theme.borders.list as BorderStyleType} borderColor={theme.colors.borderActive} paddingX={1}>
            {['clear', ...availableContexts, 'new'].map((ctx, index) => {
              const label = ctx === 'clear'
                ? (i18n.tui.context?.none || 'No context')
                : ctx === 'new'
                  ? (i18n.tui.context?.addNew || '+ New context')
                  : `@${ctx}`;
              const currentContext = currentTasks[selectedTaskIndex]?.context;
              const isActive = (ctx === 'clear' && !currentContext) ||
                (ctx !== 'clear' && ctx !== 'new' && currentContext === ctx);
              return (
                <Text
                  key={ctx}
                  color={index === contextSelectIndex ? theme.colors.textSelected : theme.colors.text}
                  bold={index === contextSelectIndex}
                >
                  {index === contextSelectIndex ? theme.style.selectedPrefix : theme.style.unselectedPrefix}
                  {label}
                  {isActive && ' *'}
                </Text>
              );
            })}
          </Box>
          <Text color={theme.colors.textMuted}>{i18n.tui.context?.setContextHelp || 'j/k: select, Enter: confirm, Esc: cancel'}</Text>
        </Box>
      ) : mode === 'add-context' ? (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.context?.newContext || 'New context: '}
          </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder={i18n.tui.context?.newContextPlaceholder || 'Enter context name...'}
          />
          <Text color={theme.colors.textMuted}> {i18n.tui.inputHelp}</Text>
        </Box>
      ) : (
        <>
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
        </>
      )}

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

      {/* Search bar */}
      {mode === 'search' && (
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          onSubmit={handleInputSubmit}
        />
      )}

      {/* Message */}
      {message && mode === 'normal' && (
        <Box marginTop={1}>
          <Text color={theme.colors.textHighlight}>{message}</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        {mode === 'select-project' ? (
          <Text color={theme.colors.textMuted}>
            {i18n.tui.selectProjectHelp || 'j/k: select, Enter: confirm, Esc: cancel'}
          </Text>
        ) : (mode === 'task-detail' || mode === 'add-comment') ? (
          theme.style.showFunctionKeys ? (
            <FunctionKeyBar keys={[
              { key: 'i', label: i18n.tui.keyBar.comment },
              { key: 'd', label: i18n.tui.keyBar.delete },
              { key: 'P', label: i18n.tui.keyBar.project },
              { key: 'b', label: i18n.tui.keyBar.back },
            ]} />
          ) : (
            <Text color={theme.colors.textMuted}>
              i=comment d=delete P=link j/k=select Esc/b=back
            </Text>
          )
        ) : theme.style.showFunctionKeys ? (
          <FunctionKeyBar keys={[
            { key: 'a', label: i18n.tui.keyBar.add },
            { key: 'd', label: i18n.tui.keyBar.done },
            { key: 'm', label: '→' },
            { key: 'BS', label: '←' },
            { key: 'Enter', label: 'detail' },
            { key: '?', label: i18n.tui.keyBar.help },
            { key: 'q', label: i18n.tui.keyBar.quit },
          ]} />
        ) : (
          <Text color={theme.colors.textMuted}>
            a=add d=done m=→ BS=← Enter=detail h/l=col j/k=task ?=help q=quit
          </Text>
        )}
      </Box>
    </Box>
  );
}
