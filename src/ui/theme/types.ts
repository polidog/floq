export type ThemeName =
  | 'modern'
  | 'norton-commander'
  | 'dos-prompt'
  | 'turbo-pascal'
  | 'classic-mac'
  | 'apple-ii'
  | 'commodore-64'
  | 'amiga-workbench'
  | 'matrix'
  | 'amber-crt'
  | 'phosphor'
  | 'solarized-dark'
  | 'solarized-light'
  | 'synthwave'
  | 'paper'
  | 'coffee'
  | 'nord'
  | 'dracula'
  | 'monokai'
  | 'gruvbox'
  | 'tokyo-night'
  | 'catppuccin'
  | 'ocean'
  | 'sakura'
  | 'msx'
  | 'pc-98'
  | 'dragon-quest'
  | 'mario';

export type BorderStyleType = 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';

// UI style determines how boxes are rendered
// - 'default': Standard Ink Box with borderStyle
// - 'titled-box': Custom TitledBox component with title embedded in top border (RPG style)
// - 'mario-block': Super Mario Bros style with block/brick borders
export type UIStyleType = 'default' | 'titled-box' | 'mario-block';

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
  uiStyle?: UIStyleType; // Optional, defaults to 'default'
}
