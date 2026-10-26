import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * Monet illustration system (brand board §08–10). Every character is the logo grown
 * into a person: the two arches are the shoulders, a circle is the head.
 * All drawings are flat palette colours, so they work in light and dark mode.
 */

const SHOULDERS = 'M16 140 V108 a22 22 0 0 1 44 0 a22 22 0 0 1 44 0 V140 Z';
const HAIR = {
  short: 'M37 58 C37 33 83 33 83 58 C74 49 46 49 37 58 Z',
  wrap: 'M34 58 C34 26 86 26 86 58 C76 49 44 49 34 58 Z',
  cap: 'M36 56 C36 34 84 34 84 56 Z',
  puff: 'M37 58 C30 40 40 28 52 32 C56 22 70 22 72 32 C84 28 92 42 83 58 C74 49 46 49 37 58 Z',
  none: '',
} as const;

function Face() {
  return (
    <>
      <Circle cx={52} cy={66} r={2.6} fill="#0E1A17" />
      <Circle cx={68} cy={66} r={2.6} fill="#0E1A17" />
      <Path d="M52 74 q8 7 16 0" fill="none" stroke="#0E1A17" strokeWidth={2.6} strokeLinecap="round" />
    </>
  );
}

/* ---------- Characters ---------- */

export type CharacterName = 'mama' | 'jean' | 'kiosk' | 'grace';

export const CHARACTERS: Record<CharacterName, { label: string; role: string; bg: string }> = {
  mama: { label: 'Mama Nzinga', role: 'Receiver', bg: '#DDF0E8' },
  jean: { label: 'Jean', role: 'Sender', bg: '#FBE7D7' },
  kiosk: { label: 'Papa Kiosk', role: 'Kiosk agent', bg: '#0B5D4B' },
  grace: { label: 'Grace', role: 'Student', bg: '#FDF1DC' },
};

function CharacterShapes({ name }: { name: CharacterName }) {
  switch (name) {
    case 'mama':
      return (
        <G>
          <Path d={SHOULDERS} fill="#0B5D4B" />
          <Path d="M40 140 V118 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0 V140" fill="none" stroke="#D9773A" strokeWidth={5} strokeLinejoin="round" />
          <Circle cx={60} cy={62} r={24} fill="#8A5236" />
          <Path d={HAIR.wrap} fill="#D9773A" />
          <Path d="M40 47 C52 41 68 41 80 47" fill="none" stroke="#FBE7D7" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={76} cy={31} r={9} fill="#D9773A" />
          <Face />
          <Circle cx={36} cy={72} r={3} fill="#D9773A" />
          <Circle cx={84} cy={72} r={3} fill="#D9773A" />
        </G>
      );
    case 'jean':
      return (
        <G>
          <Path d={SHOULDERS} fill="#16251F" />
          <Path d="M48 92 L60 106 L72 92" fill="none" stroke="#4FC59E" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={60} cy={62} r={24} fill="#6B3F2A" />
          <Path d={HAIR.short} fill="#1E1A17" />
          <Face />
          <Rect x={84} y={86} width={16} height={26} rx={3.5} fill="#0E1A17" />
          <Rect x={86.5} y={89.5} width={11} height={17} rx={1.5} fill="#4FC59E" />
          <Circle cx={92} cy={116} r={8} fill="#6B3F2A" />
        </G>
      );
    case 'kiosk':
      return (
        <G>
          <Path d={SHOULDERS} fill="#DDF0E8" />
          <Path d="M42 140 V110 h36 V140 Z" fill="#D9773A" />
          <Rect x={52} y={120} width={16} height={10} rx={2} fill="#9A4A1C" />
          <Circle cx={60} cy={62} r={24} fill="#5A3322" />
          <Path d={HAIR.cap} fill="#08463A" />
          <Path d="M60 52 h30 a4 4 0 0 1 0 7 h-30 z" fill="#0E1A17" />
          <Circle cx={60} cy={44} r={3.2} fill="#D9773A" />
          <Circle cx={52} cy={66} r={2.6} fill="#0E1A17" />
          <Circle cx={68} cy={66} r={2.6} fill="#0E1A17" />
          <Path d="M46 74 q14 16 28 0 q-14 7 -28 0 Z" fill="#1E1A17" />
        </G>
      );
    case 'grace':
      return (
        <G>
          <Path d={SHOULDERS} fill="#E89A62" />
          <Path d="M30 140 V104 M90 140 V104" stroke="#0B5D4B" strokeWidth={6} strokeLinecap="round" />
          <Circle cx={60} cy={62} r={24} fill="#A86B45" />
          <Circle cx={40} cy={40} r={13} fill="#1E1A17" />
          <Circle cx={80} cy={40} r={13} fill="#1E1A17" />
          <Path d={HAIR.short} fill="#1E1A17" />
          <Face />
          <Circle cx={46} cy={72} r={3} fill="#D9773A" opacity={0.45} />
          <Circle cx={74} cy={72} r={3} fill="#D9773A" opacity={0.45} />
        </G>
      );
  }
}

