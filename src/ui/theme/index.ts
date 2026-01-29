import React, { createContext, useContext } from 'react';
import type { Theme, ThemeName } from './types.js';
import { getTheme, modernTheme } from './themes.js';

export type { Theme, ThemeName, ThemeColors, ThemeBorders, ThemeStyle, BorderStyleType } from './types.js';
export { themes, VALID_THEMES, getTheme, isValidTheme } from './themes.js';

const ThemeContext = createContext<Theme>(modernTheme);

export interface ThemeProviderProps {
  themeName: ThemeName;
  children: React.ReactNode;
}

export function ThemeProvider({ themeName, children }: ThemeProviderProps): React.ReactElement {
  const theme = getTheme(themeName);
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
