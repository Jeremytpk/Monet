import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type Promo = { id: string; title: string; subtitle?: string; imageUri?: string | null; icon?: IconName };

type Props = { items: Promo[]; onPress?: (item: Promo) => void; interval?: number };

const HEIGHT = 112;
const GAP = 12;

/**
 * Compact promo cards. Each card is a solid brand tone with readable text on the left
 * and either the ad image (rounded thumbnail) or a brand icon on the right — text never
 * sits on top of a photo, so it stays legible whatever the image is.
 */
export function PromoCarousel({ items, onPress, interval = 5000 }: Props) {
  const { colors, radii, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  // Ads whose image failed to load fall back to the icon tile.
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const tones = [
    { bg: colors.accent, fg: colors.accentText, sub: isDark ? 'rgba(14,26,23,0.75)' : 'rgba(255,255,255,0.8)', chip: isDark ? 'rgba(14,26,23,0.12)' : 'rgba(255,255,255,0.14)' },
    { bg: colors.highlightSoft, fg: colors.text, sub: colors.textSecondary, chip: colors.card },
    { bg: colors.accentSoft, fg: colors.accentSoftText, sub: colors.textSecondary, chip: colors.card },
  ];

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % items.length;
        ref.current?.scrollTo({ x: next * (cardWidth + GAP), animated: true });
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, cardWidth, interval]);

  if (!items.length) return null;

  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + GAP}
        contentContainerStyle={{ gap: GAP, paddingHorizontal: 20 }}
        style={{ marginHorizontal: -20 }}
        onMomentumScrollEnd={(e) => setIndex(Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)))))}
      >
        {items.map((item, i) => {
          const tone = tones[i % tones.length];
          return (
            <Pressable
              key={item.id}
              onPress={onPress ? () => onPress(item) : undefined}
              accessibilityRole={onPress ? 'button' : 'summary'}
              accessibilityLabel={[item.title, item.subtitle].filter(Boolean).join('. ')}
              style={{ width: cardWidth, height: HEIGHT, borderRadius: radii.card - 4, backgroundColor: tone.bg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="heading" numberOfLines={2} style={{ color: tone.fg }}>
                  {item.title}
                </AppText>
                {item.subtitle ? (
                  <AppText variant="caption" numberOfLines={2} style={{ color: tone.sub }}>
                    {item.subtitle}
                  </AppText>
                ) : null}
              </View>
              {item.imageUri && !broken[item.id] ? (
                <Image
                  source={{ uri: item.imageUri }}
                  onError={() => setBroken((b) => ({ ...b, [item.id]: true }))}
                  style={{ width: 80, height: 80, borderRadius: radii.control, backgroundColor: tone.chip }}
                />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: radii.control, backgroundColor: tone.chip, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={item.icon ?? 'sparkle'} size={28} color={tone.fg} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {items.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityElementsHidden>
          {items.map((it, i) => (
            <View key={it.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? colors.accent : colors.border }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