/** A full character, 120:140 aspect. */
export function Character({ name, size = 140 }: { name: CharacterName; size?: number }) {
  return (
    <Svg width={(size * 120) / 140} height={size} viewBox="0 0 120 140" accessibilityLabel={CHARACTERS[name].label}>
      <CharacterShapes name={name} />
    </Svg>
  );
}

/* ---------- Avatars ---------- */

type AvatarSpec = { bg: string; shirt: string; skin: string; hair: keyof typeof HAIR; hairColor: string };

export const BRAND_AVATARS: AvatarSpec[] = [
  { bg: '#DDF0E8', shirt: '#0B5D4B', skin: '#8A5236', hair: 'wrap', hairColor: '#D9773A' },
  { bg: '#FBE7D7', shirt: '#16251F', skin: '#6B3F2A', hair: 'short', hairColor: '#1E1A17' },
  { bg: '#0B5D4B', shirt: '#DDF0E8', skin: '#5A3322', hair: 'cap', hairColor: '#08463A' },
  { bg: '#FDF1DC', shirt: '#E89A62', skin: '#A86B45', hair: 'puff', hairColor: '#1E1A17' },
  { bg: '#4FC59E', shirt: '#0E1A17', skin: '#7A4A30', hair: 'none', hairColor: '#1E1A17' },
  { bg: '#E1E7E3', shirt: '#D9773A', skin: '#94603D', hair: 'wrap', hairColor: '#0B5D4B' },
  { bg: '#D9773A', shirt: '#FBE7D7', skin: '#5A3322', hair: 'short', hairColor: '#1E1A17' },
  { bg: '#16251F', shirt: '#4FC59E', skin: '#A86B45', hair: 'puff', hairColor: '#0E1A17' },
  { bg: '#DDF0E8', shirt: '#D9773A', skin: '#6B3F2A', hair: 'cap', hairColor: '#0E1A17' },
  { bg: '#FBE7D7', shirt: '#0B5D4B', skin: '#94603D', hair: 'short', hairColor: '#3A2A1E' },
  { bg: '#FDF1DC', shirt: '#08463A', skin: '#7A4A30', hair: 'wrap', hairColor: '#9A4A1C' },
  { bg: '#0B5D4B', shirt: '#E89A62', skin: '#8A5236', hair: 'none', hairColor: '#1E1A17' },
];

