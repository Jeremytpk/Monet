import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BrandAvatar, Character, Scene, Sticker, type CharacterName, type SceneName, type StickerName } from '../brand';
import { Icon, type IconName } from '../ui/Icon';

export type PosterFormat = 'portrait' | 'square' | 'story' | 'banner';
export type PosterTone = 'malachite' | 'copper' | 'ink' | 'mint' | 'paper';
export type PosterLayout = 'hero' | 'split' | 'centered';
export type VisualKind = 'character' | 'avatar' | 'sticker' | 'icon' | 'scene';
export type PosterVisual = { kind: VisualKind; name: string };

export type PosterSpec = {
  format: PosterFormat;
  tone: PosterTone;
  layout: PosterLayout;
  headline: string;
  subline: string;
  cta: string;
  sticker: StickerName | 'none';
  visual: PosterVisual;
};

/** Height / width for each format. */
export const FORMAT_RATIO: Record<PosterFormat, number> = { portrait: 1.25, square: 1, story: 16 / 9, banner: 112 / 335 };

// Fixed brand colours: posters must look the same whatever theme the admin's phone uses.
const TONES: Record<PosterTone, { bg: string; fg: string; sub: string; ctaBg: string; ctaFg: string; logoTile: string; logoArch: string; chip: string; darkScene: boolean }> = {
  malachite: { bg: '#0B5D4B', fg: '#FFFFFF', sub: '#CBE9DD', ctaBg: '#FFFFFF', ctaFg: '#0B5D4B', logoTile: '#FFFFFF', logoArch: '#0B5D4B', chip: '#08463A', darkScene: true },
  copper: { bg: '#FBE7D7', fg: '#0E1A17', sub: '#3C4A45', ctaBg: '#0B5D4B', ctaFg: '#FFFFFF', logoTile: '#0B5D4B', logoArch: '#FFFFFF', chip: '#FFFFFF', darkScene: false },
  ink: { bg: '#0E1A17', fg: '#F5F7F4', sub: '#A9B8B2', ctaBg: '#4FC59E', ctaFg: '#0E1A17', logoTile: '#4FC59E', logoArch: '#0E1A17', chip: '#16251F', darkScene: true },
  mint: { bg: '#DDF0E8', fg: '#0E1A17', sub: '#3C4A45', ctaBg: '#0B5D4B', ctaFg: '#FFFFFF', logoTile: '#0B5D4B', logoArch: '#FFFFFF', chip: '#FFFFFF', darkScene: false },
  paper: { bg: '#F5F7F4', fg: '#0E1A17', sub: '#5B6B66', ctaBg: '#0B5D4B', ctaFg: '#FFFFFF', logoTile: '#0B5D4B', logoArch: '#FFFFFF', chip: '#DDF0E8', darkScene: false },
};

function PosterLogo({ size, tile, arch, fg }: { size: number; tile: string; arch: string; fg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width={40} height={40} rx={11} fill={tile} />
        <Path d="M10 29 V19 a5 5 0 0 1 10 0 V29 M20 19 a5 5 0 0 1 10 0 V29" fill="none" stroke={arch} strokeWidth={3.4} strokeLinecap="round" />
        <Circle cx={20} cy={8} r={3} fill="#D9773A" />
      </Svg>
      <Text style={{ fontFamily: 'Sora_700Bold', fontSize: size * 0.8, letterSpacing: -size * 0.02, color: fg }}>monet</Text>
    </View>
  );
}

// Characters stand on a round stage that contrasts with their outfit, so a malachite
// dress never disappears into a malachite poster.
const DARK_OUTFIT: Record<CharacterName, boolean> = { mama: true, jean: true, kiosk: false, grace: false };
const DARK_TONES: PosterTone[] = ['malachite', 'ink'];

function stageColor(name: CharacterName, tone: PosterTone) {
  if (DARK_OUTFIT[name]) return DARK_TONES.includes(tone) ? '#FBE7D7' : '#FFFFFF';
  return tone === 'malachite' ? '#08463A' : '#0B5D4B';
}

