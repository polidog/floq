import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and, gte } from 'drizzle-orm';
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
  DeleteTaskCommand,
  MoveTaskCommand,
  LinkTaskCommand,
  ConvertToProjectCommand,
  CreateCommentCommand,
  DeleteCommentCommand,
  SetContextCommand,
} from '../history/index.js';
import { SearchBar } from './SearchBar.js';
import { SearchResults } from './SearchResults.js';
import { HelpModal } from './HelpModal.js';
import { MarioBoxInline } from './MarioBox.js';

type TabType = 'inbox' | 'next' | 'waiting' | 'someday' | 'projects' | 'done';
type PaneFocus = 'tabs' | 'tasks';
type Mode = 'normal' | 'add' | 'add-to-project' | 'help' | 'project-detail' | 'select-project' | 'task-detail' | 'add-comment' | 'move-to-waiting' | 'confirm-delete' | 'context-filter' | 'set-context' | 'add-context' | 'search';

type SettingsMode = 'none' | 'theme-select' | 'mode-select' | 'lang-select';

interface GtdMarioProps {
  onOpenSettings?: (mode: SettingsMode) => void;
}

const TABS: TabType[] = ['inbox', 'next', 'waiting', 'someday', 'projects', 'done'];

function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE10 && code <= 0xFE1F) ||
      (code >= 0xFE30 && code <= 0xFE6F) ||
      (code >= 0xFF00 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFF)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function truncateString(str: string, maxWidth: number): string {
  if (getDisplayWidth(str) <= maxWidth) return str;

  let width = 0;
  let result = '';
  for (const char of str) {
    const charWidth = getDisplayWidth(char);
    if (width + charWidth + 2 > maxWidth) {
      return result + '…';
    }
    result += char;
    width += charWidth;
  }
  return result;
}

type TasksByTab = Record<TabType, Task[]>;
type ProjectProgress = { completed: number; total: number };

