import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../lib/ThemeContext';
import type { ThemeColors } from '../../lib/theme/tokens';

/**
 * Monet icon set: 24 px grid, 1.8 px outline stroke, rounded caps and joins
 * (brand board §06). Each icon is a list of shapes drawn with the current colour.
 */
type Shape = string | { c: [number, number, number] } | { r: [number, number, number, number, number] };

const ICONS = {
  wallet: [{ r: [2.5, 6, 19, 14, 3] }, 'M2.5 10h19', 'M16 15h2', 'M5.5 6V5a2 2 0 0 1 2-2h9.5'],
  send: ['M21 3 10.5 13.5', 'M21 3l-6.5 18-4-7.5L3 9.5 21 3z'],
  activity: ['M3 12h4l3-8 4 16 3-8h4'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1.5 14h5', 'M9.5 8h5', 'M17.5 16h5'],
  plus: ['M12 5v14', 'M5 12h14'],
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  'arrow-down-left': ['M17 7 7 17', 'M16 17H7V8'],
  'arrow-left': ['M19 12H5', 'M11 6l-6 6 6 6'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  withdraw: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 21h16'],
  kiosk: ['M3 9l2-5h14l2 5', 'M4 9v11h16V9', 'M3 9h18', 'M9.5 20v-5.5h5V20'],
  phone: [{ r: [6, 2, 12, 20, 3] }, 'M11 18h2'],
  card: [{ r: [2, 5, 20, 14, 3] }, 'M2 10h20', 'M6 15h4'],
  bank: ['M3 10l9-6 9 6', 'M5 10v8', 'M9.5 10v8', 'M14.5 10v8', 'M19 10v8', 'M3 21h18'],
  cash: [{ r: [2, 6, 20, 12, 2.5] }, { c: [12, 12, 2.5] }, 'M6 10v4', 'M18 10v4'],
  user: [{ c: [12, 8, 4] }, 'M4 21c1-4 4.5-6 8-6s7 2 8 6'],
  users: [{ c: [9, 8, 3.5] }, 'M2 20c.8-3.3 3.6-5 7-5s6.2 1.7 7 5', 'M16 4.5a3.5 3.5 0 0 1 0 7', 'M18 15c2 .6 3.4 2.3 4 5'],
  bell: ['M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10 21h4'],
  search: [{ c: [11, 11, 7] }, 'm20 20-3.5-3.5'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  'chevron-right': ['m9 6 6 6-6 6'],
  'chevron-left': ['m15 6-6 6 6 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  check: ['m5 12 5 5 9-10'],
  'check-circle': [{ c: [12, 12, 9] }, 'm8 12 3 3 5-6'],
  alert: [{ c: [12, 12, 9] }, 'M12 7.5v5.5', 'M12 16.5v.01'],
  info: [{ c: [12, 12, 9] }, 'M12 11v5.5', 'M12 7.5v.01'],
  help: [{ c: [12, 12, 9] }, 'M9.5 9.2a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.7v.4', 'M12 17v.01'],
  lock: [{ r: [4, 11, 16, 10, 3] }, 'M8 11V7a4 4 0 0 1 8 0v4'],
  logout: ['M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3', 'M16 17l5-5-5-5', 'M21 12H9'],
  globe: [{ c: [12, 12, 9] }, 'M3 12h18', 'M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z'],
  moon: ['M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z'],
  sun: [{ c: [12, 12, 4] }, 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  shield: ['M12 2.5l8 3v6c0 5-3.5 8.8-8 10.5-4.5-1.7-8-5.5-8-10.5v-6l8-3z', 'm9 12 2 2 4-4'],
  copy: [{ r: [9, 9, 12, 12, 2.5] }, 'M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5'],
  code: [{ r: [3.5, 3.5, 6.5, 6.5, 1.5] }, { r: [14, 3.5, 6.5, 6.5, 1.5] }, { r: [3.5, 14, 6.5, 6.5, 1.5] }, 'M14 14h2.5v2.5H14z', 'M18 18h2.5v2.5H18z', 'M14 19.5h1.5', 'M19.5 14h1'],
  refresh: ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3.5V9h-5.5'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M5.5 7l1 12.5A2 2 0 0 0 8.5 21.5h7a2 2 0 0 0 2-2L18.5 7', 'M9 7V4h6v3'],
  edit: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z', 'M13.5 6.5l4 4'],
  camera: ['M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', { c: [12, 13.5, 3.5] }],
  image: [{ r: [3, 4, 18, 16, 3] }, { c: [9, 10, 1.8] }, 'm21 16-5-5-9 9'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', { c: [12, 12, 3] }],
  'eye-off': ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4', 'M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  mail: [{ r: [3, 5, 18, 14, 2.5] }, 'm3.5 7 8.5 6 8.5-6'],
  megaphone: ['M3 10.5v3a1 1 0 0 0 1 1h2l6 4.5v-14L6 9.5H4a1 1 0 0 0-1 1z', 'M16 9a3.5 3.5 0 0 1 0 6', 'M18.5 6a7.5 7.5 0 0 1 0 12'],
  receipt: ['M6 2.5h12v19l-3-2-3 2-3-2-3 2v-19z', 'M9 7.5h6', 'M9 11.5h6', 'M9 15.5h3.5'],
  grid: [{ r: [3, 3, 7.5, 7.5, 2] }, { r: [13.5, 3, 7.5, 7.5, 2] }, { r: [3, 13.5, 7.5, 7.5, 2] }, { r: [13.5, 13.5, 7.5, 7.5, 2] }],
  clock: [{ c: [12, 12, 9] }, 'M12 7v5l3.5 2'],
  swap: ['M7 4 3 8l4 4', 'M3 8h14', 'M17 20l4-4-4-4', 'M21 16H7'],
  'map-pin': ['M12 21.5s7-6.2 7-11.5a7 7 0 0 0-14 0c0 5.3 7 11.5 7 11.5z', { c: [12, 10, 2.5] }],
  topup: [{ r: [6, 2, 12, 20, 3] }, 'M12 7.5v6', 'M9 10.5h6', 'M11 18h2'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z', 'M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z'],
  heart: ['M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 9 2.3C21 15 12 20.5 12 20.5z'],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  /** A theme colour name or any CSS colour. Defaults to `text`. */
  color?: keyof ThemeColors | (string & {});
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = 'text', strokeWidth = 1.8 }: Props) {
  const { colors } = useTheme();
  const stroke = (colors as unknown as Record<string, string>)[color] ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {(ICONS[name] as Shape[]).map((s, i) => {
        if (typeof s === 'string') return <Path key={i} d={s} />;
        if ('c' in s) return <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />;
        return <Rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} />;
      })}
    </Svg>
  );
}