/** Renders the chosen character, avatar, sticker, icon or scene at a given size. */
export function PosterVisualArt({ visual, size, tone }: { visual: PosterVisual; size: number; tone: PosterTone }) {
  const c = TONES[tone];
  switch (visual.kind) {
    case 'character': {
      const name = visual.name as CharacterName;
      return (
        <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ position: 'absolute', bottom: 0, width: size * 0.92, height: size * 0.92, borderRadius: size * 0.46, backgroundColor: stageColor(name, tone) }} />
          <Character name={name} size={size} />
        </View>
      );
    }
    case 'avatar':
      return <BrandAvatar index={Number(visual.name) || 0} size={size * 0.85} />;
    case 'sticker':
      return <Sticker name={visual.name as StickerName} size={size * 0.85} />;
    case 'scene':
      return <Scene name={visual.name as SceneName} width={size * 1.6} dark={c.darkScene} />;
    case 'icon':
      return (
        <View style={{ width: size * 0.8, height: size * 0.8, borderRadius: size * 0.24, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={visual.name as IconName} size={size * 0.42} color={c.fg} strokeWidth={1.8} />
        </View>
      );
  }
}

/** A poster drawn from brand assets. `width` is the on-screen width; capture scales it up. */
export function Poster({ spec, width }: { spec: PosterSpec; width: number }) {
  const c = TONES[spec.tone];
  const height = width * FORMAT_RATIO[spec.format];
  const s = width / 360; // type scale relative to a 360-wide poster

  if (spec.format === 'banner') {
    return (
      <View style={{ width, height, backgroundColor: c.bg, borderRadius: 20 * s, padding: 14 * s, flexDirection: 'row', alignItems: 'center', gap: 12 * s, overflow: 'hidden' }}>
        <View style={{ flex: 1, gap: 4 * s }}>
          <Text numberOfLines={2} style={{ fontFamily: 'Sora_600SemiBold', fontSize: 17 * s, lineHeight: 22 * s, color: c.fg }}>{spec.headline}</Text>
          <Text numberOfLines={2} style={{ fontFamily: 'Inter_400Regular', fontSize: 12 * s, lineHeight: 16 * s, color: c.sub }}>{spec.subline}</Text>
        </View>
        <PosterVisualArt visual={spec.visual} size={80 * s} tone={spec.tone} />
      </View>
    );
  }

  const story = spec.format === 'story';
  const headlineSize = (story ? 44 : spec.format === 'square' ? 32 : 38) * s;
  const pad = 26 * s;
  const visualSize = (spec.layout === 'split' ? 140 : story ? 230 : spec.format === 'square' ? 120 : 136) * s;

  const text = (
    <View style={{ gap: 10 * s, alignItems: spec.layout === 'centered' ? 'center' : 'flex-start', flex: spec.layout === 'split' ? 1 : undefined }}>
      <Text style={{ fontFamily: 'Sora_700Bold', fontSize: headlineSize, lineHeight: headlineSize * 1.04, letterSpacing: -headlineSize * 0.03, color: c.fg, textAlign: spec.layout === 'centered' ? 'center' : 'left' }}>
        {spec.headline}
      </Text>
      {spec.subline ? (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14 * s, lineHeight: 20 * s, color: c.sub, textAlign: spec.layout === 'centered' ? 'center' : 'left' }}>{spec.subline}</Text>
      ) : null}
    </View>
  );
  const art = <PosterVisualArt visual={spec.visual} size={visualSize} tone={spec.tone} />;
  const cta = spec.cta ? (
    <View style={{ alignSelf: spec.layout === 'centered' ? 'center' : 'flex-start', backgroundColor: c.ctaBg, borderRadius: 14 * s, paddingHorizontal: 18 * s, height: 40 * s, justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Sora_600SemiBold', fontSize: 15 * s, color: c.ctaFg }}>{spec.cta}</Text>
    </View>
  ) : null;

  return (
    <View style={{ width, height, backgroundColor: c.bg, padding: pad, justifyContent: 'space-between', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PosterLogo size={26 * s} tile={c.logoTile} arch={c.logoArch} fg={c.fg} />
        {spec.sticker !== 'none' ? (
          <View style={{ transform: [{ rotate: '9deg' }] }}>
            <Sticker name={spec.sticker} size={58 * s} />
          </View>
        ) : null}
      </View>

      {/* Middle area flexes so the art never runs into the button. */}
      {spec.layout === 'split' ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 * s, marginVertical: 12 * s }}>
          {text}
          {art}
        </View>
      ) : spec.layout === 'centered' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 * s, marginVertical: 12 * s }}>
          {art}
          {text}
        </View>
      ) : (
        <View style={{ flex: 1, gap: 14 * s, marginTop: 16 * s, marginBottom: 14 * s }}>
          {text}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>{art}</View>
        </View>
      )}

      {cta}
    </View>
  );
}
