/**
 * HomeScreen — main Loop UI.
 * TODO: port the web UI's capture + loop list + Brain panel to React Native.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLoops, capture, resolveLoop, snoozeLoop, LoopItem, ApiError } from '../lib/api';
import { signOut } from '../lib/auth';
import { NotificationTapPayload } from '../../App';

interface Props {
  onSignOut: () => void;
  notificationTap?: NotificationTapPayload | null;
  onNotificationTapHandled?: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  task: '✅', waiting: '⏳', decision: '🤔', idea: '💡',
  concern: '⚠️', opportunity: '🚀', observation: '👁', reflection: '🪞', note: '📝',
};

const PRI_COLOR: Record<string, string> = {
  low: '#4ade80', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
};

export default function HomeScreen({ onSignOut, notificationTap, onNotificationTapHandled }: Props) {
  const [loops, setLoops]         = useState<LoopItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [capText, setCapText]     = useState('');
  const [capturing, setCapturing] = useState(false);
  // null = show all, 'high' = show only high/critical
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  // Highlighted loop ID from a notification tap (e.g. snooze wake-up)
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setLoops(await getLoops());
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) { onSignOut(); return; }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onSignOut]);

  useEffect(() => { load(); }, [load]);

  // React to notification taps from App.tsx
  useEffect(() => {
    if (!notificationTap) return;
    const { loop_id, filter } = notificationTap;

    if (filter === 'high') {
      setPriorityFilter('high');
    }
    if (loop_id) {
      const id = typeof loop_id === 'string' ? parseInt(loop_id, 10) : loop_id;
      setHighlightedId(id);
      // Clear highlight after 4 seconds
      setTimeout(() => setHighlightedId(null), 4000);
    }

    // Reload data so newly-woken loops appear
    load(true);
    onNotificationTapHandled?.();
  }, [notificationTap]);

  async function handleCapture() {
    const text = capText.trim();
    if (!text) return;
    setCapturing(true);
    try {
      await capture(text);
      setCapText('');
      await load(true);
    } catch (_) {
      Alert.alert('Error', 'Failed to capture. Try again.');
    } finally {
      setCapturing(false);
    }
  }

  async function handleResolve(id: number) {
    await resolveLoop(id);
    setLoops(l => l.filter(x => x.id !== id));
  }

  async function handleSnooze(id: number) {
    Alert.alert('Snooze', 'How long?', [
      { text: '1 day',  onPress: () => snoozeLoop(id, 1).then(() => setLoops(l => l.filter(x => x.id !== id))) },
      { text: '3 days', onPress: () => snoozeLoop(id, 3).then(() => setLoops(l => l.filter(x => x.id !== id))) },
      { text: '1 week', onPress: () => snoozeLoop(id, 7).then(() => setLoops(l => l.filter(x => x.id !== id))) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); onSignOut(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hlogo}>🧠</Text>
        <Text style={styles.htitle}>Loop</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.hbtn}>
          <Text style={styles.hbtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Capture */}
      <View style={styles.capRow}>
        <TextInput
          style={styles.capInput}
          placeholder="Capture anything…"
          placeholderTextColor="#555"
          value={capText}
          onChangeText={setCapText}
          multiline
          onSubmitEditing={handleCapture}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.capBtn, capturing && styles.disabled]}
          onPress={handleCapture}
          disabled={capturing}
        >
          {capturing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.capBtnText}>→</Text>}
        </TouchableOpacity>
      </View>

      {/* Priority filter chip */}
      {priorityFilter && (
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setPriorityFilter(null)}
        >
          <Text style={styles.filterChipText}>🔴 High priority  ✕</Text>
        </TouchableOpacity>
      )}

      {/* Loop list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a9eff" size="large" />
        </View>
      ) : loops.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyText}>Mental RAM is clear.</Text>
        </View>
      ) : (
        <FlatList
          data={loops.filter(l =>
            priorityFilter ? (l.priority === 'high' || l.priority === 'critical') : true
          )}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#4a9eff"
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.id === highlightedId && styles.cardHighlighted]}>
              <View style={styles.cardMain}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardMeta}>
                    <View style={[styles.priDot, { backgroundColor: PRI_COLOR[item.priority] ?? '#fbbf24' }]} />
                    <Text style={styles.metaText}>{item.priority}</Text>
                    <Text style={styles.metaSep}>·</Text>
                    <Text style={styles.metaText}>{item.days_old === 0 ? 'today' : `${item.days_old}d`}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleResolve(item.id)} style={styles.aBtn}>
                    <Text style={styles.aBtnText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSnooze(item.id)} style={styles.aBtn}>
                    <Text style={styles.aBtnText}>💤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#0d0d0d' },
  header:     { flexDirection: 'row', alignItems: 'center', padding: 16,
                borderBottomWidth: 1, borderBottomColor: '#252525' },
  hlogo:      { fontSize: 20, marginRight: 8 },
  htitle:     { fontSize: 18, fontWeight: '700', color: '#e4e4e4', flex: 1 },
  hbtn:       { borderWidth: 1, borderColor: '#252525', borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 4 },
  hbtnText:   { fontSize: 12, color: '#555' },

  capRow:     { flexDirection: 'row', padding: 12, gap: 8,
                borderBottomWidth: 1, borderBottomColor: '#252525' },
  capInput:   { flex: 1, backgroundColor: '#161616', borderWidth: 1,
                borderColor: '#252525', borderRadius: 8, color: '#e4e4e4',
                padding: 10, fontSize: 14, minHeight: 44 },
  capBtn:     { backgroundColor: '#4a9eff', borderRadius: 8,
                width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  capBtnText: { fontSize: 20, color: '#fff' },
  disabled:   { opacity: 0.5 },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontSize: 14, color: '#555' },

  filterChip: { margin: 12, marginBottom: 0, alignSelf: 'flex-start',
                backgroundColor: '#2a1a1a', borderWidth: 1, borderColor: '#f87171',
                borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipText: { color: '#f87171', fontSize: 13 },

  list:       { paddingBottom: 48 },
  card:       { paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  cardHighlighted: { backgroundColor: '#0d1f33', borderLeftWidth: 3, borderLeftColor: '#4a9eff' },
  cardMain:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardEmoji:  { fontSize: 18, paddingTop: 2 },
  cardBody:   { flex: 1 },
  cardTitle:  { fontSize: 14, fontWeight: '500', color: '#e4e4e4', marginBottom: 4 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priDot:     { width: 6, height: 6, borderRadius: 3 },
  metaText:   { fontSize: 12, color: '#555' },
  metaSep:    { fontSize: 12, color: '#333' },
  cardActions:{ flexDirection: 'row', gap: 6 },
  aBtn:       { borderWidth: 1, borderColor: '#252525', borderRadius: 6,
                padding: 6, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  aBtnText:   { fontSize: 13 },
});
