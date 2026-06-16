import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBrain, BrainData, ApiError } from '../lib/api';
import { C } from '../theme';

export default function BrainScreen() {
  const [brain, setBrain]         = useState<BrainData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setBrain(await getBrain());
    } catch (e) {
      if (e instanceof ApiError) {
        setError('Failed to load brain summary.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingHeader}>
          <Text style={styles.headerTitle}>Brain</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !brain) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingHeader}>
          <Text style={styles.headerTitle}>Brain</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Something went wrong.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openCount    = brain.total - brain.journal;
  const staleCount   = brain.stale;
  const journalCount = brain.journal;

  const STAT_CARDS = [
    { label: 'Open Loops',      value: openCount    },
    { label: 'Stale',           value: staleCount   },
    { label: 'Journal Entries', value: journalCount },
    { label: 'Total',           value: brain.total  },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Brain</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={C.accent}
          />
        }
      >
        {/* Narrative block */}
        {!!brain.narrative && (
          <View style={styles.narrativeBlock}>
            <Text style={styles.narrativeText}>{brain.narrative}</Text>
          </View>
        )}

        {/* Stats grid */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Top attention loads */}
        {brain.top && brain.top.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TOP ATTENTION LOADS</Text>
            <View style={styles.attentionList}>
              {brain.top.map((item, index) => (
                <View key={index} style={styles.attentionItem}>
                  <Text style={styles.attentionEmoji}>{item.emoji}</Text>
                  <Text style={styles.attentionTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.scoreChip}>
                    <Text style={styles.scoreChipText}>{Math.round(item.score)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* By type breakdown */}
        {brain.by_type && Object.keys(brain.by_type).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>BY TYPE</Text>
            <View style={styles.byTypeList}>
              {Object.entries(brain.by_type)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <View key={type} style={styles.byTypeRow}>
                    <Text style={styles.byTypeLabel}>{type}</Text>
                    <View style={styles.byTypeBarWrapper}>
                      <View
                        style={[
                          styles.byTypeBar,
                          {
                            width: `${Math.min(100, (count / brain.total) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.byTypeCount}>{count}</Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  loadingHeader: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  header: {
    backgroundColor: C.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },

  // Center
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.accentLight,
    borderRadius: 8,
  },
  retryBtnText: {
    color: C.accent,
    fontWeight: '600',
    fontSize: 13,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 4,
  },

  // Narrative
  narrativeBlock: {
    backgroundColor: C.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  narrativeText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: C.muted,
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.subtle,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    minWidth: '44%',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: C.accent,
  },
  statLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Attention list
  attentionList: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  attentionEmoji: {
    fontSize: 18,
  },
  attentionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  scoreChip: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },

  // By type
  byTypeList: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  byTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  byTypeLabel: {
    fontSize: 13,
    color: C.text,
    width: 80,
    textTransform: 'capitalize',
  },
  byTypeBarWrapper: {
    flex: 1,
    height: 6,
    backgroundColor: C.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  byTypeBar: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  byTypeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    width: 24,
    textAlign: 'right',
  },
});
