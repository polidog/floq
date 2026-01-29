import type { Theme, ThemeName } from './types.js';

export const modernTheme: Theme = {
  name: 'modern',
  displayName: 'Modern',
  colors: {
    primary: 'green',
    secondary: 'cyan',
    accent: 'yellow',
    muted: 'gray',
    border: 'gray',
    borderActive: 'cyan',
    statusInbox: 'blue',
    statusNext: 'green',
    statusWaiting: 'yellow',
    statusSomeday: 'magenta',
    statusDone: 'gray',
    text: 'white',
    textMuted: 'gray',
    textSelected: 'cyan',
    textHighlight: 'green',
    fnKeyLabel: 'black',
    fnKeyText: 'cyan',
  },
  borders: {
    main: 'single',
    modal: 'round',
    list: 'single',
  },
  style: {
    selectedPrefix: '› ',
    unselectedPrefix: '  ',
    tabActiveInverse: true,
    tabBrackets: ['', ''],
    headerUppercase: false,
    showFunctionKeys: false,
    loadingChars: ['▪', '▫'],
  },
};

export const nortonCommanderTheme: Theme = {
  name: 'norton-commander',
  displayName: 'Norton Commander',
  colors: {
    primary: 'cyan',
    secondary: 'yellow',
    accent: 'white',
    muted: 'blue',
    border: 'cyan',
    borderActive: 'yellow',
    background: 'blue',
    statusInbox: 'white',
    statusNext: 'green',
    statusWaiting: 'yellow',
    statusSomeday: 'magenta',
    statusDone: 'gray',
    text: 'cyan',
    textMuted: 'blue',
    textSelected: 'yellow',
    textHighlight: 'white',
    fnKeyLabel: 'black',
    fnKeyText: 'cyan',
  },
  borders: {
    main: 'double',
    modal: 'double',
    list: 'double',
  },
  style: {
    selectedPrefix: '► ',
    unselectedPrefix: '  ',
    tabActiveInverse: true,
    tabBrackets: ['[', ']'],
    headerUppercase: true,
    showFunctionKeys: true,
    loadingChars: ['█', '░'],
  },
};

export const dosPromptTheme: Theme = {
  name: 'dos-prompt',
  displayName: 'DOS Prompt',
  colors: {
    primary: 'green',
    secondary: 'green',
    accent: 'white',
    muted: 'gray',
    border: 'green',
    borderActive: 'white',
    statusInbox: 'white',
    statusNext: 'green',
    statusWaiting: 'yellow',
    statusSomeday: 'gray',
    statusDone: 'gray',
    text: 'green',
    textMuted: 'gray',
    textSelected: 'white',
    textHighlight: 'green',
    fnKeyLabel: 'green',
    fnKeyText: 'white',
  },
  borders: {
    main: 'single',
    modal: 'single',
    list: 'single',
  },
  style: {
    selectedPrefix: '> ',
    unselectedPrefix: '  ',
    tabActiveInverse: false,
    tabBrackets: ['<', '>'],
    headerUppercase: true,
    showFunctionKeys: true,
    loadingChars: ['#', '-'],
  },
};

export const turboPascalTheme: Theme = {
  name: 'turbo-pascal',
  displayName: 'Turbo Pascal IDE',
  colors: {
    primary: 'yellow',
    secondary: 'white',
    accent: 'red',
    muted: 'cyan',
    border: 'white',
    borderActive: 'yellow',
    background: 'blue',
    statusInbox: 'white',
    statusNext: 'yellow',
    statusWaiting: 'red',
    statusSomeday: 'cyan',
    statusDone: 'gray',
    text: 'white',
    textMuted: 'cyan',
    textSelected: 'yellow',
    textHighlight: 'white',
    fnKeyLabel: 'red',
    fnKeyText: 'cyan',
  },
  borders: {
    main: 'double',
    modal: 'double',
    list: 'single',
  },
  style: {
    selectedPrefix: '» ',
    unselectedPrefix: '  ',
    tabActiveInverse: true,
    tabBrackets: ['[', ']'],
    headerUppercase: true,
    showFunctionKeys: true,
    loadingChars: ['█', '▒'],
  },
};

export const themes: Record<ThemeName, Theme> = {
  'modern': modernTheme,
  'norton-commander': nortonCommanderTheme,
  'dos-prompt': dosPromptTheme,
  'turbo-pascal': turboPascalTheme,
};

export const VALID_THEMES: ThemeName[] = ['modern', 'norton-commander', 'dos-prompt', 'turbo-pascal'];

export function getTheme(name: ThemeName): Theme {
  return themes[name] || modernTheme;
}

export function isValidTheme(name: string): name is ThemeName {
  return VALID_THEMES.includes(name as ThemeName);
}
