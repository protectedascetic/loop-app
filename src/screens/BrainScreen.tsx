/**
 * BrainScreen — what Loop sees: pattern insight, at-a-glance stats,
 * attention distribution, and on-demand deeper reflections.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  getBrain, getBrainInsight, brainAvoidance, brainWeek, BrainData, ApiError,
} from '../lib/api';
import { C, FONT, TYPE_EMOJI, serifHeading, shadow } from '../theme';
import { SectionLabel, Bar, Skeletons, EmptyState, FadeIn, toast } from '../ui';

interface Props { onUnauthorized: () => void }

export default function BrainScreen({ onUnauthorized }: Props) {
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErr(false);
    try {
      setBrain(await getBrain());
      setInsight(null);
      getBrainInsight().then(r => setInsight(r.text || '')).catch(() => setInsight(''));
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) { onUnauthorized(); return; }
      setErr(true);
    } finally { setLoading(false); setRefreshing(false); }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const byType = brain ? Object.entries(brain.by_type).sort((a, b) => b[1] - a[1]) : [];
  const maxT = Math.max(1, ...byType.map(x => x[1]));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      <View style={styles.head}>
        <Text style={serifHeading(24)}>Brain</Text>
        <Text style={styles.sub}>What Loop sees in your mind right now.</Text>
      </View>

      {loading ? <View style={{ marginTop: 18 }}><Skeletons n={3} height={84} /></View> :
        err || !brain ? <EmptyState emoji="⚠" title="Couldn't load." sub="Pull to refresh to retry." /> :
        <>
          {/* Insight */}
          <InsightCard text={insight} />

          {/* At a glance */}
          <SectionLabel>At a glance</SectionLabel>
          <View style={styles.statGrid}>
            <Stat n={brain.total} label="Open" color={C.accent} />
            <Stat n={brain.stale} label="Aging" color={C.orange} />
            <Stat n={brain.resolved_week} label="Closed / wk" color={C.green} />
            <Stat n={brain.journal} label="Journal" color={C.clay} />
          </View>

          {/* Distribution */}
          {byType.length > 0 && (
            <>
              <SectionLabel>Where your mind is</SectionLabel>
              <View style={styles.panel}>
                {byType.map(([t, n]) => (
                  <View key={t} style={styles.loadRow}>
                    <Text style={styles.loadLabel}>{TYPE_EMOJI[t] ?? '📌'} {t}</Text>
                    <View style={{ flex: 1 }}><Bar pct={(n / maxT) * 100} from={C.accent} to="#8B88EC" height={9} /></View>
                    <Text style={styles.loadVal}>{n}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Deeper reflections */}
          <SectionLabel>Deeper reflections</SectionLabel>
          <ToolCard glyph="🔍" glyphBg={C.claySoft} name="What am I avoiding?" desc="A candid look at what you keep postponing." run={brainAvoidance} cta="Reflect" />
          <ToolCard glyph="🗓" glyphBg={C.accentSoft} name="Weekly review" desc="What you shipped, what to decide, what's next." run={brainWeek} cta="Generate" />
        </>
      }
    </ScrollView>
  );
}

function InsightCard({ text }: { text: string | null }) {
  return (
    <FadeIn style={styles.insight}>
      <Text style={styles.insightEyebrow}>PATTERN</Text>
      {text === null ? <Text style={styles.insightMuted}>Looking for the pattern in your loops…</Text>
        : text ? <Text style={styles.insightText}>{text}</Text>
        : <Text style={styles.insightMuted}>Capture a few loops and a pattern will emerge here.</Text>}
    </FadeIn>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

function ToolCard({ glyph, glyphBg, name, desc, run, cta }: {
  glyph: string; glyphBg: string; name: string; desc: string; run: () => Promise<{ text: string }>; cta: string;
}) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    try { const r = await run(); setOut(r.text); }
    catch { toast('Failed', true); }
    finally { setBusy(false); }
  }
  return (
    <View style={styles.tool}>
      <View style={styles.toolHead}>
        <View style={[styles.toolGlyph, { backgroundColor: glyphBg }]}><Text style={{ fontSize: 17 }}>{glyph}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolName}>{name}</Text>
          <Text style={styles.toolDesc}>{desc}</Text>
        </View>
        <TouchableOpacity style={[styles.toolRun, busy && { opacity: 0.6 }]} onPress={go} disabled={busy}>
          {busy ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={styles.toolRunText}>{out ? 'Refresh' : cta}</Text>}
        </TouchableOpacity>
      </View>
      {out ? <Text style={styles.toolOut}>{out}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  head: { paddingHorizontal: 2 },
  sub: { fontSize: 14.5, color: C.muted, marginTop: 7 },

  insight: { backgroundColor: C.accentTint, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 22, marginTop: 18, ...shadow(2) },
  insightEyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1, color: C.accent, marginBottom: 10 },
  insightText: { fontFamily: FONT.serif, fontSize: 18, lineHeight: 29, color: C.text },
  insightMuted: { fontSize: 14, color: C.subtle, fontStyle: 'italic' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', ...shadow(1) },
  statN: { fontFamily: FONT.serif, fontSize: 26 },
  statL: { fontSize: 11, color: C.muted, marginTop: 6 },

  panel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, ...shadow(1) },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  loadLabel: { width: 118, fontSize: 13, color: C.muted, textTransform: 'capitalize' },
  loadVal: { width: 22, textAlign: 'right', fontSize: 13, fontWeight: '600', color: C.muted },

  tool: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 10, ...shadow(1) },
  toolHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  toolGlyph: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 14.5, fontWeight: '600', color: C.text },
  toolDesc: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  toolRun: { backgroundColor: C.text, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8, minWidth: 74, alignItems: 'center' },
  toolRunText: { color: C.bg, fontSize: 12.5, fontWeight: '600' },
  toolOut: { fontFamily: FONT.serif, fontSize: 15, lineHeight: 24, color: C.text, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
});
