export type ThemeName = 'Blue' | 'Purple' | 'Pink' | 'Orange' | 'Green' | 'Graphite'

export interface ThemeMode {
  accent: string
  soft: string
  chipBg: string
  chipBorder: string
  chipColor: string
}

export interface ThemePalette {
  name: ThemeName
  light: ThemeMode
  dark: ThemeMode
  graphLight: string
  graphDark: string
  graph2dRgb: string
}

export const THEMES: ThemePalette[] = [
  {
    name: 'Blue',
    light: {
      accent: '#007aff',
      soft: 'rgba(0, 122, 255, 0.16)',
      chipBg: 'rgba(0, 122, 255, 0.14)',
      chipBorder: 'rgba(0, 122, 255, 0.28)',
      chipColor: '#0a66d6',
    },
    dark: {
      accent: '#0a84ff',
      soft: 'rgba(10, 132, 255, 0.22)',
      chipBg: 'rgba(10, 132, 255, 0.22)',
      chipBorder: 'rgba(10, 132, 255, 0.45)',
      chipColor: '#6cb2ff',
    },
    graphLight: '#bfdbfe',
    graphDark: '#1e3a8a',
    graph2dRgb: '37, 99, 235',
  },
  {
    name: 'Purple',
    light: {
      accent: '#af52de',
      soft: 'rgba(175, 82, 222, 0.16)',
      chipBg: 'rgba(175, 82, 222, 0.14)',
      chipBorder: 'rgba(175, 82, 222, 0.30)',
      chipColor: '#8a39c0',
    },
    dark: {
      accent: '#bf5af2',
      soft: 'rgba(191, 90, 242, 0.24)',
      chipBg: 'rgba(191, 90, 242, 0.22)',
      chipBorder: 'rgba(191, 90, 242, 0.46)',
      chipColor: '#d59bf6',
    },
    graphLight: '#e9d5ff',
    graphDark: '#5b21b6',
    graph2dRgb: '139, 92, 246',
  },
  {
    name: 'Pink',
    light: {
      accent: '#ff2d55',
      soft: 'rgba(255, 45, 85, 0.16)',
      chipBg: 'rgba(255, 45, 85, 0.14)',
      chipBorder: 'rgba(255, 45, 85, 0.30)',
      chipColor: '#d62049',
    },
    dark: {
      accent: '#ff375f',
      soft: 'rgba(255, 55, 95, 0.24)',
      chipBg: 'rgba(255, 55, 95, 0.22)',
      chipBorder: 'rgba(255, 55, 95, 0.46)',
      chipColor: '#ff8ea3',
    },
    graphLight: '#fbcfe8',
    graphDark: '#9d174d',
    graph2dRgb: '236, 72, 153',
  },
  {
    name: 'Orange',
    light: {
      accent: '#ff9500',
      soft: 'rgba(255, 149, 0, 0.16)',
      chipBg: 'rgba(255, 149, 0, 0.16)',
      chipBorder: 'rgba(255, 149, 0, 0.32)',
      chipColor: '#c97400',
    },
    dark: {
      accent: '#ff9f0a',
      soft: 'rgba(255, 159, 10, 0.24)',
      chipBg: 'rgba(255, 159, 10, 0.22)',
      chipBorder: 'rgba(255, 159, 10, 0.46)',
      chipColor: '#ffc463',
    },
    graphLight: '#fed7aa',
    graphDark: '#9a3412',
    graph2dRgb: '249, 115, 22',
  },
  {
    name: 'Green',
    light: {
      accent: '#34c759',
      soft: 'rgba(52, 199, 89, 0.16)',
      chipBg: 'rgba(52, 199, 89, 0.16)',
      chipBorder: 'rgba(52, 199, 89, 0.32)',
      chipColor: '#1d8939',
    },
    dark: {
      accent: '#30d158',
      soft: 'rgba(48, 209, 88, 0.22)',
      chipBg: 'rgba(48, 209, 88, 0.22)',
      chipBorder: 'rgba(48, 209, 88, 0.46)',
      chipColor: '#7fe698',
    },
    graphLight: '#bbf7d0',
    graphDark: '#14532d',
    graph2dRgb: '34, 197, 94',
  },
  {
    name: 'Graphite',
    light: {
      accent: '#6e6e73',
      soft: 'rgba(110, 110, 115, 0.14)',
      chipBg: 'rgba(110, 110, 115, 0.12)',
      chipBorder: 'rgba(110, 110, 115, 0.28)',
      chipColor: '#3a3a3c',
    },
    dark: {
      accent: '#98989d',
      soft: 'rgba(152, 152, 157, 0.22)',
      chipBg: 'rgba(152, 152, 157, 0.18)',
      chipBorder: 'rgba(152, 152, 157, 0.36)',
      chipColor: '#d1d1d6',
    },
    graphLight: '#d1d5db',
    graphDark: '#1f2937',
    graph2dRgb: '107, 114, 128',
  },
]

export function getTheme(name: string): ThemePalette {
  return THEMES.find(t => t.name === name) ?? THEMES[0]
}
