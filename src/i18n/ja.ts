import type { Translations } from './en.js';

export const ja: Translations = {
  // Status labels
  status: {
    inbox: 'Inbox',
    next: '次のアクション',
    waiting: '連絡待ち',
    someday: 'いつかやる',
    done: '完了',
  },

  // Project status
  projectStatus: {
    active: 'アクティブなプロジェクト',
    someday: 'いつかやるプロジェクト',
    completed: '完了したプロジェクト',
  },

  // Commands
  commands: {
    add: {
      success: 'Inboxに追加しました: 「{title}」',
      withProject: '  プロジェクト: {project}',
      projectNotFound: 'プロジェクト「{project}」が見つかりません。',
    },
    list: {
      invalidStatus: '無効なステータス: {status}',
      validStatuses: '有効なステータス: {statuses}',
      noTasks: 'タスクなし',
      noProjects: 'アクティブなプロジェクトなし',
      tasks: '{count}件のタスク',
      activeDone: '{active}件アクティブ, {done}件完了',
    },
    move: {
      success: '「{title}」を{status}に移動しました',
      waitingFor: '  待機中: {person}',
      invalidStatus: '無効なステータス: {status}',
      validStatuses: '有効なステータス: {statuses}',
      specifyWaiting: '待機相手を指定してください: floq move <id> waiting "担当者"',
      notFound: 'タスクが見つかりません: {id}',
      multipleMatch: '「{id}」に一致するタスクが複数あります。より具体的に指定してください:',
    },
    done: {
      success: '完了しました: 「{title}」',
      alreadyDone: 'タスク「{title}」は既に完了しています。',
      notFound: 'タスクが見つかりません: {id}',
      multipleMatch: '「{id}」に一致するタスクが複数あります。より具体的に指定してください:',
    },
    project: {
      created: 'プロジェクトを作成しました: 「{name}」',
      alreadyExists: 'プロジェクト「{name}」は既に存在します。',
      notFound: 'プロジェクトが見つかりません: {id}',
      multipleMatch: '「{id}」に一致するプロジェクトが複数あります。より具体的に指定してください。',
      completed: 'プロジェクトを完了しました: 「{name}」',
      noProjects: 'プロジェクトなし',
      description: '説明: {description}',
      statusLabel: 'ステータス: {status}',
      tasksCount: 'タスク: {count}件',
    },
  },

  // TUI
  tui: {
    title: 'Floq',
    helpHint: '?=ヘルプ',
    newTask: '新規タスク: ',
    placeholder: 'タスク名を入力...',
    inputHelp: '(Enterで保存, Escでキャンセル)',
    added: '追加しました: 「{title}」',
    completed: '完了しました: 「{title}」',
    movedTo: '「{title}」を{status}に移動しました',
    refreshed: '更新しました',
    footer: 'a=追加 d=完了 n=次 s=いつか i=Inbox p=プロジェクト化 P=紐づけ',
    noTasks: 'タスクなし',
    // Tab labels
    tabInbox: 'Inbox',
    tabNext: '次',
    tabWaiting: '待ち',
    tabSomeday: 'いつか',
    tabProjects: 'プロジェクト',
    // Project actions
    madeProject: 'プロジェクト化しました: 「{title}」',
    linkedToProject: '「{title}」を{project}に紐づけました',
    selectProject: 'プロジェクトを選択',
    selectProjectHelp: 'j/k: 選択, Enter: 確定, Esc: キャンセル',
    back: '戻る',
    // Action key bar labels
    keyBar: {
      add: '追加',
      done: '完了',
      next: '次へ',
      someday: 'いつか',
      inbox: 'Inbox',
      project: 'プロジェクト',
      help: 'ヘルプ',
      quit: '終了',
    },
    // Help modal
    help: {
      title: 'キーボードショートカット',
      navigation: 'ナビゲーション',
      tabSwitch: 'タブ切替 (5=プロジェクト)',
      prevNextTab: '前後のタブ',
      taskSelect: 'タスク選択',
      actions: 'アクション',
      addTask: '新規タスク追加',
      completeTask: '選択タスクを完了',
      moveToNext: '次のアクションへ移動',
      moveToSomeday: 'いつかやるへ移動',
      moveToInbox: 'Inboxへ移動',
      refresh: 'リスト更新',
      projects: 'プロジェクト',
      makeProject: 'タスクをプロジェクト化',
      linkToProject: 'タスクをプロジェクトに紐づけ',
      openProject: 'プロジェクトを開く (Projectsタブ)',
      backFromProject: 'プロジェクト詳細から戻る',
      other: 'その他',
      showHelp: 'このヘルプを表示',
      quit: '終了',
      closeHint: '任意のキーで閉じる',
    },
  },
};
