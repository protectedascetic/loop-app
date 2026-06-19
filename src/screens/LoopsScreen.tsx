/**
 * LoopsScreen — open loops grouped by life-area / type / priority.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  RefreshControl, Alert, Animated,
} from 'react-native';
import {
  getLoops, getClusters, resolveLoop, snoozeLoop, LoopItem, Cluster, ApiError,
} from '../lib/api';
import {
  C, FONT, TYPE_EMOJI, TYPE_LABEL, TYPE_ORDER, PRI_RANK, PRI_COLOR, serifHeading, shadow,
} from '../theme';
import { SectionLabel, Tag, Skeletons, EmptyState, FadeIn, toast } from '../ui';

type ViewMode = 'areas' | 'type' | 'priority';

interface Props {
  onOpenLoop: (loop: LoopItem) => void;
  onUnauthorized: () => void;
  highlightId?: number | null;
}

export default function LoopsScreen({ onOpenLoop, onUnauthorized, highlightId }: Props) {
  const [loops, setLoops] = useState<LoopItem[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [view, setView] = useState<ViewMode>('areas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ls = await getLoops();
      setLoops(ls);
      getClusters().then(setClusters).catch(() => {});
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) onUnauthorized();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const open = useMemo(() => loops.filter(l => !l.is_journal), [loops]);

  async function handleResolve(id: number) {
    setLoops(l => l.filter(x => x.id !== id));
    try { await resolveLoop(id); toast('Resolved ✓'); }
    catch { toast('Failed', true); load(true); }
  }

  function handleSnooze(id: number) {
    Alert.alert('Snooze this loop', 'Come back to it in…', [
      { text: '1 day', onPress: () => doSnooze(id, 1) },
      { text: '3 days', onPress: () => doSnooze(id, 3) },
      { text: '1 week', onPress: () => doSnooze(id, 7) },
      { text: '2 weeks', onPress: () => doSnooze(id, 14) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  async function doSnooze(id: number, days: number) {
    setLoops(l => l.filter(x => x.id !== id));
    try { await snoozeLoop(id, days); toast(`Snoozed ${days}d ☾`); }
    catch { toast('Failed', true); load(true); }
  }

  const groups = useMemo(() => buildGroups(open, clusters, view), [open, clusters, view]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      <SectionLabel right={
        <View style={styles.toggle}>
          {(['areas', 'type', 'priority'] as ViewMode[]).map(m => (
            <TouchableOpacity key={m} onPress={() => setView(m)} style={[styles.toggleBtn, view === m && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, view === m && styles.toggleTextActive]}>{m === 'areas' ? 'Areas' : m === 'type' ? 'Type' : 'Priority'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      }>Open loops</SectionLabel>

      {loading ? <Skeletons n={5} height={62} /> :
        open.length === 0 ? <EmptyState emoji="🌅" title="All clear." sub="No open loops. You're on top of everything." /> :
        groups.map(g => (
          <View key={g.key} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupEmoji}>{g.emoji}</Text>
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.groupCount}>{g.items.length}</Text>
            </View>
            {g.items.map(item => (
              <LoopCard key={item.id} item={item} highlight={item.id === highlightId}
                onTap={() => onOpenLoop(item)} onResolve={() => handleResolve(item.id)} onSnooze={() => handleSnooze(item.id)} />
            ))}
          </View>
        ))
      }
    </ScrollView>
  );
}

function LoopCard({ item, highlight, onTap, onResolve, onSnooze }: {
  item: LoopItem; highlight?: boolean; onTap: () => void; onResolve: () => void; onSnooze: () => void;
}) {
  const glow = useRef(new Animated.Value(highlight ? 1 : 0)).current;
  useEffect(() => {
    if (highlight) Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(1400),
      Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  }, [highlight, glow]);
  const bg = glow.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.accentSoft] });

  return (
    <FadeIn>
      <Animated.View style={[styles.card, { backgroundColor: bg, borderLeftColor: PRI_COLOR[item.priority] ?? C.amber }]}>
        <TouchableOpacity style={styles.cardBody} activeOpacity={0.7} onPress={onTap}>
          <Text style={styles.cardEmoji}>{TYPE_EMOJI[item.type] ?? '📌'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <Tag type={item.type} />
              <Text style={[styles.cardAge, item.stale && styles.cardAgeStale]}>
                {item.days_old === 0 ? 'today' : `${item.days_old}d`}{item.stale ? ' · aging' : ''}
              </Text>
              {item.notes?.length > 0 && <Text style={styles.cardNotes}>· {item.notes.length} note{item.notes.length === 1 ? '' : 's'}</Text>}
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.abtn} onPress={onResolve}><Text style={styles.abtnText}>✓</Text></TouchableOpacity>
          <TouchableOpacity style={styles.abtn} onPress={onSnooze}><Text style={styles.abtnText}>☾</Text></TouchableOpacity>
        </View>
      </Animated.View>
    </FadeIn>
  );
}

type Group = { key: string; emoji: string; name: string; items: LoopItem[] };
function buildGroups(open: LoopItem[], clusters: Cluster[], view: ViewMode): Group[] {
  const byAttn = (a: LoopItem, b: LoopItem) => b.attn - a.attn;
  if (view === 'priority') {
    return [{ key: 'all', emoji: '◆', name: 'By priority', items: [...open].sort((a, b) => (PRI_RANK[a.priority] - PRI_RANK[b.priority]) || byAttn(a, b)) }];
  }
  if (view === 'type' || (view === 'areas' && clusters.length === 0)) {
    const m: Record<string, LoopItem[]> = {};
    open.forEach(l => (m[l.type] = m[l.type] || []).push(l));
    return TYPE_ORDER.filter(t => m[t]).map(t => ({ key: t, emoji: TYPE_EMOJI[t], name: TYPE_LABEL[t] ?? t, items: m[t].sort(byAttn) }));
  }
  // areas
  const byId = Object.fromEntries(open.map(l => [l.id, l]));
  const used = new Set<number>();
  const groups: Group[] = [];
  for (const c of clusters) {
    const items = (c.loop_ids || []).map(id => byId[id]).filter(Boolean) as LoopItem[];
    items.forEach(i => used.add(i.id));
    if (items.length) groups.push({ key: c.name, emoji: c.emoji || '•', name: c.name, items: items.sort(byAttn) });
  }
  const leftover = open.filter(l => !used.has(l.id));
  if (leftover.length) groups.push({ key: '_else', emoji: '•', name: 'Everything else', items: leftover.sort(byAttn) });
  return groups;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 40 },

  toggle: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 999, padding: 3, gap: 2 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: C.surface, ...shadow(1) },
  toggleText: { fontSize: 12, fontWeight: '600', color: C.muted },
  toggleTextActive: { color: C.text },

  group: { marginBottom: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 2 },
  groupEmoji: { fontSize: 18 },
  groupName: { fontFamily: FONT.serif, fontSize: 18, color: C.text },
  groupCount: { fontSize: 12, fontWeight: '700', color: C.subtle, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },

  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderRadius: 12, marginBottom: 8, paddingRight: 10, ...shadow(1) },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 13 },
  cardEmoji: { fontSize: 17 },
  cardTitle: { fontSize: 14.5, fontWeight: '600', color: C.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  cardAge: { fontSize: 12, color: C.subtle },
  cardAgeStale: { color: C.orange, fontWeight: '600' },
  cardNotes: { fontSize: 12, color: C.subtle },
  cardActions: { flexDirection: 'row', gap: 5 },
  abtn: { width: 29, height: 29, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  abtnText: { fontSize: 13, color: C.muted },
});
