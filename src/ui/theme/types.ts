export type ThemeName = 'modern' | 'norton-commander' | 'dos-prompt' | 'turbo-pascal';

export type BorderStyleType = 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';

export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;
  accent: string;
  muted: string;

  // UI element colors
  border: string;
  borderActive: string;
  background?: string;

  // Status colors
  statusInbox: string;
  statusNext: string;
  statusWaiting: string;
  statusSomeday: string;
  statusDone: string;

  // Text colors
  text: string;
  textMuted: string;
  textSelected: string;
  textHighlight: string;

  // Function key colors
  fnKeyLabel: string;
  fnKeyText: string;
}

export interface ThemeBorders {
  main: BorderStyleType;
  modal: BorderStyleType;
  list: BorderStyleType;
}

export interface ThemeStyle {
  // Selection indicator
  selectedPrefix: string;
  unselectedPrefix: string;

  // Tab style
  tabActiveInverse: boolean;
  tabBrackets: [string, string]; // e.g., ['[', ']'] or ['<', '>']

  // Header style
  headerUppercase: boolean;

  // Show function key bar at bottom
  showFunctionKeys: boolean;

  // Use block characters for loading
  loadingChars: [string, string]; // [filled, empty]
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  borders: ThemeBorders;
  style: ThemeStyle;
}
