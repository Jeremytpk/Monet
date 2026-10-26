import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../../lib/ThemeContext';
import { useAuth } from '../../../lib/useAuth';
import { useLanguage } from '../../../lib/LanguageContext';
import { adminCreateAd, adminGenerateAd, adminUploadAdImage } from '../../../lib/functions';
import { AppText, Button, Card, Header, Icon, Screen, Segmented, TextField } from '../../../components/ui';
import { BRAND_AVATARS, CHARACTERS, STICKERS } from '../../../components/brand';
import { FORMAT_RATIO, Poster, PosterVisualArt } from '../../../components/admin/Poster';

const VISUAL_OPTIONS = {
  character: Object.keys(CHARACTERS),
  avatar: BRAND_AVATARS.map((_, i) => String(i)),
  sticker: Object.keys(STICKERS),
  icon: ['send', 'wallet', 'kiosk', 'phone', 'shield', 'cash', 'heart', 'globe', 'sparkle', 'users', 'topup', 'bank'],
  scene: ['bridge', 'send', 'kiosk'],
};
const TONES = ['malachite', 'copper', 'ink', 'mint', 'paper'];
const TONE_SWATCH = { malachite: '#0B5D4B', copper: '#FBE7D7', ink: '#0E1A17', mint: '#DDF0E8', paper: '#F5F7F4' };
const CAPTURE_WIDTH = 1080;

