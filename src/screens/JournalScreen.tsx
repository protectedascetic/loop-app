/**
 * JournalScreen — observations, reflections and notes as a warm timeline.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { getJournal, JournalEntry, ApiError } from '../lib/api';
import { C, FONT, TYPE_EMOJI, serifHeading } from '../theme';
import { Skeletons, EmptyState, FadeIn } from '../ui';

interface Props { onUnauthorized: () => void }

export default function JournalScreen({ onUnauthorized }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setEntries(await getJournal()); }
    catch (e) { if (e instanceof ApiError && e.isUnauthorized) onUnauthorized(); }
    finally { setLoading(false); setRefreshing(false); }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const m: { label: string; items: JournalEntry[] }[] = [];
    const idx: Record<string, number> = {};
    for (const e of entries) {
      const label = e.days_old === 0 ? 'Today' : e.days_old === 1 ? 'Yesterday' : `${e.days_old} days ago`;
      if (idx[label] === undefined) { idx[label] = m.length; m.push({ label, items: [] }); }
      m[idx[label]].items.push(e);
    }
    return m;
  }, [entries]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      <View style={styles.head}>
        <Text style={serifHeading(24)}>Journal</Text>
        <Text style={styles.sub}>Observations, reflections and notes — captured over time.</Text>
      </View>

      {loading ? <View style={{ marginTop: 18 }}><Skeletons n={4} height={70} /></View> :
        entries.length === 0 ? <EmptyState emoji="🪞" title="Nothing journaled yet." sub="Capture an observation or reflection and it'll live here." /> :
        days.map(day => (
          <View key={day.label}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            {day.items.map((e, i) => (
              <FadeIn key={e.id}>
                <View style={styles.entry}>
                  <View style={styles.rail}>
                    <View style={styles.dot}><Text style={{ fontSize: 14 }}>{TYPE_EMOJI[e.type] ?? '📝'}</Text></View>
                    {i < day.items.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.type}>{e.type}</Text>
                    <Text style={styles.text}>{e.text}</Text>
                    {e.summary ? <Text style={styles.summary}>{e.summary}</Text> : null}
                  </View>
                </View>
              </FadeIn>
            ))}
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  head: { paddingHorizontal: 2 },
  sub: { fontSize: 14.5, color: C.muted, marginTop: 7 },

  dayLabel: { fontFamily: FONT.serif, fontSize: 14, color: C.clay, marginTop: 22, marginBottom: 12, paddingHorizontal: 2 },
  entry: { flexDirection: 'row', gap: 14, paddingHorizontal: 2 },
  rail: { alignItems: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 4, minHeight: 10 },
  body: { flex: 1, paddingBottom: 22 },
  type: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.subtle, marginBottom: 3 },
  text: { fontFamily: FONT.serif, fontSize: 16, lineHeight: 25, color: C.text },
  summary: { fontSize: 13, color: C.muted, marginTop: 5 },
});