/** Stable avatar index for a user (same person → same avatar on every device). */
export function avatarIndexFor(seed?: string | null) {
  let h = 0;
  for (const ch of String(seed || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % BRAND_AVATARS.length;
}

export function BrandAvatar({ index = 0, size = 48 }: { index?: number; size?: number }) {
  const a = BRAND_AVATARS[index % BRAND_AVATARS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: a.bg, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={size} height={size * 1.04} viewBox="10 36 100 104">
        <Path d={SHOULDERS} fill={a.shirt} />
        <Circle cx={60} cy={62} r={24} fill={a.skin} />
        {HAIR[a.hair] ? <Path d={HAIR[a.hair]} fill={a.hairColor} /> : null}
        <Face />
      </Svg>
    </View>
  );
}

/* ---------- Stickers ---------- */

export type StickerName = 'mbote' | 'sent' | 'arrived' | 'merci' | 'family' | 'cash' | 'safe' | 'fast' | 'bravo' | 'kiosk' | 'topup' | 'home';

export const STICKERS: Record<StickerName, { en: string; fr: string }> = {
  mbote: { en: 'Mbote!', fr: 'Mbote !' },
  sent: { en: 'Sent!', fr: 'Envoyé !' },
  arrived: { en: "It's here!", fr: "C'est arrivé !" },
  merci: { en: 'Thank you', fr: 'Merci' },
  family: { en: 'Family first', fr: "La famille d'abord" },
  cash: { en: 'Cash ready', fr: 'Espèces prêtes' },
  safe: { en: 'Safe', fr: 'En sécurité' },
  fast: { en: 'In minutes', fr: 'En quelques minutes' },
  bravo: { en: 'Bravo!', fr: 'Bravo !' },
  kiosk: { en: 'Kiosk nearby', fr: 'Kiosque proche' },
  topup: { en: 'Top up', fr: 'Recharge' },
  home: { en: 'Home', fr: 'À la maison' },
};

function StickerShapes({ name }: { name: StickerName }) {
  switch (name) {
    case 'mbote':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#DDF0E8" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M22 92 V72 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 V92 Z" fill="#0B5D4B" />
          <Path d="M70 64 L80 38" stroke="#0B5D4B" strokeWidth={9} strokeLinecap="round" />
          <Circle cx={81} cy={33} r={7} fill="#8A5236" />
          <Path d="M88 20 q5 6 0 12 M92 14 q8 10 0 20" fill="none" stroke="#D9773A" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={50} cy={45} r={15} fill="#8A5236" />
          <Circle cx={45} cy={44} r={1.9} fill="#0E1A17" />
          <Circle cx={55} cy={44} r={1.9} fill="#0E1A17" />
          <Path d="M45 50 q5 5 10 0" fill="none" stroke="#0E1A17" strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'sent':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#0B5D4B" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M76 24 L40 58 M76 24 L58 76 L48 60 L26 50 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M40 58 L58 76 L48 60 Z" fill="#DDF0E8" />
          <Path d="M30 70 L22 78 M38 76 L32 82" stroke="#D9773A" strokeWidth={4} strokeLinecap="round" />
        </G>
      );
    case 'arrived':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#FBE7D7" stroke="#FFFFFF" strokeWidth={6} />
          <Circle cx={50} cy={52} r={26} fill="#D9773A" />
          <Circle cx={50} cy={52} r={19} fill="none" stroke="#FBE7D7" strokeWidth={3} />
          <Path d="M40 52 l7 7 l13 -14" fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M80 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#0B5D4B" />
        </G>
      );
    case 'merci':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#FDF1DC" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M50 82 C20 62 16 40 32 31 C41 26 50 32 50 40 C50 32 59 26 68 31 C84 40 80 62 50 82 Z" fill="#0B5D4B" />
          <Circle cx={50} cy={22} r={6} fill="#D9773A" />
        </G>
      );
    case 'family':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#FBE7D7" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M10 92 V74 a12 12 0 0 1 24 0 a12 12 0 0 1 24 0 V92 Z" fill="#16251F" />
          <Path d="M42 92 V74 a12 12 0 0 1 24 0 a12 12 0 0 1 24 0 V92 Z" fill="#0B5D4B" />
          <Circle cx={34} cy={50} r={13} fill="#6B3F2A" />
          <Circle cx={66} cy={50} r={13} fill="#8A5236" />
          <Path d="M53 48 C53 30 79 30 79 48 C73 42 59 42 53 48 Z" fill="#D9773A" />
        </G>
      );
    case 'cash':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#DDF0E8" stroke="#FFFFFF" strokeWidth={6} />
          <G transform="rotate(-12 50 54)">
            <Rect x={18} y={34} width={64} height={40} rx={7} fill="#0B5D4B" />
            <Rect x={24} y={40} width={52} height={28} rx={4} fill="none" stroke="#4FC59E" strokeWidth={2} />
            <Circle cx={50} cy={54} r={9} fill="#D9773A" />
          </G>
        </G>
      );
    case 'safe':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#0E1A17" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M50 18 l26 10 v18 c0 16 -11 28 -26 34 c-15 -6 -26 -18 -26 -34 v-18 Z" fill="#4FC59E" />
          <Path d="M38 50 l9 9 l16 -18" fill="none" stroke="#0E1A17" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      );
    case 'fast':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#0B5D4B" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M56 16 L28 56 H48 L42 84 L72 42 H52 Z" fill="#D9773A" stroke="#D9773A" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M20 30 H32 M16 42 H26 M74 70 H84" stroke="#4FC59E" strokeWidth={4} strokeLinecap="round" />
        </G>
      );
    case 'bravo':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#FDF1DC" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M24 80 L40 34 L66 60 Z" fill="#0B5D4B" />
          <Circle cx={62} cy={26} r={5} fill="#D9773A" />
          <Path d="M78 58 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#D9773A" />
          <Path d="M70 20 q8 -2 10 6" fill="none" stroke="#0B5D4B" strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'kiosk':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#FBE7D7" stroke="#FFFFFF" strokeWidth={6} />
          <Rect x={22} y={44} width={56} height={38} rx={3} fill="#FFFFFF" />
          <Rect x={38} y={58} width={24} height={24} rx={12} fill="#0B5D4B" />
          <Path d="M18 30 H82 L86 46 H14 Z" fill="#0B5D4B" />
          <Path d="M30 30 L28 46 M46 30 L45 46 M54 30 L55 46 M70 30 L72 46" stroke="#FFFFFF" strokeWidth={5} />
          <Circle cx={50} cy={20} r={6} fill="#D9773A" />
        </G>
      );
    case 'topup':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#DDF0E8" stroke="#FFFFFF" strokeWidth={6} />
          <Rect x={32} y={16} width={36} height={68} rx={9} fill="#0E1A17" />
          <Rect x={37} y={24} width={26} height={46} rx={4} fill="#4FC59E" />
          <Path d="M50 36 v22 M39 47 h22" stroke="#0E1A17" strokeWidth={5} strokeLinecap="round" />
          <Circle cx={78} cy={28} r={9} fill="#D9773A" />
        </G>
      );
    case 'home':
      return (
        <G>
          <Rect x={4} y={4} width={92} height={92} rx={28} fill="#0B5D4B" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M18 50 L50 24 L82 50" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M26 46 V82 H74 V46" fill="#DDF0E8" />
          <Path d="M36 82 V68 a7 7 0 0 1 14 0 a7 7 0 0 1 14 0 V82" fill="none" stroke="#0B5D4B" strokeWidth={5} strokeLinejoin="round" />
          <Circle cx={50} cy={56} r={4.5} fill="#D9773A" />
        </G>
      );
  }
}

