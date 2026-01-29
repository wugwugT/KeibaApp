import { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export type CumulativeRow = {
  date: string; // YYYY-MM-DD
  dailyProfit: number;
  cumulativeProfit: number;
};

type Props = {
  data: CumulativeRow[]; // どっち順でもOK（中で日付昇順に揃える）
  height?: number;
};

const fmtYen = (n: number) => `${n}円`;
const shortDate = (ymd: string) => ymd.slice(5); // "MM-DD"

export const CumulativeLineChart = ({ data, height = 220 }: Props) => {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(280, width - 32); // 親がpadding16前提

  const layout = useMemo(() => {
    const sorted = [...data].sort((a, b) => (a.date < b.date ? -1 : 1));
    const values = sorted.map((d) => d.cumulativeProfit);

    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 0);

    const range = Math.max(1, maxV - minV);

    // 目盛り文字の領域を確保（左・下）
    const padLeft = 56;
    const padRight = 12;
    const padTop = 12;
    const padBottom = 26;

    const innerW = chartWidth - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const yOf = (value: number) => {
      // 上が小さいy、下が大きいyなので反転
      return padTop + innerH * (1 - (value - minV) / range);
    };

    const xOf = (i: number) => {
      if (sorted.length === 1) return padLeft + innerW / 2;
      return padLeft + (innerW * i) / (sorted.length - 1);
    };

    const pts = sorted.map((d, i) => ({
      x: xOf(i),
      y: yOf(d.cumulativeProfit),
      date: d.date,
      value: d.cumulativeProfit,
    }));

    const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const zeroY = yOf(0);

    // min/maxポイント（強調用）
    let minIdx = 0;
    let maxIdx = 0;
    pts.forEach((p, i) => {
      if (p.value < pts[minIdx].value) minIdx = i;
      if (p.value > pts[maxIdx].value) maxIdx = i;
    });

    const latest = sorted.length ? sorted[sorted.length - 1] : null;

    // 線色：最新の累積がプラスなら緑、マイナスなら赤
    const lineColor = (latest?.cumulativeProfit ?? 0) >= 0 ? '#4CAF50' : '#F44336';

    return {
      sorted,
      pts,
      polylinePoints,
      minV,
      maxV,
      zeroY,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerW,
      innerH,
      latest,
      lineColor,
      minIdx,
      maxIdx,
    };
  }, [data, chartWidth, height]);

  if (data.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText>データがありません</ThemedText>
      </ThemedView>
    );
  }

  const firstDate = layout.sorted[0]?.date ?? '';
  const lastDate = layout.sorted[layout.sorted.length - 1]?.date ?? '';

  return (
    <ThemedView style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText type="subtitle">累積収支（折れ線）</ThemedText>
        {layout.latest ? (
          <ThemedText style={{ opacity: 0.85 }}>
            最新 {layout.latest.date}：{fmtYen(layout.latest.cumulativeProfit)}
          </ThemedText>
        ) : null}
      </View>

      <Svg width={chartWidth} height={height}>
        {/* 縦軸・横軸 */}
        <Line
          x1={layout.padLeft}
          y1={layout.padTop}
          x2={layout.padLeft}
          y2={height - layout.padBottom}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
        <Line
          x1={layout.padLeft}
          y1={height - layout.padBottom}
          x2={chartWidth - layout.padRight}
          y2={height - layout.padBottom}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />

        {/* 0ライン */}
        <Line
          x1={layout.padLeft}
          y1={layout.zeroY}
          x2={chartWidth - layout.padRight}
          y2={layout.zeroY}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={1}
        />

        {/* Y目盛り（min / 0 / max） */}
        <SvgText
          x={layout.padLeft - 6}
          y={layout.padTop + 10}
          fill="rgba(255,255,255,0.75)"
          fontSize={12}
          textAnchor="end">
          {fmtYen(layout.maxV)}
        </SvgText>

        <SvgText
          x={layout.padLeft - 6}
          y={layout.zeroY + 4}
          fill="rgba(255,255,255,0.75)"
          fontSize={12}
          textAnchor="end">
          {fmtYen(0)}
        </SvgText>

        <SvgText
          x={layout.padLeft - 6}
          y={height - layout.padBottom}
          fill="rgba(255,255,255,0.75)"
          fontSize={12}
          textAnchor="end">
          {fmtYen(layout.minV)}
        </SvgText>

        {/* X目盛り（最初/最後） */}
        <SvgText
          x={layout.padLeft}
          y={height - 6}
          fill="rgba(255,255,255,0.75)"
          fontSize={12}
          textAnchor="start">
          {shortDate(firstDate)}
        </SvgText>

        <SvgText
          x={chartWidth - layout.padRight}
          y={height - 6}
          fill="rgba(255,255,255,0.75)"
          fontSize={12}
          textAnchor="end">
          {shortDate(lastDate)}
        </SvgText>

        {/* 折れ線 */}
        <Polyline
          points={layout.polylinePoints}
          fill="none"
          stroke={layout.lineColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 点（ドット） */}
        {layout.pts.map((p, i) => {
          const isExtreme = i === layout.minIdx || i === layout.maxIdx;
          return (
            <Circle
              key={p.date}
              cx={p.x}
              cy={p.y}
              r={isExtreme ? 4.2 : 3}
              fill={isExtreme ? '#FFFFFF' : layout.lineColor}
              opacity={0.95}
            />
          );
        })}
      </Svg>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 12,
  },
  header: {
    gap: 4,
    marginBottom: 8,
  },
  empty: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
