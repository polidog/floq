import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { themes, VALID_THEMES } from './theme/themes.js';
import type { ThemeName } from './theme/types.js';
import { saveConfig, type Locale, type ViewMode, type TursoConfig } from '../config.js';
import { t } from '../i18n/index.js';

type WizardStep = 'welcome' | 'language' | 'theme' | 'viewMode' | 'database' | 'turso-url' | 'turso-token' | 'complete';

interface WizardState {
  locale: Locale;
  theme: ThemeName;
  viewMode: ViewMode;
  useTurso: boolean;
  tursoUrl: string;
  tursoToken: string;
}

const LOCALES: { value: Locale; label: string; desc: string }[] = [
  { value: 'en', label: 'English', desc: 'English language' },
  { value: 'ja', label: '日本語', desc: 'Japanese language' },
];

const VIEW_MODES: { value: ViewMode; labelKey: 'gtd' | 'kanban'; descKey: 'gtdDesc' | 'kanbanDesc' }[] = [
  { value: 'gtd', labelKey: 'gtd', descKey: 'gtdDesc' },
  { value: 'kanban', labelKey: 'kanban', descKey: 'kanbanDesc' },
];

const DB_OPTIONS = [
  { value: 'local', labelKey: 'local' as const, descKey: 'localDesc' as const },
  { value: 'turso', labelKey: 'turso' as const, descKey: 'tursoDesc' as const },
];

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = useState<WizardStep>('welcome');
  const [state, setState] = useState<WizardState>({
    locale: 'en',
    theme: 'modern',
    viewMode: 'gtd',
    useTurso: false,
    tursoUrl: '',
    tursoToken: '',
  });

  // Selection indexes for various steps
  const [languageIndex, setLanguageIndex] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [viewModeIndex, setViewModeIndex] = useState(0);
  const [dbIndex, setDbIndex] = useState(0);

  // Input values for Turso
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Get translations - use selected locale for setup wizard
  const [i18n, setI18n] = useState(t());

  // Update translations when locale changes
  useEffect(() => {
    // Re-get translations when state.locale changes
    // We need to temporarily set the config locale to get correct translations
    const translations = t();
    setI18n(translations);
  }, []);

  // Get setup translations based on selected locale
  const getSetupI18n = () => {
    // Use dynamic import to get correct language translations
    if (state.locale === 'ja') {
      return {
        welcome: {
          title: 'Floqへようこそ!',
          subtitle: 'タスクマネージャーを設定しましょう',
          instruction: '任意のキーを押して設定を開始...',
        },
        language: {
          title: '言語を選択',
          hint: 'j/k: 選択, Enter: 確定, Esc: 戻る',
        },
        theme: {
          title: 'テーマを選択',
          hint: 'j/k: 選択, Enter: 確定, Esc: 戻る',
        },
        viewMode: {
          title: '表示モードを選択',
          hint: 'j/k: 選択, Enter: 確定, Esc: 戻る',
          gtd: 'GTD (Getting Things Done)',
          gtdDesc: 'Inbox、次のアクション、連絡待ち、いつかやるリストによるクラシックGTDワークフロー',
          kanban: 'Kanbanボード',
          kanbanDesc: '3カラムのKanbanボード表示',
        },
        database: {
          title: 'データベースモードを選択',
          local: 'ローカル',
          localDesc: 'このデバイスにデータをローカル保存',
          turso: 'Turso Cloud',
          tursoDesc: 'Turso経由でデバイス間でデータを同期',
          hint: 'j/k: 選択, Enter: 確定, Esc: 戻る',
        },
        turso: {
          urlPrompt: 'TursoデータベースURL',
          urlPlaceholder: 'libsql://your-db.turso.io',
          urlError: 'URLはlibsql://で始まる必要があります',
          tokenPrompt: 'Turso認証トークン',
          tokenError: 'トークンは空にできません',
          inputHint: 'Enter: 確定, Esc: 戻る',
        },
        complete: {
          title: '設定完了!',
          summary: '設定内容:',
          language: '言語',
          theme: 'テーマ',
          viewMode: '表示モード',
          database: 'データベース',
          confirm: 'Enterを押してFloqを開始...',
        },
      };
    }
    return i18n.setup;
  };

  const setupI18n = getSetupI18n();

  const handleSave = () => {
    const tursoConfig: TursoConfig | undefined = state.useTurso
      ? { url: state.tursoUrl, authToken: state.tursoToken }
      : undefined;

    saveConfig({
      locale: state.locale,
      theme: state.theme,
      viewMode: state.viewMode,
      turso: tursoConfig,
    });

    onComplete();
  };

  const goToPrevStep = () => {
    switch (step) {
      case 'welcome':
        exit();
        break;
      case 'language':
        setStep('welcome');
        break;
      case 'theme':
        setStep('language');
        break;
      case 'viewMode':
        setStep('theme');
        break;
      case 'database':
        setStep('viewMode');
        break;
      case 'turso-url':
        setStep('database');
        setInputValue('');
        setInputError(null);
        break;
      case 'turso-token':
        setStep('turso-url');
        setInputValue(state.tursoUrl);
        setInputError(null);
        break;
      case 'complete':
        setStep('database');
        break;
    }
  };

  useInput((input, key) => {
    // Welcome step - any key continues
    if (step === 'welcome') {
      if (key.escape) {
        exit();
      } else {
        setStep('language');
      }
      return;
    }

    // Input steps (turso-url and turso-token)
    if (step === 'turso-url' || step === 'turso-token') {
      if (key.escape) {
        goToPrevStep();
      }
      return;
    }

    // Complete step - Enter saves
    if (step === 'complete') {
      if (key.return) {
        handleSave();
      } else if (key.escape) {
        goToPrevStep();
      }
      return;
    }

    // Selection steps
    if (key.escape) {
      goToPrevStep();
      return;
    }

    // j/k or arrow navigation
    if (input === 'j' || key.downArrow) {
      switch (step) {
        case 'language':
          setLanguageIndex((prev) => (prev < LOCALES.length - 1 ? prev + 1 : 0));
          break;
        case 'theme':
          setThemeIndex((prev) => (prev < VALID_THEMES.length - 1 ? prev + 1 : 0));
          break;
        case 'viewMode':
          setViewModeIndex((prev) => (prev < VIEW_MODES.length - 1 ? prev + 1 : 0));
          break;
        case 'database':
          setDbIndex((prev) => (prev < DB_OPTIONS.length - 1 ? prev + 1 : 0));
          break;
      }
      return;
    }

    if (input === 'k' || key.upArrow) {
      switch (step) {
        case 'language':
          setLanguageIndex((prev) => (prev > 0 ? prev - 1 : LOCALES.length - 1));
          break;
        case 'theme':
          setThemeIndex((prev) => (prev > 0 ? prev - 1 : VALID_THEMES.length - 1));
          break;
        case 'viewMode':
          setViewModeIndex((prev) => (prev > 0 ? prev - 1 : VIEW_MODES.length - 1));
          break;
        case 'database':
          setDbIndex((prev) => (prev > 0 ? prev - 1 : DB_OPTIONS.length - 1));
          break;
      }
      return;
    }

    // Enter to confirm selection
    if (key.return) {
      switch (step) {
        case 'language':
          setState((prev) => ({ ...prev, locale: LOCALES[languageIndex].value }));
          setStep('theme');
          break;
        case 'theme':
          setState((prev) => ({ ...prev, theme: VALID_THEMES[themeIndex] }));
          setStep('viewMode');
          break;
        case 'viewMode':
          setState((prev) => ({ ...prev, viewMode: VIEW_MODES[viewModeIndex].value }));
          setStep('database');
          break;
        case 'database':
          const useTurso = DB_OPTIONS[dbIndex].value === 'turso';
          setState((prev) => ({ ...prev, useTurso }));
          if (useTurso) {
            setStep('turso-url');
          } else {
            setStep('complete');
          }
          break;
      }
    }
  });

  const handleTursoUrlSubmit = (value: string) => {
    if (!value.startsWith('libsql://')) {
      setInputError(setupI18n.turso.urlError);
      return;
    }
    setState((prev) => ({ ...prev, tursoUrl: value }));
    setInputValue('');
    setInputError(null);
    setStep('turso-token');
  };

  const handleTursoTokenSubmit = (value: string) => {
    if (!value.trim()) {
      setInputError(setupI18n.turso.tokenError);
      return;
    }
    setState((prev) => ({ ...prev, tursoToken: value.trim() }));
    setInputValue('');
    setInputError(null);
    setStep('complete');
  };

  // Render Welcome step
  if (step === 'welcome') {
    return (
      <Box flexDirection="column" padding={1} alignItems="center">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {`
  ███████╗██╗      ██████╗  ██████╗
  ██╔════╝██║     ██╔═══██╗██╔═══██╗
  █████╗  ██║     ██║   ██║██║   ██║
  ██╔══╝  ██║     ██║   ██║██║▄▄ ██║
  ██║     ███████╗╚██████╔╝╚██████╔╝
  ╚═╝     ╚══════╝ ╚═════╝  ╚══▀▀═╝
            `}
          </Text>
        </Box>
        <Text bold color="green">{setupI18n.welcome.title}</Text>
        <Text color="white">{setupI18n.welcome.subtitle}</Text>
        <Box marginTop={2}>
          <Text dimColor>{setupI18n.welcome.instruction}</Text>
        </Box>
      </Box>
    );
  }

  // Render Language selection
  if (step === 'language') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.language.title}</Text>
        <Text dimColor>{setupI18n.language.hint}</Text>
        <Box flexDirection="column" marginTop={1}>
          {LOCALES.map((locale, index) => {
            const isSelected = index === languageIndex;
            return (
              <Box key={locale.value} flexDirection="column" marginBottom={1}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {locale.label}
                </Text>
                <Text dimColor>    {locale.desc}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Render Theme selection
  if (step === 'theme') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.theme.title}</Text>
        <Text dimColor>{setupI18n.theme.hint}</Text>
        <Box flexDirection="column" marginTop={1}>
          {VALID_THEMES.map((themeName, index) => {
            const theme = themes[themeName];
            const isSelected = index === themeIndex;
            return (
              <Box key={themeName}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {theme.displayName}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Render View Mode selection
  if (step === 'viewMode') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.viewMode.title}</Text>
        <Text dimColor>{setupI18n.viewMode.hint}</Text>
        <Box flexDirection="column" marginTop={1}>
          {VIEW_MODES.map((mode, index) => {
            const isSelected = index === viewModeIndex;
            return (
              <Box key={mode.value} flexDirection="column" marginBottom={1}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {setupI18n.viewMode[mode.labelKey]}
                </Text>
                <Text dimColor>    {setupI18n.viewMode[mode.descKey]}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Render Database selection
  if (step === 'database') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.database.title}</Text>
        <Text dimColor>{setupI18n.database.hint}</Text>
        <Box flexDirection="column" marginTop={1}>
          {DB_OPTIONS.map((option, index) => {
            const isSelected = index === dbIndex;
            return (
              <Box key={option.value} flexDirection="column" marginBottom={1}>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {setupI18n.database[option.labelKey]}
                </Text>
                <Text dimColor>    {setupI18n.database[option.descKey]}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Render Turso URL input
  if (step === 'turso-url') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.turso.urlPrompt}</Text>
        <Text dimColor>{setupI18n.turso.inputHint}</Text>
        <Box marginTop={1}>
          <Text>› </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleTursoUrlSubmit}
            placeholder={setupI18n.turso.urlPlaceholder}
          />
        </Box>
        {inputError && (
          <Box marginTop={1}>
            <Text color="red">{inputError}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render Turso Token input
  if (step === 'turso-token') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{setupI18n.turso.tokenPrompt}</Text>
        <Text dimColor>{setupI18n.turso.inputHint}</Text>
        <Box marginTop={1}>
          <Text>› </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleTursoTokenSubmit}
            placeholder=""
          />
        </Box>
        {inputError && (
          <Box marginTop={1}>
            <Text color="red">{inputError}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render Complete step
  if (step === 'complete') {
    const selectedTheme = themes[state.theme];
    const dbLabel = state.useTurso
      ? `Turso (${state.tursoUrl})`
      : setupI18n.database.local;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">{setupI18n.complete.title}</Text>
        <Box marginTop={1} marginBottom={1}>
          <Text bold>{setupI18n.complete.summary}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          <Text>
            <Text color="cyan">{setupI18n.complete.language}:</Text> {LOCALES.find(l => l.value === state.locale)?.label}
          </Text>
          <Text>
            <Text color="cyan">{setupI18n.complete.theme}:</Text> {selectedTheme.displayName}
          </Text>
          <Text>
            <Text color="cyan">{setupI18n.complete.viewMode}:</Text> {setupI18n.viewMode[state.viewMode === 'gtd' ? 'gtd' : 'kanban']}
          </Text>
          <Text>
            <Text color="cyan">{setupI18n.complete.database}:</Text> {dbLabel}
          </Text>
        </Box>
        <Box marginTop={2}>
          <Text dimColor>{setupI18n.complete.confirm}</Text>
        </Box>
      </Box>
    );
  }

  return <Text>Unknown step</Text>;
}
