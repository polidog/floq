export const en = {
  // Status labels
  status: {
    inbox: 'Inbox',
    next: 'Next Actions',
    waiting: 'Waiting For',
    someday: 'Someday/Maybe',
    done: 'Done',
  },

  // Kanban mode labels
  kanban: {
    todo: 'TODO',
    doing: 'Doing',
    done: 'Done',
  },

  // Project status
  projectStatus: {
    active: 'Active Projects',
    someday: 'Someday Projects',
    completed: 'Completed Projects',
  },

  // Commands
  commands: {
    add: {
      success: 'Added task to Inbox: "{title}"',
      withProject: '  Project: {project}',
      projectNotFound: 'Project "{project}" not found.',
    },
    list: {
      invalidStatus: 'Invalid status: {status}',
      validStatuses: 'Valid statuses: {statuses}',
      noTasks: 'No tasks',
      noProjects: 'No active projects',
      tasks: '{count} tasks',
      activeDone: '{active} active, {done} done',
    },
    move: {
      success: 'Moved "{title}" to {status}',
      waitingFor: '  Waiting for: {person}',
      invalidStatus: 'Invalid status: {status}',
      validStatuses: 'Valid statuses: {statuses}',
      specifyWaiting: 'Please specify who you are waiting for: floq move <id> waiting "person"',
      notFound: 'Task not found: {id}',
      multipleMatch: 'Multiple tasks match "{id}". Please be more specific:',
    },
    done: {
      success: 'Completed: "{title}"',
      alreadyDone: 'Task "{title}" is already done.',
      notFound: 'Task not found: {id}',
      multipleMatch: 'Multiple tasks match "{id}". Please be more specific:',
    },
    project: {
      created: 'Created project: "{name}"',
      alreadyExists: 'Project "{name}" already exists.',
      notFound: 'Project not found: {id}',
      multipleMatch: 'Multiple projects match "{id}". Please be more specific.',
      completed: 'Completed project: "{name}"',
      noProjects: 'No projects',
      description: 'Description: {description}',
      statusLabel: 'Status: {status}',
      tasksCount: 'Tasks: {count}',
    },
    comment: {
      added: 'Comment added to "{title}"',
      notFound: 'Task not found: {id}',
      multipleMatch: 'Multiple tasks match "{id}". Please be more specific:',
      noComments: 'No comments',
      listHeader: 'Comments for "{title}":',
    },
  },

  // TUI
  tui: {
    title: 'Floq',
    helpHint: '?=Help',
    newTask: 'New task: ',
    placeholder: 'Enter task title...',
    inputHelp: '(Enter to save, Esc to cancel)',
    added: 'Added: "{title}"',
    completed: 'Completed: "{title}"',
    movedTo: 'Moved "{title}" to {status}',
    movedToWaiting: 'Moved "{title}" to Waiting (for {person})',
    waitingFor: 'Waiting for: ',
    refreshed: 'Refreshed',
    footer: 'a=add d=done n=next s=someday w=waiting i=inbox p=project P=link',
    noTasks: 'No tasks',
    // Tab labels
    tabInbox: 'Inbox',
    tabNext: 'Next',
    tabWaiting: 'Waiting',
    tabSomeday: 'Someday',
    tabProjects: 'Projects',
    // Project actions
    madeProject: 'Made project: "{title}"',
    linkedToProject: 'Linked "{title}" to {project}',
    selectProject: 'Select project for',
    selectProjectHelp: 'j/k: select, Enter: confirm, Esc: cancel',
    back: 'back',
    // Action key bar labels
    keyBar: {
      add: 'Add',
      done: 'Done',
      next: 'Next',
      someday: 'Someday',
      waiting: 'Waiting',
      inbox: 'Inbox',
      project: 'Project',
      help: 'Help',
      quit: 'Quit',
      comment: 'Comment',
      back: 'Back',
      delete: 'Delete',
    },
    // Help modal
    help: {
      title: 'Keyboard Shortcuts',
      navigation: 'Navigation',
      tabSwitch: 'Switch tab (5=Projects)',
      prevNextTab: 'Previous/Next tab',
      taskSelect: 'Select task',
      actions: 'Actions',
      addTask: 'Add new task',
      completeTask: 'Complete selected task',
      moveToNext: 'Move to Next Actions',
      moveToSomeday: 'Move to Someday/Maybe',
      moveToWaiting: 'Move to Waiting For',
      moveToInbox: 'Move to Inbox',
      refresh: 'Refresh list',
      projects: 'Projects',
      makeProject: 'Make task a project',
      linkToProject: 'Link task to project',
      openProject: 'Open project (on Projects tab)',
      backFromProject: 'Back from project detail',
      taskDetail: 'View task details',
      addComment: 'Add comment',
      other: 'Other',
      showHelp: 'Show this help',
      quit: 'Quit',
      closeHint: 'Press any key to close',
    },
    // Kanban mode help
    kanbanHelp: {
      title: 'Kanban Shortcuts',
      navigation: 'Navigation',
      columnSwitch: 'Switch column',
      columnDirect: 'Jump to column directly',
      taskSelect: 'Select task',
      actions: 'Actions',
      addTask: 'Add new task (to TODO)',
      completeTask: 'Move to Done',
      moveRight: 'Move task to next column',
      moveLeft: 'Move task to previous column',
      other: 'Other',
      showHelp: 'Show this help',
      quit: 'Quit',
      closeHint: 'Press any key to close',
    },
    addComment: 'New comment: ',
    noComments: 'No comments yet',
    commentHint: 'i: add comment',
    commentAdded: 'Comment added',
    commentDeleted: 'Comment deleted',
    taskDetailTitle: 'Task Details',
    taskDetailFooter: 'j/k=select i=comment d=delete b/Esc=back',
    comments: 'Comments',
  },
};