export function GtdMario({ onOpenSettings }: GtdMarioProps): React.ReactElement {
  const theme = useTheme();
  const { exit } = useApp();
  const { stdout } = useStdout();
  const history = useHistory();
  const i18n = t();

  const [mode, setMode] = useState<Mode>('normal');
  const [paneFocus, setPaneFocus] = useState<PaneFocus>('tabs');
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
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
  const [inputValue, setInputValue] = useState('');
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
  const [contextFilter, setContextFilter] = useState<string | null>(null);
  const [contextSelectIndex, setContextSelectIndex] = useState(0);
  const [availableContexts, setAvailableContexts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState(0);

  const terminalWidth = stdout?.columns || 80;
  const leftPaneWidth = 28;
  const rightPaneWidth = terminalWidth - leftPaneWidth - 6;

  const currentTab = TABS[currentTabIndex];
  const currentTasks = mode === 'project-detail' ? projectTasks : tasks[currentTab];

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

    const statusList = ['inbox', 'next', 'waiting', 'someday', 'done'] as const;
    for (const status of statusList) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const conditions = [
        eq(schema.tasks.status, status),
        eq(schema.tasks.isProject, false),
      ];

      if (status === 'done') {
        conditions.push(gte(schema.tasks.updatedAt, oneWeekAgo));
      }

      let allTasks = await db
        .select()
        .from(schema.tasks)
        .where(and(...conditions));

      if (contextFilter !== null) {
        if (contextFilter === '') {
          allTasks = allTasks.filter(t => !t.context);
        } else {
          allTasks = allTasks.filter(t => t.context === contextFilter);
        }
      }

      newTasks[status] = allTasks;
    }

    newTasks.projects = await db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.isProject, true),
        eq(schema.tasks.status, 'next')
      ));

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
    setAvailableContexts(getContexts());
  }, [contextFilter]);

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

  const getAllTasks = useCallback((): Task[] => {
    const allTasks: Task[] = [];
    for (const tab of TABS) {
      allTasks.push(...tasks[tab]);
    }
    return allTasks;
  }, [tasks]);

  const searchTasks = useCallback((query: string): Task[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const allTasks = getAllTasks();
    return allTasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  }, [getAllTasks]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const results = searchTasks(value);
    setSearchResults(results);
    setSearchResultIndex(0);
  }, [searchTasks]);

  const navigateToTask = useCallback((task: Task) => {
    const targetTab = task.isProject ? 'projects' : task.status as TabType;
    const tabIndex = TABS.indexOf(targetTab);
    const tabTasks = tasks[targetTab];
    const taskIndex = tabTasks.findIndex(t => t.id === task.id);

    if (tabIndex >= 0 && taskIndex >= 0) {
      setCurrentTabIndex(tabIndex);
      setSelectedTaskIndex(taskIndex);
      setPaneFocus('tasks');
      setMode('normal');
    }
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case 'inbox': return i18n.tui.tabInbox;
      case 'next': return i18n.tui.tabNext;
      case 'waiting': return i18n.tui.tabWaiting;
      case 'someday': return i18n.tui.tabSomeday;
      case 'projects': return i18n.tui.tabProjects || 'Projects';
      case 'done': return i18n.tui.tabDone || 'Done';
    }
  };

  const addTask = useCallback(async (title: string, parentId?: string, context?: string | null) => {
    if (!title.trim()) return;

    const now = new Date();
    const taskId = uuidv4();
    const command = new CreateTaskCommand({
      task: {
        id: taskId,
        title: title.trim(),
        status: parentId ? 'next' : 'inbox',
        parentId: parentId || null,
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

  const moveTaskToStatus = useCallback(async (task: Task, status: 'inbox' | 'next' | 'someday') => {
    const command = new MoveTaskCommand({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: status,
      fromWaitingFor: task.waitingFor,
      toWaitingFor: null,
      description: fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[status] }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.movedTo, { title: task.title, status: i18n.status[status] }));
    await loadTasks();
  }, [i18n.tui.movedTo, i18n.status, loadTasks, history]);

  const moveTaskToWaiting = useCallback(async (task: Task, waitingFor: string) => {
    const command = new MoveTaskCommand({
      taskId: task.id,
      fromStatus: task.status,
      toStatus: 'waiting',
      fromWaitingFor: task.waitingFor,
      toWaitingFor: waitingFor.trim(),
      description: fmt(i18n.tui.movedToWaiting, { title: task.title, person: waitingFor.trim() }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.movedToWaiting, { title: task.title, person: waitingFor.trim() }));
    await loadTasks();
  }, [i18n.tui.movedToWaiting, loadTasks, history]);

  const makeTaskProject = useCallback(async (task: Task) => {
    const command = new ConvertToProjectCommand({
      taskId: task.id,
      originalStatus: task.status,
      description: fmt(i18n.tui.madeProject || 'Made project: {title}', { title: task.title }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.madeProject || 'Made project: {title}', { title: task.title }));
    await loadTasks();
  }, [i18n.tui.madeProject, loadTasks, history]);

  const deleteTask = useCallback(async (task: Task) => {
    const command = new DeleteTaskCommand({
      task,
      description: fmt(i18n.tui.deleted || 'Deleted: "{title}"', { title: task.title }),
    });

    await history.execute(command);
    setMessage(fmt(i18n.tui.deleted || 'Deleted: "{title}"', { title: task.title }));
    await loadTasks();
  }, [i18n.tui.deleted, loadTasks, history]);

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
  }, [history, i18n.tui.commentAdded, loadTaskComments]);

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

  const handleInputSubmit = async (value: string) => {
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

    if (mode === 'add-comment' && selectedTask) {
      if (value.trim()) {
        await addCommentToTask(selectedTask, value);
      }
      setInputValue('');
      setMode('task-detail');
      return;
    }

    if (mode === 'move-to-waiting' && taskToWaiting) {
      if (value.trim()) {
        await moveTaskToWaiting(taskToWaiting, value);
      }
      setTaskToWaiting(null);
      setMode('normal');
      setInputValue('');
      return;
    }

    if (mode === 'add' || mode === 'add-to-project') {
      if (value.trim()) {
        if (mode === 'add-to-project' && selectedProject) {
          await addTask(value, selectedProject.id, contextFilter && contextFilter !== '' ? contextFilter : null);
          await loadProjectTasks(selectedProject.id);
          setMode('project-detail');
        } else {
          await addTask(value, undefined, contextFilter && contextFilter !== '' ? contextFilter : null);
          setMode('normal');
        }
      } else {
        setMode(mode === 'add-to-project' ? 'project-detail' : 'normal');
      }
      setInputValue('');
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
    if (mode === 'help') {
      return;
    }

    if (mode === 'add' || mode === 'add-to-project' || mode === 'add-comment' || mode === 'move-to-waiting' || mode === 'add-context') {
      if (key.escape) {
        setInputValue('');
        if (mode === 'add-to-project') {
          setMode('project-detail');
        } else if (mode === 'add-context') {
          setMode('set-context');
        } else if (mode === 'add-comment') {
          setMode('task-detail');
        } else {
          setMode('normal');
        }
      }
      return;
    }

    if (mode === 'task-detail') {
      if (key.escape || input === 'b' || input === 'h' || key.leftArrow) {
        setSelectedTask(null);
        setTaskComments([]);
        setSelectedCommentIndex(0);
        setMode('normal');
        return;
      }

      if (key.upArrow || input === 'k') {
        setSelectedCommentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, taskComments.length - 1)));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedCommentIndex((prev) => (prev < taskComments.length - 1 ? prev + 1 : 0));
        return;
      }

      if (input === 'c' || input === 'i') {
        setMode('add-comment');
        return;
      }

      if (input === 'D' && taskComments.length > 0) {
        const comment = taskComments[selectedCommentIndex];
        deleteComment(comment).then(() => {
          if (selectedCommentIndex >= taskComments.length - 1) {
            setSelectedCommentIndex(Math.max(0, selectedCommentIndex - 1));
          }
        });
        return;
      }

      if (input === 'P' && tasks.projects.length > 0) {
        setTaskToLink(selectedTask);
        setProjectSelectIndex(0);
        setMode('select-project');
        return;
      }

      return;
    }

    if (mode === 'search') {
      if (key.escape) {
        setSearchQuery('');
        setSearchResults([]);
        setSearchResultIndex(0);
        setMode('normal');
        return;
      }
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
      return;
    }

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
        setTaskToDelete(null);
        setMode('normal');
        return;
      }
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
        if (selected === 'all') setContextFilter(null);
        else if (selected === 'none') setContextFilter('');
        else setContextFilter(selected);
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }
      return;
    }

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
        setContextSelectIndex(0);
        setMode('normal');
        return;
      }
      return;
    }

    if (mode === 'select-project') {
      if (key.escape) {
        const wasFromTaskDetail = selectedTask !== null;
        setTaskToLink(null);
        setProjectSelectIndex(0);
        setMode(wasFromTaskDetail ? 'task-detail' : 'normal');
        return;
      }

      if (key.upArrow || input === 'k') {
        setProjectSelectIndex((prev) => (prev > 0 ? prev - 1 : tasks.projects.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setProjectSelectIndex((prev) => (prev < tasks.projects.length - 1 ? prev + 1 : 0));
        return;
      }

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

    if (mode === 'project-detail') {
      if (key.escape || key.backspace || input === 'b' || input === 'h' || key.leftArrow) {
        setMode('normal');
        setSelectedProject(null);
        setProjectTasks([]);
        setSelectedTaskIndex(0);
        setPaneFocus('tabs');
        return;
      }

      if (input === 'a') {
        setMode('add-to-project');
        return;
      }

      if (key.upArrow || input === 'k') {
        setSelectedTaskIndex((prev) => (prev > 0 ? prev - 1 : projectTasks.length - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedTaskIndex((prev) => (prev < projectTasks.length - 1 ? prev + 1 : 0));
        return;
      }

      if (input === 'd' && projectTasks.length > 0) {
        const task = projectTasks[selectedTaskIndex];
        markTaskDone(task).then(() => {
          if (selectedProject) loadProjectTasks(selectedProject.id);
        });
        return;
      }

      return;
    }

    if (message) setMessage(null);

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (input === '?') {
      setMode('help');
      return;
    }

    if (input === 'a') {
      setMode('add');
      return;
    }

    if (input === '@') {
      setContextSelectIndex(0);
      setMode('context-filter');
      return;
    }

    if (input === '/') {
      setMode('search');
      return;
    }

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

    if (input >= '1' && input <= '6') {
      const idx = parseInt(input) - 1;
      setCurrentTabIndex(idx);
      setSelectedTaskIndex(0);
      setPaneFocus('tabs');
      return;
    }

    if (paneFocus === 'tabs') {
      if (key.upArrow || input === 'k') {
        setCurrentTabIndex((prev) => (prev > 0 ? prev - 1 : TABS.length - 1));
        setSelectedTaskIndex(0);
        return;
      }
      if (key.downArrow || input === 'j') {
        setCurrentTabIndex((prev) => (prev < TABS.length - 1 ? prev + 1 : 0));
        setSelectedTaskIndex(0);
        return;
      }
      if (key.rightArrow || input === 'l' || key.return) {
        if (currentTab === 'projects' && currentTasks.length > 0) {
          const project = currentTasks[selectedTaskIndex];
          setSelectedProject(project);
          loadProjectTasks(project.id);
          setMode('project-detail');
          setSelectedTaskIndex(0);
        } else if (currentTasks.length > 0) {
          setPaneFocus('tasks');
        }
        return;
      }
    }

    if (paneFocus === 'tasks') {
      if (key.escape || key.leftArrow || input === 'h') {
        setPaneFocus('tabs');
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

      if (key.return && currentTab !== 'projects' && currentTasks.length > 0) {
        const task = currentTasks[selectedTaskIndex];
        setSelectedTask(task);
        loadTaskComments(task.id);
        setMode('task-detail');
        return;
      }

      if (currentTasks.length > 0) {
        const task = currentTasks[selectedTaskIndex];

        if (input === 'd' && currentTab !== 'done') {
          markTaskDone(task).then(() => {
            if (selectedTaskIndex >= currentTasks.length - 1) {
              setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
            }
          });
          return;
        }

        if (input === 'n' && currentTab !== 'next' && currentTab !== 'projects' && currentTab !== 'done') {
          moveTaskToStatus(task, 'next').then(() => {
            if (selectedTaskIndex >= currentTasks.length - 1) {
              setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
            }
          });
          return;
        }

        if (input === 's' && currentTab !== 'someday' && currentTab !== 'projects' && currentTab !== 'done') {
          moveTaskToStatus(task, 'someday').then(() => {
            if (selectedTaskIndex >= currentTasks.length - 1) {
              setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
            }
          });
          return;
        }

        if (input === 'w' && currentTab !== 'waiting' && currentTab !== 'projects' && currentTab !== 'done') {
          setTaskToWaiting(task);
          setMode('move-to-waiting');
          return;
        }

        if (input === 'i' && currentTab !== 'inbox' && currentTab !== 'projects' && currentTab !== 'done') {
          moveTaskToStatus(task, 'inbox').then(() => {
            if (selectedTaskIndex >= currentTasks.length - 1) {
              setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
            }
          });
          return;
        }

        if (input === 'p' && currentTab !== 'projects' && currentTab !== 'done') {
          makeTaskProject(task).then(() => {
            if (selectedTaskIndex >= currentTasks.length - 1) {
              setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
            }
          });
          return;
        }

        if (input === 'P' && currentTab !== 'projects' && currentTab !== 'done' && tasks.projects.length > 0) {
          setTaskToLink(task);
          setProjectSelectIndex(0);
          setMode('select-project');
          return;
        }

        if (input === 'D' && currentTab !== 'projects') {
          setTaskToDelete(task);
          setMode('confirm-delete');
          return;
        }
      }

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

    if (input === 'r' && !key.ctrl) {
      loadTasks();
      setMessage(i18n.tui.refreshed);
      return;
    }
  });

  const tursoEnabled = isTursoEnabled();

  const getParentProject = (parentId: string | null): Task | undefined => {
    if (!parentId) return undefined;
    return tasks.projects.find(p => p.id === parentId);
  };

  if (mode === 'help') {
    return (
      <Box flexDirection="column" padding={1}>
        <HelpModal onClose={() => setMode('normal')} />
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
          <Text color={theme.colors.text}>{(tasks.inbox.length + tasks.next.length + tasks.waiting.length + tasks.someday.length + tasks.projects.length).toString().padStart(2, '0')}</Text>
          <Text color={theme.colors.textMuted}> FLOQ v{VERSION}</Text>
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
      ) : mode === 'select-project' && taskToLink ? (
        <Box flexDirection="column">
          <Text color={theme.colors.secondary} bold>
            {i18n.tui.selectProject || 'Select project'}: {taskToLink.title}
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {tasks.projects.map((project, index) => (
              <Text
                key={project.id}
                color={index === projectSelectIndex ? theme.colors.textSelected : theme.colors.text}
                bold={index === projectSelectIndex}
              >
                {index === projectSelectIndex ? '🍄 ' : '   '}{project.title}
              </Text>
            ))}
          </Box>
        </Box>
      ) : mode === 'confirm-delete' && taskToDelete ? (
        <Box flexDirection="column">
          <Text color={theme.colors.accent} bold>
            {fmt(i18n.tui.deleteConfirm || 'Delete "{title}"? (y/n)', { title: taskToDelete.title })}
          </Text>
        </Box>
      ) : (mode === 'task-detail' || mode === 'add-comment') && selectedTask ? (
        <Box flexDirection="column">
          <MarioBoxInline
            title={i18n.tui.taskDetailTitle || 'Task Details'}
            width={terminalWidth - 4}
            minHeight={4}
            isActive={true}
          >
            <Text color={theme.colors.text} bold>{selectedTask.title}</Text>
            {selectedTask.description && (
              <Text color={theme.colors.textMuted}>{selectedTask.description}</Text>
            )}
            <Box>
              <Text color={theme.colors.secondary} bold>{i18n.tui.taskDetailStatus || 'Status'}: </Text>
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
          </MarioBoxInline>

          <Box marginTop={1}>
            <MarioBoxInline
              title={`${i18n.tui.comments || 'Comments'} (${taskComments.length})`}
              width={terminalWidth - 4}
              minHeight={5}
              isActive={mode === 'task-detail'}
            >
              {taskComments.length === 0 ? (
                <Text color={theme.colors.textMuted} italic>
                  {i18n.tui.noComments || 'No comments yet'}
                </Text>
              ) : (
                taskComments.map((comment, index) => {
                  const isSelected = index === selectedCommentIndex && mode === 'task-detail';
                  return (
                    <Box key={comment.id} flexDirection="column" marginBottom={1}>
                      <Text color={theme.colors.textMuted}>
                        {isSelected ? '🍄 ' : '   '}[{comment.createdAt.toLocaleString()}]
                      </Text>
                      <Text color={isSelected ? theme.colors.textSelected : theme.colors.text} bold={isSelected}>
                        {'   '}{comment.content}
                      </Text>
                    </Box>
                  );
                })
              )}
            </MarioBoxInline>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="row">
          {/* Left pane: Tabs */}
          <Box marginRight={2}>
            <MarioBoxInline
              title={mode === 'project-detail' && selectedProject ? selectedProject.title : 'STAGE'}
              width={leftPaneWidth}
              minHeight={8}
              isActive={paneFocus === 'tabs' && mode !== 'project-detail'}
            >
              {mode === 'project-detail' ? (
                <Text color={theme.colors.textMuted}>← Esc/b: back</Text>
              ) : (
                TABS.map((tab, index) => {
                  const isSelected = index === currentTabIndex;
                  const count = tasks[tab].length;
                  return (
                    <Text
                      key={tab}
                      color={isSelected && paneFocus === 'tabs' ? theme.colors.textSelected : theme.colors.text}
                      bold={isSelected}
                    >
                      {isSelected ? '🍄 ' : '   '}{index + 1}:{getTabLabel(tab)} ({count})
                    </Text>
                  );
                })
              )}
            </MarioBoxInline>
          </Box>

          {/* Right pane: Tasks */}
          <Box flexGrow={1}>
            <MarioBoxInline
              title={mode === 'project-detail' ? (i18n.tui.projectTasks || 'Tasks') : getTabLabel(currentTab)}
              width={rightPaneWidth}
              minHeight={12}
              isActive={paneFocus === 'tasks' || mode === 'project-detail'}
            >
              {currentTasks.length === 0 ? (
                <Text color={theme.colors.textMuted} italic>
                  {i18n.tui.noTasks}
                </Text>
              ) : (
                currentTasks.map((task, index) => {
                  const isSelected = (paneFocus === 'tasks' || mode === 'project-detail') && index === selectedTaskIndex;
                  const parentProject = getParentProject(task.parentId);
                  const progress = currentTab === 'projects' ? projectProgress[task.id] : undefined;

                  const prefix = isSelected ? '🍄 ' : '   ';
                  const suffix = [
                    task.waitingFor ? ` (${task.waitingFor})` : '',
                    task.context ? ` @${task.context}` : '',
                    parentProject ? ` [${parentProject.title}]` : '',
                    progress ? ` [${progress.completed}/${progress.total}]` : '',
                  ].join('');
                  const availableWidth = rightPaneWidth - 6 - getDisplayWidth(prefix) - getDisplayWidth(suffix);
                  const displayTitle = truncateString(task.title, availableWidth);

                  return (
                    <Text
                      key={task.id}
                      color={isSelected ? theme.colors.textSelected : theme.colors.text}
                      bold={isSelected}
                    >
                      {prefix}{displayTitle}
                      {task.waitingFor && <Text color={theme.colors.muted}> ({task.waitingFor})</Text>}
                      {task.context && <Text color={theme.colors.muted}> @{task.context}</Text>}
                      {parentProject && <Text color={theme.colors.muted}> [{parentProject.title}]</Text>}
                      {progress && <Text color={theme.colors.muted}> [{progress.completed}/{progress.total}]</Text>}
                    </Text>
                  );
                })
              )}
            </MarioBoxInline>
          </Box>
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
        </Box>
      )}

      {/* Move to waiting input */}
      {mode === 'move-to-waiting' && taskToWaiting && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>{i18n.tui.waitingFor}</Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder=""
          />
        </Box>
      )}

      {/* Add context input */}
      {mode === 'add-context' && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>New context: </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder="Enter context name..."
          />
        </Box>
      )}

      {/* Add comment input */}
      {mode === 'add-comment' && selectedTask && (
        <Box marginTop={1}>
          <Text color={theme.colors.secondary} bold>{i18n.tui.addComment || 'Add comment'}: </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleInputSubmit}
            placeholder="Enter comment..."
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
        />
      )}

      {/* Message */}
      {message && mode === 'normal' && (
        <Box marginTop={1}>
          <Text color={theme.colors.textHighlight}>{message}</Text>
        </Box>
      )}

      {/* Footer - Mario style */}
      <Box marginTop={1}>
        <Text color={theme.colors.textMuted}>
          {mode === 'task-detail'
            ? 'j/k=select c/i=add comment P=link D=delete comment Esc/b=back'
            : mode === 'project-detail'
              ? 'j/k=select a=add d=done Esc/b=back /=search'
              : paneFocus === 'tabs'
                ? 'j/k=select l/Enter=tasks 1-6=tab a=add @=filter /=search'
                : 'j/k=select Enter=detail h/Esc=back d=done n=next s=someday w=wait i=inbox p=project P=link D=delete u=undo /=search'}
        </Text>
      </Box>
    </Box>
  );
}
