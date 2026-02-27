/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // semantic
    profit: '#15803d',
    loss: '#dc2626',
    neutral: '#6b7280',
    border: 'rgba(0,0,0,0.12)',
    borderStrong: 'rgba(0,0,0,0.22)',
    subtle: 'rgba(0,0,0,0.05)',
    chartAxis: 'rgba(0,0,0,0.18)',
    chartAxisStrong: 'rgba(0,0,0,0.30)',
    chartLabel: 'rgba(0,0,0,0.65)',
    segmentActive: '#11181C',
    segmentActiveText: '#fff',
    segmentInactive: 'rgba(0,0,0,0.06)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // semantic
    profit: '#4ade80',
    loss: '#f87171',
    neutral: '#9ca3af',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.25)',
    subtle: 'rgba(255,255,255,0.06)',
    chartAxis: 'rgba(255,255,255,0.18)',
    chartAxisStrong: 'rgba(255,255,255,0.28)',
    chartLabel: 'rgba(255,255,255,0.75)',
    segmentActive: 'rgba(255,255,255,0.18)',
    segmentActiveText: '#fff',
    segmentInactive: 'transparent',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
