import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { TaskItem, type ProjectProgress } from './components/TaskItem.js';
import { HelpModal } from './components/HelpModal.js';
import { FunctionKeyBar } from './components/FunctionKeyBar.js';
import { SearchBar } from './components/SearchBar.js';
import { SearchResults } from './components/SearchResults.js';
import { SplashScreen } from './SplashScreen.js';
import { ThemeSelector } from './ThemeSelector.js';
import { ModeSelector } from './ModeSelector.js';
import { LanguageSelector } from './LanguageSelector.js';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';
import { ThemeProvider, useTheme } from './theme/index.js';
import { getThemeName, getViewMode, setThemeName, setViewMode, setLocale, isTursoEnabled } from '../config.js';
import type { ThemeName, ViewMode, Locale } from '../config.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { VERSION } from '../version.js';
import type { Task, Comment } from '../db/schema.js';
import type { BorderStyleType } from './theme/types.js';

type TabType = 'inbox' | 'next' | 'waiting' | 'someday' | 'projects' | 'done';
const TABS: TabType[] = ['inbox', 'next', 'waiting', 'someday', 'projects', 'done'];

type TasksByTab = Record<TabType, Task[]>;
type Mode = 'splash' | 'normal' | 'add' | 'add-to-project' | 'help' | 'project-detail' | 'select-project' | 'task-detail' | 'add-comment' | 'move-to-waiting' | 'search' | 'confirm-delete';

type SettingsMode = 'none' | 'theme-select' | 'mode-select' | 'lang-select';

