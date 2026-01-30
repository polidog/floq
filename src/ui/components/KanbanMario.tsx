import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and, inArray, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb, schema } from '../../db/index.js';
import { t, fmt } from '../../i18n/index.js';
import { useTheme } from '../theme/index.js';
import { isTursoEnabled, getContexts, addContext } from '../../config.js';
import { VERSION } from '../../version.js';
import type { Task, Comment } from '../../db/schema.js';
import {
  useHistory,
  CreateTaskCommand,
  MoveTaskCommand,
  CreateCommentCommand,
  DeleteCommentCommand,
  SetContextCommand,
} from '../history/index.js';
import { SearchBar } from './SearchBar.js';
import { SearchResults } from './SearchResults.js';
import { HelpModal } from './HelpModal.js';
import { MarioBoxInline } from './MarioBox.js';

type KanbanCategory = 'todo' | 'doing' | 'done';
type PaneFocus = 'category' | 'tasks';
type Mode = 'normal' | 'add' | 'help' | 'task-detail' | 'add-comment' | 'context-filter' | 'set-context' | 'add-context' | 'search';

type SettingsMode = 'none' | 'theme-select' | 'mode-select' | 'lang-select';

interface KanbanMarioProps {
  onOpenSettings?: (mode: SettingsMode) => void;
}

const CATEGORIES: KanbanCategory[] = ['todo', 'doing', 'done'];