export function Sticker({ name, size = 96 }: { name: StickerName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={STICKERS[name].en}>
      <StickerShapes name={name} />
    </Svg>
  );
}

/* ---------- Scenes (spot illustrations) ---------- */

export type SceneName = 'bridge' | 'send' | 'kiosk';

/** Wide spot illustrations, 380:230. `bridge` is the logo as a bridge between two homes. */
export function Scene({ name, width = 320, dark = false }: { name: SceneName; width?: number; dark?: boolean }) {
  const height = (width * 230) / 380;
  const bridgeStroke = dark ? '#FFFFFF' : '#0B5D4B';
  return (
    <Svg width={width} height={height} viewBox="0 0 380 230">
      {name === 'bridge' ? (
        <G>
          <Rect x={20} y={120} width={34} height={90} rx={4} fill={dark ? '#08463A' : '#16251F'} />
          <Rect x={58} y={96} width={30} height={114} rx={4} fill={dark ? '#08463A' : '#3C4A45'} />
          <Rect x={28} y={132} width={8} height={8} fill="#4FC59E" />
          <Rect x={40} y={132} width={8} height={8} fill="#4FC59E" />
          <Path d="M296 150 L330 122 L364 150 V210 H296 Z" fill={dark ? '#08463A' : '#FFFFFF'} />
          <Path d="M288 154 L330 118 L372 154" fill="none" stroke="#D9773A" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M320 210 V188 a10 10 0 0 1 20 0 V210" fill={dark ? '#4FC59E' : '#0B5D4B'} />
          <Path d="M96 210 V140 a46 46 0 0 1 92 0 a46 46 0 0 1 92 0 V210" fill="none" stroke={bridgeStroke} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={188} cy={74} r={14} fill="#D9773A" />
          <Circle cx={142} cy={80} r={4} fill="#D9773A" opacity={0.5} />
          <Circle cx={160} cy={72} r={3} fill="#D9773A" opacity={0.35} />
          <Path d="M10 210 H370" stroke={bridgeStroke} strokeWidth={3} strokeLinecap="round" />
        </G>
      ) : null}
      {name === 'send' ? (
        <G>
          <Path d="M196 92 C240 40 300 40 330 70" fill="none" stroke="#D9773A" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
          <G transform="translate(316 44) rotate(12)">
            <Path d="M28 0 L-2 20 L10 22 Z" fill="#0B5D4B" />
            <Path d="M28 0 L10 22 L16 34 Z" fill="#08463A" />
          </G>
          <G transform="translate(100 60)">
            <CharacterShapes name="jean" />
          </G>
        </G>
      ) : null}
      {name === 'kiosk' ? (
        <G>
          <G transform="translate(130 40)">
            <CharacterShapes name="kiosk" />
          </G>
          <Rect x={60} y={150} width={260} height={80} rx={6} fill="#FFFFFF" />
          <Path d="M50 26 H330 L340 58 H40 Z" fill="#0B5D4B" />
          <Path d="M86 26 L82 58 M134 26 L132 58 M190 26 V58 M246 26 L248 58 M294 26 L298 58" stroke="#FFFFFF" strokeWidth={10} />
          <Rect x={150} y={168} width={80} height={22} rx={6} fill="#D9773A" />
          <G transform="translate(262 112) rotate(-14)">
            <Rect x={0} y={0} width={58} height={32} rx={5} fill="#0B5D4B" />
            <Circle cx={29} cy={16} r={7} fill="#D9773A" />
          </G>
        </G>
      ) : null}
    </Svg>
  );
}
