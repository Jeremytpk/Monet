/**
 * Monet design tokens — "Malachite & Copper" brand board.
 *
 * Malachite (green) is the brand and action colour. Copper is a warm accent for
 * highlights only and is never used for body text. Every text/background pair
 * below meets WCAG AA (4.5:1) in its own theme.
 */

export const palette = {
  malachite100: '#DDF0E8',
  malachite300: '#4FC59E',
  malachite400: '#3AA884',
  malachite700: '#0B5D4B',
  malachite900: '#08463A',
  copper100: '#FBE7D7',
  copper400: '#E89A62',
  copper500: '#D9773A',
  copper700: '#9A4A1C',
  ink: '#0E1A17',
  inkSurface: '#16251F',
  inkBorder: '#24362F',
  paper: '#F5F7F4',
  white: '#FFFFFF',
  stone: '#5B6B66',
  mist: '#A9B8B2',
  line: '#E1E7E3',
} as const;

export type ThemeColors = {
  /** Screen background. */
  background: string;
  /** Cards, sheets, inputs. */
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  /** Tertiary text, placeholders, inactive icons. */
  muted: string;
  /** Primary action colour (buttons, links, active tab). */
  accent: string;
  /** Text/icons on top of `accent`. */
  accentText: string;
  accentPressed: string;
  /** Tinted background for secondary actions and icon chips. */
  accentSoft: string;
  accentSoftText: string;
  /** Copper accent: promos, the logo dot, incoming-money chips. */
  highlight: string;
  highlightSoft: string;
  highlightText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
};

export const lightColors: ThemeColors = {
  background: palette.paper,
  card: palette.white,
  border: palette.line,
  text: palette.ink,
  textSecondary: '#3C4A45',
  muted: palette.stone,
  accent: palette.malachite700,
  accentText: palette.white,
  accentPressed: palette.malachite900,
  accentSoft: palette.malachite100,
  accentSoftText: palette.malachite900,
  highlight: palette.copper500,
  highlightSoft: palette.copper100,
  highlightText: palette.copper700,
  success: palette.malachite700,
  successSoft: palette.malachite100,
  warning: '#9A5B0B',
  warningSoft: '#FDF1DC',
  error: '#B42318',
  errorSoft: '#FDECEA',
};

export const darkColors: ThemeColors = {
  background: palette.ink,
  card: palette.inkSurface,
  border: palette.inkBorder,
  text: palette.paper,
  textSecondary: '#C9D4CF',
  muted: palette.mist,
  accent: palette.malachite300,
  accentText: palette.ink,
  accentPressed: palette.malachite400,
  accentSoft: '#1E3A31',
  accentSoftText: '#7AD8B7',
  highlight: palette.copper400,
  highlightSoft: '#3A2A1E',
  highlightText: palette.copper400,
  success: palette.malachite300,
  successSoft: '#1E3A31',
  warning: '#F2C26B',
  warningSoft: '#3A2E14',
  error: '#F97066',
  errorSoft: '#3D1A17',
};

/** 8 px grid. */
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radii = { chip: 12, control: 16, card: 24, pill: 999 } as const;

/** Font family names registered by @expo-google-fonts (loaded in app/_layout). */
export const fonts = {
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.displaySemiBold, fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.displaySemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  amount: { fontFamily: fonts.displaySemiBold, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
} as const;

export type TypographyVariant = keyof typeof typography;
