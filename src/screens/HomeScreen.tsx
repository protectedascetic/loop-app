/**
 * HomeScreen — main Loop UI.
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
import { C, PRI_COLOR, PRI_BG } from '../theme';

interface Props {
  onSignOut: () => void;
  notificationTap?: NotificationTapPayload | null;
  onNotificationTapHandled?: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  task: '✅', waiting: '⏳', decision: '🤔', idea: '💡',
  concern: '⚠️', opportunity: '🚀', observation: '👁', reflection: '🪞', note: '📝',
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Loop</Text>
          <Text style={styles.headerCount}>{loops.length} open</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Capture card */}
      <View style={styles.captureCard}>
        <TextInput
          style={styles.captureInput}
          placeholder="Capture anything…"
          placeholderTextColor={C.muted}
          value={capText}
          onChangeText={setCapText}
          multiline
          onSubmitEditing={handleCapture}
          returnKeyType="send"
          blurOnSubmit
        />
        <View style={styles.captureRow}>
          <Text style={[styles.captureFeedback, capturing ? styles.captureFeedbackActive : null]}>
            {capturing ? 'Saving…' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.sendBtn, capturing && styles.disabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            {capturing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnText}>→</Text>}
          </TouchableOpacity>
        </View>
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
          <ActivityIndicator color={C.accent} size="large" />
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
              tintColor={C.accent}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.id === highlightedId && styles.cardHighlighted]}>
              <View style={[styles.priBar, { backgroundColor: PRI_COLOR[item.priority] ?? C.amber }]} />
              <View style={styles.cardContent}>
                {/* Title row */}
                <View style={styles.titleRow}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                {/* Meta row */}
                <View style={styles.metaRow}>
                  <View style={[styles.priPill, { backgroundColor: PRI_BG[item.priority] ?? C.amberLight }]}>
                    <Text style={[styles.priPillText, { color: PRI_COLOR[item.priority] ?? C.amber }]}>
                      {item.priority}
                    </Text>
                  </View>
                  <Text style={styles.metaSep}>·</Text>
                  <Text style={styles.metaAge}>
                    {item.days_old === 0 ? 'today' : `${item.days_old}d`}
                  </Text>
                </View>
                {/* Actions row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => handleResolve(item.id)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSnooze(item.id)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>💤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    backgroundColor: C.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  headerCount: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signOutText: {
    fontSize: 12,
    color: C.muted,
  },

  // Capture card
  captureCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: C.border,
  },
  captureInput: {
    fontSize: 15,
    color: C.text,
    minHeight: 44,
  },
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  captureFeedback: {
    fontSize: 12,
    color: C.green,
  },
  captureFeedbackActive: {
    color: C.green,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },

  // Filter chip
  filterChip: {
    backgroundColor: C.accentLight,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    color: C.accent,
    fontSize: 13,
  },

  // Center (loading / empty)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
  },
  cardHighlighted: {
    backgroundColor: C.accentLight,
  },
  priBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  cardEmoji: {
    fontSize: 18,
    paddingTop: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaSep: {
    fontSize: 12,
    color: C.subtle,
  },
  metaAge: {
    fontSize: 12,
    color: C.muted,
  },

  // Actions row
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
  },
});