export default function AdMaker() {
  const { colors, radii } = useTheme();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const posterRef = useRef(null);
  const bannerRef = useRef(null);

  const [kind, setKind] = useState('character');
  const [visualName, setVisualName] = useState('mama');
  const [brief, setBrief] = useState('');
  const [headline, setHeadline] = useState('');
  const [cta, setCta] = useState('');
  const [language, setLanguage] = useState('en');
  const [format, setFormat] = useState('portrait');
  const [variants, setVariants] = useState([]);
  const [selected, setSelected] = useState(0);
  const [edits, setEdits] = useState({});
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  if (String(profile?.role || '').toLowerCase() !== 'admin') return null;

  const visual = { kind, name: visualName };
  const base = variants[selected] || {
    headline: headline || t.adTitlePlaceholder,
    subline: brief || t.adMessagePlaceholder,
    cta: cta || t.adDefaultCta,
    tone: 'malachite',
    layout: 'hero',
    sticker: 'none',
  };
  const spec = { ...base, ...edits, format, visual };
  const previewWidth = Math.min(screenWidth - 40, format === 'story' ? 280 : 360);

  function chooseKind(k) {
    setKind(k);
    setVisualName(VISUAL_OPTIONS[k][0]);
  }

  async function generate() {
    if (!brief.trim()) {
      setError(t.adBriefRequired);
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await adminGenerateAd({ brief, headline, cta, language, format, visual });
      setVariants(res.variants || []);
      setSelected(0);
      setEdits({});
    } catch (e) {
      setError(e.message || t.adGenerateFailed);
    } finally {
      setGenerating(false);
    }
  }

  async function capturePoster(result) {
    const height = Math.round(CAPTURE_WIDTH * FORMAT_RATIO[format]);
    return captureRef(posterRef, { format: 'png', quality: 1, width: CAPTURE_WIDTH, height, result });
  }

  async function sharePoster() {
    try {
      const uri = await capturePoster('tmpfile');
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t.error, t.shareUnavailable);
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: spec.headline, UTI: 'public.png' });
    } catch (e) {
      Alert.alert(t.error, e.message);
    }
  }

  // The in-app promo card shows its picture as a small tile, so publish the visual tile,
  // with the headline and subline as the card's text.
  async function publishInApp() {
    setPublishing(true);
    try {
      const base64 = await captureRef(bannerRef, { format: 'png', quality: 1, width: 320, height: 320, result: 'base64' });
      const upload = await adminUploadAdImage(base64, 'image/png');
      await adminCreateAd({ title: spec.headline, message: spec.subline, image_url: upload?.url || null });
      Alert.alert(t.adPublished, t.adPublishedMsg);
    } catch (e) {
      Alert.alert(t.error, e.message);
    } finally {
      setPublishing(false);
    }
  }

  const edit = (key) => (v) => setEdits((e) => ({ ...e, [key]: v }));

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.adMakerTitle} subtitle={t.adMakerSubtitle} />

      {/* 1. Visual */}
      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">1 · {t.adPickVisual}</AppText>
        <Segmented
          value={kind}
          onChange={chooseKind}
          options={[
            { value: 'character', label: t.adKindCharacter },
            { value: 'avatar', label: t.adKindAvatar },
            { value: 'sticker', label: t.adKindSticker },
            { value: 'icon', label: t.adKindIcon },
            { value: 'scene', label: t.adKindScene },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {VISUAL_OPTIONS[kind].map((name) => {
            const active = name === visualName;
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={kind === 'character' ? CHARACTERS[name].label : kind === 'sticker' ? STICKERS[name][language] : name}
                onPress={() => setVisualName(name)}
                style={{ width: 96, height: 104, borderRadius: radii.control, borderWidth: 2, borderColor: active ? colors.accent : colors.border, backgroundColor: kind === 'character' ? CHARACTERS[name].bg : colors.card, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: kind === 'character' ? 0 : 12 }}
              >
                <PosterVisualArt visual={{ kind, name }} size={kind === 'scene' ? 56 : 84} tone="mint" />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Message */}
      <View style={{ gap: 14 }}>
        <AppText variant="heading" accessibilityRole="header">2 · {t.adWriteBrief}</AppText>
        <TextField
          label={t.adBrief}
          value={brief}
          onChangeText={(v) => { setBrief(v); setError(null); }}
          placeholder={t.adBriefPlaceholder}
          multiline
          style={{ minHeight: 96, textAlignVertical: 'top' }}
          error={error}
        />
        <TextField label={t.adHeadlineOptional} value={headline} onChangeText={setHeadline} placeholder={t.adTitlePlaceholder} maxLength={60} />
        <TextField label={t.adCtaOptional} value={cta} onChangeText={setCta} placeholder={t.adDefaultCta} maxLength={24} />
        <View style={{ gap: 8 }}>
          <AppText variant="label">{t.language}</AppText>
          <Segmented value={language} onChange={setLanguage} options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }]} />
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="label">{t.adFormat}</AppText>
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { value: 'portrait', label: `${t.adFormatPortrait} 4:5` },
              { value: 'square', label: `${t.adFormatSquare} 1:1` },
              { value: 'story', label: `${t.adFormatStory} 9:16` },
              { value: 'banner', label: t.adFormatBanner },
            ]}
          />
        </View>
        <Button
          title={generating ? t.adGenerating : variants.length ? t.adRegenerate : t.adGenerate}
          icon={<Icon name="sparkle" size={18} color={colors.accentText} />}
          onPress={generate}
          loading={generating}
        />
      </View>

      {/* 3. Preview */}
      <View style={{ gap: 12 }}>
        <AppText variant="heading" accessibilityRole="header">3 · {t.preview}</AppText>
        {variants.length ? (
          <Segmented
            value={String(selected)}
            onChange={(v) => { setSelected(Number(v)); setEdits({}); }}
            options={variants.map((_, i) => ({ value: String(i), label: `${t.adOption} ${i + 1}` }))}
          />
        ) : (
          <AppText variant="caption" color="muted">{t.adPreviewHint}</AppText>
        )}

        <View style={{ alignItems: 'center' }}>
          <View ref={posterRef} collapsable={false} style={{ borderRadius: format === 'banner' ? 0 : 12, overflow: 'hidden' }}>
            <Poster spec={spec} width={previewWidth} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }} accessibilityRole="radiogroup">
          {TONES.map((tone) => (
            <Pressable
              key={tone}
              accessibilityRole="radio"
              accessibilityLabel={tone}
              accessibilityState={{ selected: spec.tone === tone }}
              onPress={() => setEdits((e) => ({ ...e, tone }))}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: TONE_SWATCH[tone], borderWidth: spec.tone === tone ? 3 : 1, borderColor: spec.tone === tone ? colors.highlight : colors.border }}
            />
          ))}
        </View>
        {format !== 'banner' ? (
          <Segmented
            value={spec.layout}
            onChange={(layout) => setEdits((e) => ({ ...e, layout }))}
            options={[{ value: 'hero', label: t.adLayoutHero }, { value: 'split', label: t.adLayoutSplit }, { value: 'centered', label: t.adLayoutCentered }]}
          />
        ) : null}

        <Card style={{ gap: 12 }}>
          <AppText variant="label" color="muted">{t.adFineTune}</AppText>
          <TextField label={t.adTitle} value={spec.headline} onChangeText={edit('headline')} maxLength={60} />
          <TextField label={t.adMessage} value={spec.subline} onChangeText={edit('subline')} maxLength={140} multiline />
          <TextField label={t.adCta} value={spec.cta} onChangeText={edit('cta')} maxLength={24} />
        </Card>

        {variants[selected]?.alt_text ? (
          <AppText variant="caption" color="muted">{t.adAltText}: {variants[selected].alt_text}</AppText>
        ) : null}

        <Button title={t.adShare} variant="secondary" icon={<Icon name="arrow-up-right" size={18} color={colors.accent} />} onPress={sharePoster} />
        <Button title={t.adPublishInApp} icon={<Icon name="megaphone" size={18} color={colors.accentText} />} onPress={publishInApp} loading={publishing} />

        {/* The tile uploaded as the in-app promo picture. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View ref={bannerRef} collapsable={false} style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', backgroundColor: TONE_SWATCH[spec.tone], alignItems: 'center', justifyContent: kind === 'character' ? 'flex-end' : 'center' }}>
            <PosterVisualArt visual={visual} size={kind === 'scene' ? 48 : 72} tone={spec.tone} />
          </View>
          <AppText variant="caption" color="muted" style={{ flex: 1 }}>{t.adInAppNote}</AppText>
        </View>
      </View>
    </Screen>
  );
}