export function App(): React.ReactElement {
  const [themeName, setThemeNameState] = useState<ThemeName>(getThemeName);
  const [viewMode, setViewModeState] = useState<ViewMode>(getViewMode);
  const [settingsMode, setSettingsMode] = useState<SettingsMode>('none');
  const [, forceUpdate] = useState({});

  const handleThemeSelect = (theme: ThemeName) => {
    setThemeName(theme);
    setThemeNameState(theme);
    setSettingsMode('none');
  };

  const handleModeSelect = (mode: ViewMode) => {
    setViewMode(mode);
    setViewModeState(mode);
    setSettingsMode('none');
  };

  const handleLocaleSelect = (locale: Locale) => {
    setLocale(locale);
    setSettingsMode('none');
    forceUpdate({});
  };

  const handleSettingsCancel = () => {
    setSettingsMode('none');
  };

  // Settings selector screens
  if (settingsMode === 'theme-select') {
    return (
      <ThemeProvider themeName={themeName}>
        <ThemeSelector onSelect={handleThemeSelect} onCancel={handleSettingsCancel} />
      </ThemeProvider>
    );
  }

  if (settingsMode === 'mode-select') {
    return (
      <ThemeProvider themeName={themeName}>
        <ModeSelector onSelect={handleModeSelect} onCancel={handleSettingsCancel} />
      </ThemeProvider>
    );
  }

  if (settingsMode === 'lang-select') {
    return (
      <ThemeProvider themeName={themeName}>
        <LanguageSelector onSelect={handleLocaleSelect} onCancel={handleSettingsCancel} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider themeName={themeName}>
      {viewMode === 'kanban' ? (
        <KanbanBoard onOpenSettings={setSettingsMode} />
      ) : (
        <AppContent onOpenSettings={setSettingsMode} />
      )}
    </ThemeProvider>
  );
}

interface AppContentProps {
  onOpenSettings: (mode: SettingsMode) => void;
}

function AppContent({ onOpenSettings }: AppContentProps): React.ReactElement {
  const theme = useTheme();
  const { exit } = useApp();
  const [mode, setMode] = useState<Mode>('splash');
  const [inputValue, setInputValue] = useState('');
  const [currentListIndex, setCurrentListIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<TasksByTab>({
    inbox: [],
    next: [],
    waiting: [],
    someday: [],
    projects: [],
    done: [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Task | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [taskToLink, setTaskToLink] = useState<Task | null>(null);
  const [projectSelectIndex, setProjectSelectIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);
  const [selectedCommentIndex, setSelectedCommentIndex] = useState(0);
  const [taskToWaiting, setTaskToWaiting] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [projectProgress, setProjectProgress] = useState<Record<string, ProjectProgress>>({});
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState(0);

  const i18n = t();

  const loadTasks = useCallback(async () => {
    const db = getDb();
    const newTasks: TasksByTab = {
      inbox: [],
      next: [],
      waiting: [],
      someday: [],
      projects: [],
      done: [],
    };

    // Load all tasks (including project children) by status
    const statusList = ['inbox', 'next', 'waiting', 'someday', 'done'] as const;
    for (const status of statusList) {
      newTasks[status] = await db
        .select()
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.status, status),
          eq(schema.tasks.isProject, false)
        ));
    }

    // Load projects (isProject = true, not done)
    newTasks.projects = await db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.isProject, true),
        eq(schema.tasks.status, 'next')
      ));

    // Calculate progress for each project
    const progress: Record<string, ProjectProgress> = {};
    for (const project of newTasks.projects) {
      const children = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.parentId, project.id));
      const total = children.length;
      const completed = children.filter(t => t.status === 'done').length;
      progress[project.id] = { completed, total };
    }
    setProjectProgress(progress);

    setTasks(newTasks);
  }, []);

  // Get parent project for a task
  const getParentProject = (parentId: string | null): Task | undefined => {
    if (!parentId) return undefined;
    return tasks.projects.find(p => p.id === parentId);
  };

  const loadProjectTasks = useCallback(async (projectId: string) => {
    const db = getDb();
    const children = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.parentId, projectId));
    setProjectTasks(children);
  }, []);

  const loadTaskComments = useCallback(async (taskId: string) => {
    const db = getDb();
    const comments = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, taskId));
    setTaskComments(comments);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const currentTab = TABS[currentListIndex];
  const currentTasks = mode === 'project-detail' ? projectTasks : tasks[currentTab];

  // Get all tasks for search (across all statuses)
  const getAllTasks = useCallback((): Task[] => {
    const allTasks: Task[] = [];
    for (const tab of TABS) {
      allTasks.push(...tasks[tab]);
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
    const targetTab = task.isProject ? 'projects' : task.status as TabType;
    const tabIndex = TABS.indexOf(targetTab);
    const tabTasks = tasks[targetTab];
    const taskIndex = tabTasks.findIndex(t => t.id === task.id);

    if (tabIndex >= 0 && taskIndex >= 0) {
      setCurrentListIndex(tabIndex);
      setSelectedTaskIndex(taskIndex);
      setMode('normal');
    }
  }, [tasks]);

  const addTask = useCallback(async (title: string, parentId?: string) => {
    if (!title.trim()) return;

    const db = getDb();
    const now = new Date();
    await db.insert(schema.tasks)
      .values({
        id: uuidv4(),
        title: title.trim(),
        status: parentId ? 'next' : 'inbox',
        parentId: parentId || null,
        createdAt: now,
        updatedAt: now,
      });

    setMessage(fmt(i18n.tui.added, { title: title.trim() }));
    await loadTasks();
  }, [i18n.tui.added, loadTasks]);

  const addCommentToTask = useCallback(async (task: Task, content: string) => {
    const db = getDb();
    await db.insert(schema.comments).values({
      id: uuidv4(),
      taskId: task.id,
      content: content.trim(),
      createdAt: new Date(),
    });
    setMessage(i18n.tui.commentAdded || 'Comment added');
    await loadTaskComments(task.id);
  }, [i18n.tui.commentAdded, loadTaskComments]);

  const deleteComment = useCallback(async (comment: Comment) => {
    const db = getDb();
    await db.delete(schema.comments).where(eq(schema.comments.id, comment.id));
    setMessage(i18n.tui.commentDeleted || 'Comment deleted');
    if (selectedTask) {
      await loadTaskComments(selectedTask.id);
    }
  }, [i18n.tui.commentDeleted, loadTaskComments, selectedTask]);

  const handleInputSubmit = async (value: string) => {
    if (mode === 'move-to-waiting' && taskToWaiting) {
      if (value.trim()) {
        await moveTaskToWaiting(taskToWaiting, value);
      }
      setTaskToWaiting(null);
      setMode('normal');
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

    if (value.trim()) {
      if (mode === 'add-comment' && selectedTask) {
        await addCommentToTask(selectedTask, value);
        setMode('task-detail');
      } else if (mode === 'add-to-project' && selectedProject) {
        await addTask(value, selectedProject.id);
        await loadProjectTasks(selectedProject.id);
        setMode('project-detail');
      } else {
        await addTask(value);
        setMode('normal');
      }
    } else {
      if (mode === 'add-comment') {
        setMode('task-detail');
      } else {
        setMode(mode === 'add-to-project' ? 'project-detail' : 'normal');
      }
    }
    setInputValue('');
  };

  const linkTaskToProject = useCallback(async (task: Task, project: Task) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ parentId: project.id, updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.linkedToProject || 'Linked "{title}" to {project}', { title: task.title, project: project.title }));
    await loadTasks();
  }, [i18n.tui.linkedToProject, loadTasks]);

  const markTaskDone = useCallback(async (task: Task) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.completed, { title: task.title }));
    await loadTasks();
  }, [i18n.tui.completed, loadTasks]);

  const moveTaskToStatus = useCallback(async (task: Task, status: 'inbox' | 'next' | 'someday') => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ status, waitingFor: null, updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[status] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks]);

  const moveTaskToWaiting = useCallback(async (task: Task, waitingFor: string) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ status: 'waiting', waitingFor: waitingFor.trim(), updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.movedToWaiting, { title: task.title, person: waitingFor.trim() }));
    await loadTasks();
  }, [i18n.tui.movedToWaiting, loadTasks]);

  const makeTaskProject = useCallback(async (task: Task) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ isProject: true, status: 'next', updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.madeProject || 'Made project: {title}', { title: task.title }));
    await loadTasks();
  }, [i18n.tui.madeProject, loadTasks]);

  const deleteTask = useCallback(async (task: Task) => {
    const db = getDb();
    // Delete comments first
    await db.delete(schema.comments).where(eq(schema.comments.taskId, task.id));
    // Delete the task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.deleted || 'Deleted: "{title}"', { title: task.title }));
    await loadTasks();
  }, [i18n.tui.deleted, loadTasks]);

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case 'inbox':
        return i18n.tui.tabInbox;
      case 'next':
        return i18n.tui.tabNext;
      case 'waiting':
        return i18n.tui.tabWaiting;
      case 'someday':
        return i18n.tui.tabSomeday;
      case 'projects':
        return i18n.tui.tabProjects || 'Projects';
      case 'done':
        return i18n.tui.tabDone || 'Done';
    }
  };

  useInput((input, key) => {
    // Skip splash screen on any key
    if (mode === 'splash') {
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

    // Handle confirm-delete mode
    if (mode === 'confirm-delete' && taskToDelete) {
      if (input === 'y' || input === 'Y') {
        deleteTask(taskToDelete).then(() => {
          if (selectedTaskIndex >= currentTasks.length - 1) {
            setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
          }
        });
        setTaskToDelete(null);
        setMode('normal');
        return;
      }
      if (input === 'n' || input === 'N' || key.escape) {
        setMessage(i18n.tui.deleteCancelled || 'Delete cancelled');
        setTaskToDelete(null);
        setMode('normal');
        return;
      }
      // Ignore other keys in confirm mode
      return;
    }

    // Handle add mode
    if (mode === 'add' || mode === 'add-to-project' || mode === 'add-comment' || mode === 'move-to-waiting') {
      if (key.escape) {
        setInputValue('');
        if (mode === 'move-to-waiting') {
          setTaskToWaiting(null);
          setMode('normal');
        } else if (mode === 'add-comment') {
          setMode('task-detail');
        } else if (mode === 'add-to-project') {
          setMode('project-detail');
        } else {
          setMode('normal');
        }
      }
      return;
    }

    // Handle task-detail mode
    if (mode === 'task-detail') {
      if (key.escape || key.backspace || input === 'b') {
        // If came from project-detail, go back to project-detail
        if (selectedProject) {
          setMode('project-detail');
          // Find the task index in project tasks
          const taskIndex = projectTasks.findIndex(t => t.id === selectedTask?.id);
          if (taskIndex >= 0) {
            setSelectedTaskIndex(taskIndex);
          }
        } else {
          setMode('normal');
        }
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
      if (input === 'P' && tasks.projects.length > 0) {
        setTaskToLink(selectedTask);
        setProjectSelectIndex(0);
        setMode('select-project');
        return;
      }
      return;
    }

    // Handle select-project mode
    if (mode === 'select-project') {
      if (key.escape) {
        const wasFromTaskDetail = selectedTask !== null;
        setTaskToLink(null);
        setProjectSelectIndex(0);
        setMode(wasFromTaskDetail ? 'task-detail' : 'normal');
        return;
      }

      // Navigate projects
      if (key.upArrow || input === 'k') {
        setProjectSelectIndex((prev) => (prev > 0 ? prev - 1 : tasks.projects.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setProjectSelectIndex((prev) => (prev < tasks.projects.length - 1 ? prev + 1 : 0));
        return;
      }

      // Select project with Enter
      if (key.return && taskToLink && tasks.projects.length > 0) {
        const project = tasks.projects[projectSelectIndex];
        const wasFromTaskDetail = selectedTask !== null;
        linkTaskToProject(taskToLink, project);
        setTaskToLink(null);
        setProjectSelectIndex(0);
        setMode(wasFromTaskDetail ? 'task-detail' : 'normal');
        return;
      }
      return;
    }

    // Handle project-detail mode
    if (mode === 'project-detail') {
      if (key.escape || key.backspace || input === 'b') {
        setMode('normal');
        setSelectedProject(null);
        setProjectTasks([]);
        setSelectedTaskIndex(0);
        return;
      }

      // Add task to this project
      if (input === 'a') {
        setMode('add-to-project');
        return;
      }

      // Navigate within project tasks
      if (key.upArrow || input === 'k') {
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : projectTasks.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedTaskIndex((prev) => (prev < projectTasks.length - 1 ? prev + 1 : 0));
        return;
      }

      // Mark child task as done
      if (input === 'd' && projectTasks.length > 0) {
        const task = projectTasks[selectedTaskIndex];
        markTaskDone(task).then(() => {
          if (selectedProject) {
            loadProjectTasks(selectedProject.id);
          }
        });
        return;
      }

      // Enter to view task details
      if (key.return && projectTasks.length > 0) {
        const task = projectTasks[selectedTaskIndex];
        setSelectedTask(task);
        loadTaskComments(task.id);
        setMode('task-detail');
        return;
      }

      return;
    }

    // Clear message on any input
    if (message) {
      setMessage(null);
    }

    // Function key support (escape sequences)
    // F1 = Help, F2 = Add, F3 = Done, F4 = Next, F5 = Refresh, F10 = Quit
    if (input === '\x1bOP' || input === '\x1b[11~') {
      // F1 - Help
      setMode('help');
      return;
    }
    if (input === '\x1bOQ' || input === '\x1b[12~') {
      // F2 - Add
      setMode('add');
      return;
    }
    if ((input === '\x1bOR' || input === '\x1b[13~') && currentTasks.length > 0) {
      // F3 - Done
      const task = currentTasks[selectedTaskIndex];
      markTaskDone(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }
    if ((input === '\x1bOS' || input === '\x1b[14~') && currentTasks.length > 0 && currentTab !== 'next' && currentTab !== 'projects') {
      // F4 - Move to Next
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'next').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }
    if (input === '\x1b[15~') {
      // F5 - Refresh
      loadTasks();
      setMessage(i18n.tui.refreshed);
      return;
    }
    if (input === '\x1b[21~') {
      // F10 - Quit
      exit();
      return;
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

    // Settings: Theme selector
    if (input === 'T') {
      onOpenSettings('theme-select');
      return;
    }

    // Settings: Mode selector
    if (input === 'V') {
      onOpenSettings('mode-select');
      return;
    }

    // Settings: Language selector
    if (input === 'L') {
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

    // Direct tab switch with number keys
    if (input === '1') {
      setCurrentListIndex(0);
      setSelectedTaskIndex(0);
      return;
    }
    if (input === '2') {
      setCurrentListIndex(1);
      setSelectedTaskIndex(0);
      return;
    }
    if (input === '3') {
      setCurrentListIndex(2);
      setSelectedTaskIndex(0);
      return;
    }
    if (input === '4') {
      setCurrentListIndex(3);
      setSelectedTaskIndex(0);
      return;
    }
    if (input === '5') {
      setCurrentListIndex(4);
      setSelectedTaskIndex(0);
      return;
    }
    if (input === '6') {
      setCurrentListIndex(5);
      setSelectedTaskIndex(0);
      return;
    }

    // Navigate between lists
    if (key.leftArrow || input === 'h') {
      setCurrentListIndex((prev) => (prev > 0 ? prev - 1 : TABS.length - 1));
      setSelectedTaskIndex(0);
      return;
    }

    if (key.rightArrow || input === 'l') {
      setCurrentListIndex((prev) => (prev < TABS.length - 1 ? prev + 1 : 0));
      setSelectedTaskIndex(0);
      return;
    }

    // Navigate within list
    if (key.upArrow || input === 'k') {
      setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : currentTasks.length - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedTaskIndex((prev) => (prev < currentTasks.length - 1 ? prev + 1 : 0));
      return;
    }

    // Enter to view project details (on projects tab)
    if (key.return && currentTab === 'projects' && currentTasks.length > 0) {
      const project = currentTasks[selectedTaskIndex];
      setSelectedProject(project);
      loadProjectTasks(project.id);
      setMode('project-detail');
      setSelectedTaskIndex(0);
      return;
    }

    // Enter to view task details (on non-projects tabs)
    if (key.return && currentTab !== 'projects' && currentTasks.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      setSelectedTask(task);
      loadTaskComments(task.id);
      setMode('task-detail');
      return;
    }

    // Mark as project (p key)
    if (input === 'p' && currentTasks.length > 0 && currentTab !== 'projects' && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      makeTaskProject(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Link to project (P key - shift+p)
    if (input === 'P' && currentTasks.length > 0 && currentTab !== 'projects' && currentTab !== 'done' && tasks.projects.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      setTaskToLink(task);
      setProjectSelectIndex(0);
      setMode('select-project');
      return;
    }

    // Mark as done (not available on done tab)
    if (input === 'd' && currentTasks.length > 0 && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      markTaskDone(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Delete task (D key - with confirmation)
    if (input === 'D' && currentTasks.length > 0 && currentTab !== 'projects') {
      const task = currentTasks[selectedTaskIndex];
      setTaskToDelete(task);
      setMode('confirm-delete');
      return;
    }

    // Move to next actions
    if (input === 'n' && currentTasks.length > 0 && currentTab !== 'next' && currentTab !== 'projects' && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'next').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Move to someday
    if (input === 's' && currentTasks.length > 0 && currentTab !== 'someday' && currentTab !== 'projects' && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'someday').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Move to waiting
    if (input === 'w' && currentTasks.length > 0 && currentTab !== 'waiting' && currentTab !== 'projects' && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      setTaskToWaiting(task);
      setMode('move-to-waiting');
      return;
    }

    // Move to inbox
    if (input === 'i' && currentTasks.length > 0 && currentTab !== 'inbox' && currentTab !== 'projects' && currentTab !== 'done') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'inbox').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
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
  }, { isActive: mode !== 'help' });

  // Splash screen
  if (mode === 'splash') {
    return <SplashScreen onComplete={() => setMode('normal')} />;
  }

  // Help modal overlay
  if (mode === 'help') {
    return (
      <Box flexDirection="column" padding={1}>
        <HelpModal onClose={() => setMode('normal')} />
      </Box>
    );
  }

  const formatTitle = (title: string) =>
    theme.style.headerUppercase ? title.toUpperCase() : title;

  const formatTabLabel = (label: string, isActive: boolean) => {
    const [open, close] = theme.style.tabBrackets;
    return `${open}${label}${close}`;
  };

  // Turso 接続情報を取得
  const tursoEnabled = isTursoEnabled();

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color={theme.colors.primary}>
            {formatTitle(i18n.tui.title)}
          </Text>
          <Text color={theme.colors.textMuted}>
            {theme.name === 'modern' ? ` v${VERSION}` : ` VER ${VERSION}`}
          </Text>
          <Text color={tursoEnabled ? theme.colors.accent : theme.colors.textMuted}>
            {theme.name === 'modern'
              ? (tursoEnabled ? ' ☁️ turso' : ' 💾 local')
              : (tursoEnabled ? ' [DB]TURSO' : ' [DB]local')}
          </Text>
        </Box>
        <Text color={theme.colors.textMuted}>{i18n.tui.helpHint}</Text>
      </Box>

      {/* Tab bar */}
      <Box marginBottom={1}>
        {TABS.map((tab, index) => {
          const isActive = index === currentListIndex && mode !== 'project-detail';
          const count = tasks[tab].length;
          const label = `${index + 1}:${getTabLabel(tab)}(${count})`;

          return (
            <Box key={tab} marginRight={1}>
              <Text
                color={isActive ? theme.colors.textSelected : theme.colors.textMuted}
                bold={isActive}
                inverse={isActive && theme.style.tabActiveInverse}
              >
                {formatTabLabel(` ${label} `, isActive)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Project detail header */}
      {mode === 'project-detail' && selectedProject && (
        <>
          <Box marginBottom={1}>
            <Text color={theme.colors.accent} bold>
              {theme.name === 'modern' ? '📁 ' : '>> '}{selectedProject.title}
            </Text>
            <Text color={theme.colors.textMuted}> (Esc/b: {i18n.tui.back || 'back'})</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.secondary} bold>
              {i18n.tui.projectTasks || 'Tasks'} ({projectTasks.length})
            </Text>
          </Box>
        </>
      )}

      {/* Task detail view */}
      {(mode === 'task-detail' || mode === 'add-comment') && selectedTask && (
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
        </Box>
      )}

      {/* Search results */}
      {mode === 'search' && searchQuery && (
        <SearchResults
          results={searchResults}
          selectedIndex={searchResultIndex}
          query={searchQuery}
        />
      )}

      {/* Task list */}
      {mode !== 'task-detail' && mode !== 'add-comment' && mode !== 'search' && (
        <Box
          flexDirection="column"
          borderStyle={theme.borders.list as BorderStyleType}
          borderColor={theme.colors.border}
          paddingX={1}
          paddingY={1}
          minHeight={10}
        >
          {currentTasks.length === 0 ? (
            <Text color={theme.colors.textMuted} italic>
              {i18n.tui.noTasks}
            </Text>
          ) : (
            currentTasks.map((task, index) => {
              const parentProject = getParentProject(task.parentId);
              const progress = currentTab === 'projects' ? projectProgress[task.id] : undefined;
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={index === selectedTaskIndex}
                  projectName={parentProject?.title}
                  progress={progress}
                />
              );
            })
          )}
        </Box>
      )}

      {/* Add task input */}
      {(mode === 'add' || mode === 'add-to-project') && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {mode === 'add-to-project' && selectedProject
              ? `${i18n.tui.newTask}[${selectedProject.title}] `
              : i18n.tui.newTask}
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

      {/* Move to waiting input */}
      {mode === 'move-to-waiting' && taskToWaiting && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.waitingFor}
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
      {mode === 'select-project' && taskToLink && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.selectProject || 'Select project for'}: {taskToLink.title}
          </Text>
          <Box flexDirection="column" marginTop={1} borderStyle={theme.borders.list as BorderStyleType} borderColor={theme.colors.borderActive} paddingX={1}>
            {tasks.projects.map((project, index) => (
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

      {/* Search bar */}
      {mode === 'search' && (
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          onSubmit={handleInputSubmit}
        />
      )}

      {/* Delete confirmation */}
      {mode === 'confirm-delete' && taskToDelete && (
        <Box marginTop={1}>
          <Text color={theme.colors.accent} bold>
            {fmt(i18n.tui.deleteConfirm || 'Delete "{title}"? (y/n)', { title: taskToDelete.title })}
          </Text>
        </Box>
      )}

      {/* Message */}
      {message && mode === 'normal' && (
        <Box marginTop={1}>
          <Text color={theme.colors.textHighlight}>{message}</Text>
        </Box>
      )}

      {/* Footer / Function key bar */}
      <Box marginTop={1}>
        {(mode === 'task-detail' || mode === 'add-comment') ? (
          theme.style.showFunctionKeys ? (
            <FunctionKeyBar keys={[
              { key: 'i', label: i18n.tui.keyBar.comment },
              { key: 'd', label: i18n.tui.keyBar.delete },
              { key: 'P', label: i18n.tui.keyBar.project },
              { key: 'b', label: i18n.tui.keyBar.back },
            ]} />
          ) : (
            <Text color={theme.colors.textMuted}>{i18n.tui.taskDetailFooter}</Text>
          )
        ) : theme.style.showFunctionKeys ? (
          <FunctionKeyBar />
        ) : (
          <Text color={theme.colors.textMuted}>{i18n.tui.footer}</Text>
        )}
      </Box>
    </Box>
  );
}