export function KanbanMario({ onOpenSettings }: KanbanMarioProps): React.ReactElement {
  const theme = useTheme();
  const { exit } = useApp();
  const { stdout } = useStdout();
  const history = useHistory();
  const i18n = t();

  const [mode, setMode] = useState<Mode>('normal');
  const [paneFocus, setPaneFocus] = useState<PaneFocus>('category');
  const [selectedCategory, setSelectedCategory] = useState<KanbanCategory>('todo');
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<Record<KanbanCategory, Task[]>>({
    todo: [],
    doing: [],
    done: [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(0);
  const [contextFilter, setContextFilter] = useState<string | null>(null);
  const [contextSelectIndex, setContextSelectIndex] = useState(0);
  const [availableContexts, setAvailableContexts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState(0);

  const terminalWidth = stdout?.columns || 80;
  const leftPaneWidth = 20;
  const rightPaneWidth = terminalWidth - leftPaneWidth - 6;

  const loadTasks = useCallback(async () => {
    const db = getDb();

    const filterByContext = (taskList: Task[]): Task[] => {
      if (contextFilter === null) return taskList;
      if (contextFilter === '') return taskList.filter(t => !t.context);
      return taskList.filter(t => t.context === contextFilter);
    };

    let todoTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['inbox', 'someday']),
        eq(schema.tasks.isProject, false)
      ));

    let doingTasks = await db
      .select()
      .from(schema.tasks)
      .where(and(
        inArray(schema.tasks.status, ['next', 'waiting']),
        eq(schema.tasks.isProject, false)
      ));

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

    setTasks({
      todo: filterByContext(todoTasks),
      doing: filterByContext(doingTasks),
      done: filterByContext(doneTasks),
    });
    setAvailableContexts(getContexts());
  }, [contextFilter]);

  const loadTaskComments = useCallback(async (taskId: string) => {
    const db = getDb();
    const comments = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, taskId));
    setTaskComments(comments);
  }, []);

  // Get all tasks for search (across all categories)
  const getAllTasks = useCallback((): Task[] => {
    const allTasks: Task[] = [];
    for (const cat of CATEGORIES) {
      allTasks.push(...tasks[cat]);
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

  // Get kanban category from task status
  const getKanbanCategory = (status: string): KanbanCategory => {
    if (status === 'inbox' || status === 'someday') return 'todo';
    if (status === 'next' || status === 'waiting') return 'doing';
    return 'done';
  };

  // Navigate to a task from search results
  const navigateToTask = useCallback((task: Task) => {
    const targetCategory = getKanbanCategory(task.status);
    const categoryTasks = tasks[targetCategory];
    const taskIndex = categoryTasks.findIndex(t => t.id === task.id);

    if (taskIndex >= 0) {
      setSelectedCategory(targetCategory);
      setSelectedTaskIndex(taskIndex);
      setPaneFocus('tasks');
      setMode('normal');
    }
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const currentTasks = tasks[selectedCategory];

  const getCategoryLabel = (cat: KanbanCategory): string => {
    return i18n.kanban[cat];
  };

  const addTask = useCallback(async (title: string, context?: string | null) => {
    if (!title.trim()) return;

    const now = new Date();
    const taskId = uuidv4();
    const command = new CreateTaskCommand({
      task: {
        id: taskId,
        title: title.trim(),
        status: 'inbox',
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

  const moveTaskRight = useCallback(async (task: Task) => {
    let newStatus: 'inbox' | 'next' | 'waiting' | 'someday' | 'done';

    if (task.status === 'inbox' || task.status === 'someday') {
      newStatus = 'next';
    } else if (task.status === 'next' || task.status === 'waiting') {
      newStatus = 'done';
    } else {
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

  const handleInputSubmit = async (value: string) => {
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

    if (mode === 'add') {
      if (value.trim()) {
        await addTask(value, contextFilter && contextFilter !== '' ? contextFilter : null);
      }
      setInputValue('');
      setMode('normal');
      return;
    }

    if (mode === 'add-context') {
      if (value.trim()) {
        const newContext = value.trim().toLowerCase().replace(/^@/, '');
        addContext(newContext);
        setAvailableContexts(getContexts());
      }
      setInputValue('');
      setContextSelectIndex(0);
      setMode('normal');
      return;
    }
  };

  useInput((input, key) => {
    // Handle help mode - let HelpModal handle its own input
    if (mode === 'help') {
      return;
    }

    if (mode === 'add' || mode === 'add-comment' || mode === 'add-context') {
      if (key.escape) {
        setInputValue('');
        setMode('normal');
      }
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

    if (message) setMessage(null);

    // Quit
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Help
    if (input === '?') {
      setMode('help');
      return;
    }

    // Add task
    if (input === 'a') {
      setMode('add');
      return;
    }

    // Context filter
    if (input === '@') {
      setContextSelectIndex(0);
      setMode('context-filter');
      return;
    }

    // Search
    if (input === '/') {
      setMode('search');
      return;
    }

    // Settings
    if (input === 'T' && onOpenSettings) {
      onOpenSettings('theme-select');
      return;
    }
    if (input === 'V' && onOpenSettings) {
      onOpenSettings('mode-select');
      return;
    }
    if (input === 'L' && onOpenSettings) {
      onOpenSettings('lang-select');
      return;
    }

    // Navigation
    if (paneFocus === 'category') {
      if (key.upArrow || input === 'k') {
        const idx = CATEGORIES.indexOf(selectedCategory);
        setSelectedCategory(CATEGORIES[idx > 0 ? idx - 1 : CATEGORIES.length - 1]);
        setSelectedTaskIndex(0);
        return;
      }
      if (key.downArrow || input === 'j') {
        const idx = CATEGORIES.indexOf(selectedCategory);
        setSelectedCategory(CATEGORIES[idx < CATEGORIES.length - 1 ? idx + 1 : 0]);
        setSelectedTaskIndex(0);
        return;
      }
      if (key.rightArrow || input === 'l' || key.return) {
        if (currentTasks.length > 0) {
          setPaneFocus('tasks');
        }
        return;
      }
    }

    if (paneFocus === 'tasks') {
      if (key.escape || key.leftArrow || input === 'h') {
        setPaneFocus('category');
        return;
      }
      if (key.upArrow || input === 'k') {
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : currentTasks.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedTaskIndex((prev) => (prev < currentTasks.length - 1 ? prev + 1 : 0));
        return;
      }

      // Mark done
      if (input === 'd' && currentTasks.length > 0) {
        const task = currentTasks[selectedTaskIndex];
        markTaskDone(task).then(() => {
          if (selectedTaskIndex >= currentTasks.length - 1) {
            setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
          }
        });
        return;
      }

      // Move right
      if (input === 'm' && currentTasks.length > 0 && selectedCategory !== 'done') {
        const task = currentTasks[selectedTaskIndex];
        moveTaskRight(task).then(() => {
          if (selectedTaskIndex >= currentTasks.length - 1) {
            setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
          }
        });
        return;
      }

      // Undo
      if (input === 'u') {
        history.undo().then((didUndo) => {
          if (didUndo) {
            setMessage(fmt(i18n.tui.undone, { action: history.undoDescription || '' }));
            loadTasks();
          } else {
            setMessage(i18n.tui.nothingToUndo);
          }
        });
        return;
      }
    }

    // Refresh
    if (input === 'r' && !key.ctrl) {
      loadTasks();
      setMessage(i18n.tui.refreshed);
      return;
    }
  });

  const tursoEnabled = isTursoEnabled();

  // Help modal overlay
  if (mode === 'help') {
    return (
      <Box flexDirection="column" padding={1}>
        <HelpModal onClose={() => setMode('normal')} isKanban={true} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Mario-style Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text color={theme.colors.secondary} bold>WORLD </Text>
          <Text color={theme.colors.primary} bold>{(new Date().getMonth() + 1)}-{new Date().getDate()}</Text>
          <Text color={theme.colors.text}> </Text>
          <Text color={theme.colors.secondary}>x</Text>
          <Text color={theme.colors.text}>{(tasks.todo.length + tasks.doing.length).toString().padStart(2, '0')}</Text>
          <Text color={theme.colors.textMuted}> FLOQ v{VERSION}</Text>
          <Text color={theme.colors.accent}> [KANBAN]</Text>
          <Text color={tursoEnabled ? theme.colors.accent : theme.colors.textMuted}>
            {tursoEnabled ? ' [TURSO]' : ' [LOCAL]'}
          </Text>
          {contextFilter !== null && (
            <Text color={theme.colors.accent}>
              {' '}@{contextFilter === '' ? 'none' : contextFilter}
            </Text>
          )}
        </Box>
        <Box>
          <Text color={theme.colors.secondary}>TIME </Text>
          <Text color={theme.colors.text}>{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</Text>
        </Box>
      </Box>

      {/* Main content */}
      {mode === 'context-filter' ? (
        <Box flexDirection="column">
          <Text color={theme.colors.secondary} bold>Filter by context</Text>
          <Box flexDirection="column" marginTop={1}>
            {['all', 'none', ...availableContexts].map((ctx, index) => {
              const label = ctx === 'all' ? 'All' : ctx === 'none' ? 'No context' : `@${ctx}`;
              return (
                <Text
                  key={ctx}
                  color={index === contextSelectIndex ? theme.colors.textSelected : theme.colors.text}
                  bold={index === contextSelectIndex}
                >
                  {index === contextSelectIndex ? '🍄 ' : '   '}{label}
                </Text>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Box flexDirection="row">
          {/* Left pane: Categories */}
          <Box marginRight={2}>
            <MarioBoxInline
              title={'STAGE'}
              width={leftPaneWidth}
              minHeight={5}
              isActive={paneFocus === 'category'}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = cat === selectedCategory;
                const count = tasks[cat].length;
                return (
                  <Text
                    key={cat}
                    color={isSelected && paneFocus === 'category' ? theme.colors.textSelected : theme.colors.text}
                    bold={isSelected}
                  >
                    {isSelected ? '🍄 ' : '   '}{getCategoryLabel(cat)} ({count})
                  </Text>
                );
              })}
            </MarioBoxInline>
          </Box>

          {/* Right pane: Tasks */}
          <Box flexGrow={1}>
            <MarioBoxInline
              title={getCategoryLabel(selectedCategory)}
              width={rightPaneWidth}
              minHeight={10}
              isActive={paneFocus === 'tasks'}
            >
              {currentTasks.length === 0 ? (
                <Text color={theme.colors.textMuted} italic>
                  {i18n.tui.noTasks}
                </Text>
              ) : (
                currentTasks.map((task, index) => {
                  const isSelected = paneFocus === 'tasks' && index === selectedTaskIndex;
                  return (
                    <Text
                      key={task.id}
                      color={isSelected ? theme.colors.textSelected : theme.colors.text}
                      bold={isSelected}
                    >
                      {isSelected ? '🍄 ' : '   '}{task.title}
                      {task.context && <Text color={theme.colors.muted}> @{task.context}</Text>}
                    </Text>
                  );
                })
              )}
            </MarioBoxInline>
          </Box>
        </Box>
      )}

      {/* Add task input */}
      {mode === 'add' && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>{i18n.tui.newTask}</Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder={i18n.tui.placeholder}
          />
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

      {/* Search results */}
      {mode === 'search' && searchQuery && (
        <SearchResults
          results={searchResults}
          selectedIndex={searchResultIndex}
          query={searchQuery}
          viewMode="kanban"
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
        <Text color={theme.colors.textMuted}>
          {paneFocus === 'category'
            ? i18n.tui.kanbanFooter.category
            : i18n.tui.kanbanFooter.tasks}
        </Text>
      </Box>
    </Box>
  );
}
