/**
 * Shared UI primitives for Loop — warm editorial style.
 * Pure react-native (no extra native deps).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { C, FONT, TAG_COLOR, shadow } from './theme';

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>{children}</Text>
      <View style={s.rule} />
      {right}
    </View>
  );
}

// ── Type tag ────────────────────────────────────────────────────────────────
export function Tag({ type, label }: { type: string; label?: string }) {
  const col = TAG_COLOR[type] ?? { fg: C.muted, bg: C.surface2 };
  return (
    <View style={[s.tag, { backgroundColor: col.bg }]}>
      <Text style={[s.tagText, { color: col.fg }]}>{label ?? type}</Text>
    </View>
  );
}

// ── Horizontal bar (attention / distribution) ──────────────────────────────────
export function Bar({ pct, from = C.clay, to = '#E0995F', track = C.surface2, height = 5 }: {
  pct: number; from?: string; to?: string; track?: string; height?: number;
}) {
  return (
    <View style={[s.barTrack, { backgroundColor: track, height, borderRadius: height }]}>
      <View style={{ width: `${Math.max(3, Math.min(100, pct))}%`, height, borderRadius: height, backgroundColor: from }} />
    </View>
  );
}

// ── Load meter (Today greeting) ─────────────────────────────────────────────────
export function LoadMeter({ frac }: { frac: number }) {
  const col = frac < 0.4 ? C.green : frac < 0.7 ? C.amber : C.orange;
  const seg = (i: number) => {
    const on = frac >= (i + 1) / 5 - 0.1;
    return <View key={i} style={[s.meterSeg, { backgroundColor: on ? col : C.surface2 }]} />;
  };
  return <View style={s.meter}>{[0, 1, 2, 3, 4].map(seg)}</View>;
}

// ── Skeleton (shimmer) ──────────────────────────────────────────────────────────
export function Skeleton({ height = 56, style }: { height?: number; style?: ViewStyle }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  const opacity = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });
  return <Animated.View style={[{ height, borderRadius: 12, backgroundColor: C.surface2, opacity, marginBottom: 10 }, style]} />;
}

export function Skeletons({ n = 3, height = 64 }: { n?: number; height?: number }) {
  return <>{Array.from({ length: n }, (_, i) => <Skeleton key={i} height={height} />)}</>;
}

// ── Empty / error state ─────────────────────────────────────────────────────────
export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
    </View>
  );
}

// ── Fade-in wrapper ─────────────────────────────────────────────────────────────
export function FadeIn({ children, style, delay = 0 }: { children: React.ReactNode; style?: ViewStyle; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────────
type ToastMsg = { text: string; err?: boolean };
let _emit: ((m: ToastMsg) => void) | null = null;
export function toast(text: string, err = false) { _emit?.({ text, err }); }

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    _emit = (m) => {
      setMsg(m);
      Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null));
      }, 2200);
    };
    return () => { _emit = null; if (timer.current) clearTimeout(timer.current); };
  }, [a]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, {
      backgroundColor: msg.err ? C.red : C.text,
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }]}>
      <Text style={s.toastText}>{msg.text}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 12, paddingHorizontal: 2 },
  sectionLabelText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: C.subtle },
  rule: { flex: 1, height: 1, backgroundColor: C.border },

  tag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  barTrack: { width: '100%', overflow: 'hidden' },

  meter: { flexDirection: 'row', gap: 3 },
  meterSeg: { width: 8, height: 8, borderRadius: 2 },

  empty: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontFamily: FONT.serif, fontSize: 19, color: C.text },
  emptySub: { fontSize: 13.5, color: C.muted, marginTop: 6, textAlign: 'center' },

  toast: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    borderRadius: 11, paddingHorizontal: 20, paddingVertical: 11, ...shadow(3),
  },
  toastText: { color: C.white, fontSize: 13.5, fontWeight: '600' },
});
