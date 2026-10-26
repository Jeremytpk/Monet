import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../lib/LanguageContext';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = {
  title?: string;
  subtitle?: string;
  /** Show a back button (default true). Modal screens pass `close`. */
  back?: boolean | 'close';
  right?: React.ReactNode;
  /** Large title under the bar instead of a centred one. */
  large?: boolean;
};

/** Top bar for stacked screens: back/close button, title, optional action. */
export function Header({ title, subtitle, back = true, right, large = true }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/wallet'));

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        {back ? (
          <IconButton icon={back === 'close' ? 'close' : 'arrow-left'} label={back === 'close' ? t.close || 'Close' : t.back || 'Back'} onPress={goBack} />
        ) : (
          <View style={{ width: 44 }} />
        )}
        {!large && title ? (
          <AppText variant="heading" numberOfLines={1} accessibilityRole="header" style={{ flex: 1, textAlign: 'center', marginHorizontal: 12 }}>
            {title}
          </AppText>
        ) : null}
        {right ?? <View style={{ width: 44 }} />}
      </View>
      {large && title ? (
        <View style={{ gap: 4 }}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" color="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
