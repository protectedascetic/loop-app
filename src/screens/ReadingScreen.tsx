/**
 * ReadingScreen — saved links to read/watch later. Unread / Read / All.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Linking, Image,
} from 'react-native';
import { getReading, resolveLoop, ReadingItem, ApiError } from '../lib/api';
import { C, shadow } from '../theme';
import { Skeletons, EmptyState, FadeIn, toast } from '../ui';

type Filter = 'unread' | 'read' | 'all';
const FILTERS: Filter[] = ['unread', 'read', 'all'];

interface Props { onUnauthorized: () => void }

export default function ReadingScreen({ onUnauthorized }: Props) {
  const [items, setItems] = useState<ReadingItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>('unread');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: Filter, silent = false) => {
    if (!silent) setItems(null);
    try {
      const d = await getReading(f);
      setItems(d.items);
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) onUnauthorized();
      setItems([]);
    }
  }, [onUnauthorized]);

  useEffect(() => { load(filter); }, [filter, load]);

  async function onRefresh() { setRefreshing(true); await load(filter, true); setRefreshing(false); }

  async function markRead(id: number) {
    setItems(prev => prev ? prev.filter(it => it.id !== id || filter !== 'unread') : prev);
    try { await resolveLoop(id); toast('Marked as read ✓'); load(filter, true); }
    catch { toast('Failed', true); load(filter, true); }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <Text style={styles.intro}>Links you saved to read or watch later.</Text>

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === 'unread' ? 'Unread' : f === 'read' ? 'Read' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {items === null ? (
        <View style={{ marginTop: 8 }}><Skeletons n={4} height={78} /></View>
      ) : items.length === 0 ? (
        <EmptyState emoji="📚" title={filter === 'read' ? 'Nothing read yet.' : 'Nothing saved yet.'}
          sub={filter === 'read' ? 'Links you finish will move here.' : 'Share or paste a link to save it to read later.'} />
      ) : (
        items.map((it, i) => (
          <FadeIn key={it.id} delay={i * 40}>
            <ReadingCard item={it} onOpen={() => Linking.openURL(it.url)} onRead={() => markRead(it.id)} />
          </FadeIn>
        ))
      )}
    </ScrollView>
  );
}

function ReadingCard({ item, onOpen, onRead }: { item: ReadingItem; onOpen: () => void; onRead: () => void }) {
  const fav = item.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=64` : '';
  const age = item.days_old === 0 ? 'today' : `${item.days_old}d ago`;
  return (
    <View style={[styles.card, item.read && styles.cardRead]}>
      <TouchableOpacity style={styles.cardMain} onPress={onOpen} activeOpacity={0.7}>
        <View style={styles.fav}>
          {fav ? <Image source={{ uri: fav }} style={styles.favImg} /> : <Text>🔗</Text>}
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {!!item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.meta}>{item.domain} · saved {age}{item.read ? ' · read' : ''}</Text>
        </View>
      </TouchableOpacity>
      {!item.read && (
        <TouchableOpacity style={styles.done} onPress={onRead}>
          <Text style={styles.doneText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: C.muted, marginBottom: 14 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pillActive: { backgroundColor: C.text, borderColor: C.text },
  pillText: { fontSize: 13, fontWeight: '600', color: C.muted },
  pillTextActive: { color: C.bg },

  card: { flexDirection: 'row', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 10, overflow: 'hidden', ...shadow(1) },
  cardRead: { opacity: 0.6 },
  cardMain: { flex: 1, flexDirection: 'row', gap: 12, padding: 13 },
  fav: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  favImg: { width: 22, height: 22 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
  desc: { fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 17 },
  meta: { fontSize: 11.5, color: C.subtle, marginTop: 6 },
  done: { width: 46, borderLeftWidth: 1, borderLeftColor: C.border, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 18, color: C.clay },
});
