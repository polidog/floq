import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { TaskItem } from './components/TaskItem.js';
import { HelpModal } from './components/HelpModal.js';
import { FunctionKeyBar } from './components/FunctionKeyBar.js';
import { SplashScreen } from './SplashScreen.js';
import { getDb, schema } from '../db/index.js';
import { t, fmt } from '../i18n/index.js';
import { ThemeProvider, useTheme } from './theme/index.js';
import { getThemeName, isTursoEnabled, getTursoConfig } from '../config.js';
import { VERSION } from '../version.js';
import type { Task, Comment } from '../db/schema.js';
import type { BorderStyleType } from './theme/types.js';

type TabType = 'inbox' | 'next' | 'waiting' | 'someday' | 'projects';
const TABS: TabType[] = ['inbox', 'next', 'waiting', 'someday', 'projects'];

type TasksByTab = Record<TabType, Task[]>;
type Mode = 'splash' | 'normal' | 'add' | 'add-to-project' | 'help' | 'project-detail' | 'select-project' | 'task-detail' | 'add-comment';

export function App(): React.ReactElement {
  const themeName = getThemeName();

  return (
    <ThemeProvider themeName={themeName}>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent(): React.ReactElement {
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
  });
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Task | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [taskToLink, setTaskToLink] = useState<Task | null>(null);
  const [projectSelectIndex, setProjectSelectIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<Comment[]>([]);

  const i18n = t();

  const loadTasks = useCallback(async () => {
    const db = getDb();
    const newTasks: TasksByTab = {
      inbox: [],
      next: [],
      waiting: [],
      someday: [],
      projects: [],
    };

    // Load all tasks (including project children) by status
    const statusList = ['inbox', 'next', 'waiting', 'someday'] as const;
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

  const handleInputSubmit = async (value: string) => {
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

  const makeTaskProject = useCallback(async (task: Task) => {
    const db = getDb();
    await db.update(schema.tasks)
      .set({ isProject: true, status: 'next', updatedAt: new Date() })
      .where(eq(schema.tasks.id, task.id));
    setMessage(fmt(i18n.tui.madeProject || 'Made project: {title}', { title: task.title }));
    await loadTasks();
  }, [i18n.tui.madeProject, loadTasks]);

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
    }
  };

  useInput((input, key) => {
    // Skip splash screen on any key
    if (mode === 'splash') {
      setMode('normal');
      return;
    }

    // Handle help mode - any key closes
    if (mode === 'help') {
      setMode('normal');
      return;
    }

    // Handle add mode
    if (mode === 'add' || mode === 'add-to-project' || mode === 'add-comment') {
      if (key.escape) {
        setInputValue('');
        if (mode === 'add-comment') {
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
        setMode('normal');
        setSelectedTask(null);
        setTaskComments([]);
        return;
      }

      // Add comment
      if (input === 'i') {
        setMode('add-comment');
        return;
      }
      return;
    }

    // Handle select-project mode
    if (mode === 'select-project') {
      if (key.escape) {
        setTaskToLink(null);
        setProjectSelectIndex(0);
        setMode('normal');
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
        linkTaskToProject(taskToLink, project);
        setTaskToLink(null);
        setProjectSelectIndex(0);
        setMode('normal');
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
    if (input === 'p' && currentTasks.length > 0 && currentTab !== 'projects') {
      const task = currentTasks[selectedTaskIndex];
      makeTaskProject(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Link to project (P key - shift+p)
    if (input === 'P' && currentTasks.length > 0 && currentTab !== 'projects' && tasks.projects.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      setTaskToLink(task);
      setProjectSelectIndex(0);
      setMode('select-project');
      return;
    }

    // Mark as done
    if (input === 'd' && currentTasks.length > 0) {
      const task = currentTasks[selectedTaskIndex];
      markTaskDone(task).then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Move to next actions
    if (input === 'n' && currentTasks.length > 0 && currentTab !== 'next' && currentTab !== 'projects') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'next').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Move to someday
    if (input === 's' && currentTasks.length > 0 && currentTab !== 'someday' && currentTab !== 'projects') {
      const task = currentTasks[selectedTaskIndex];
      moveTaskToStatus(task, 'someday').then(() => {
        if (selectedTaskIndex >= currentTasks.length - 1) {
          setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
        }
      });
      return;
    }

    // Move to inbox
    if (input === 'i' && currentTasks.length > 0 && currentTab !== 'inbox' && currentTab !== 'projects') {
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
  });

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
        <Box marginBottom={1}>
          <Text color={theme.colors.accent} bold>
            {theme.name === 'modern' ? '📁 ' : '>> '}{selectedProject.title}
          </Text>
          <Text color={theme.colors.textMuted}> (Esc/b: {i18n.tui.back || 'back'})</Text>
        </Box>
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
            <Text color={theme.colors.textMuted}>
              {i18n.status[selectedTask.status]}
              {selectedTask.waitingFor && ` - ${selectedTask.waitingFor}`}
            </Text>
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
              taskComments.map((comment) => (
                <Box key={comment.id} flexDirection="column" marginBottom={1}>
                  <Text color={theme.colors.textMuted}>
                    [{comment.createdAt.toLocaleString()}]
                  </Text>
                  <Text color={theme.colors.text}>{comment.content}</Text>
                </Box>
              ))
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

      {/* Task list */}
      {mode !== 'task-detail' && mode !== 'add-comment' && (
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
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={index === selectedTaskIndex}
                  projectName={parentProject?.title}
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

      {/* Message */}
      {message && mode === 'normal' && (
        <Box marginTop={1}>
          <Text color={theme.colors.textHighlight}>{message}</Text>
        </Box>
      )}

      {/* Footer / Function key bar */}
      <Box marginTop={1}>
        {(mode === 'task-detail' || mode === 'add-comment') ? (
          <Text color={theme.colors.textMuted}>{i18n.tui.taskDetailFooter || 'i=comment b/Esc=back'}</Text>
        ) : theme.style.showFunctionKeys ? (
          <FunctionKeyBar />
        ) : (
          <Text color={theme.colors.textMuted}>{i18n.tui.footer}</Text>
        )}
      </Box>
    </Box>
  );
}