export type HelpTranslations = {
  title: string;
  navigation: string;
  tabSwitch: string;
  prevNextTab: string;
  taskSelect: string;
  actions: string;
  addTask: string;
  completeTask: string;
  moveToNext: string;
  moveToSomeday: string;
  moveToWaiting: string;
  moveToInbox: string;
  refresh: string;
  projects: string;
  makeProject: string;
  linkToProject: string;
  openProject: string;
  backFromProject: string;
  taskDetail: string;
  addComment: string;
  other: string;
  showHelp: string;
  quit: string;
  closeHint: string;
};

export type KanbanHelpTranslations = {
  title: string;
  navigation: string;
  columnSwitch: string;
  columnDirect: string;
  taskSelect: string;
  actions: string;
  addTask: string;
  completeTask: string;
  moveRight: string;
  moveLeft: string;
  other: string;
  showHelp: string;
  quit: string;
  closeHint: string;
};

export type KanbanTranslations = {
  todo: string;
  doing: string;
  done: string;
};

export type KeyBarTranslations = {
  add: string;
  done: string;
  next: string;
  someday: string;
  waiting: string;
  inbox: string;
  project: string;
  help: string;
  quit: string;
  comment: string;
  back: string;
  delete: string;
};

export type TuiTranslations = {
  title: string;
  helpHint: string;
  newTask: string;
  placeholder: string;
  inputHelp: string;
  added: string;
  completed: string;
  movedTo: string;
  movedToWaiting: string;
  waitingFor: string;
  refreshed: string;
  footer: string;
  noTasks: string;
  tabInbox: string;
  tabNext: string;
  tabWaiting: string;
  tabSomeday: string;
  tabProjects: string;
  madeProject: string;
  linkedToProject: string;
  selectProject: string;
  selectProjectHelp: string;
  back: string;
  keyBar: KeyBarTranslations;
  help: HelpTranslations;
  kanbanHelp: KanbanHelpTranslations;
  addComment: string;
  noComments: string;
  commentHint: string;
  commentAdded: string;
  commentDeleted: string;
  taskDetailTitle: string;
  taskDetailFooter: string;
  comments: string;
};

export type Translations = {
  status: Record<string, string>;
  kanban: KanbanTranslations;
  projectStatus: Record<string, string>;
  commands: {
    add: Record<string, string>;
    list: Record<string, string>;
    move: Record<string, string>;
    done: Record<string, string>;
    project: Record<string, string>;
    comment: Record<string, string>;
  };
  tui: TuiTranslations;
};
