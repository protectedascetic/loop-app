import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLoops, LoopItem, ApiError } from '../lib/api';
import { C } from '../theme';

interface Props {
  onLoopTap?: (loop: LoopItem) => void;
}

export default function JournalScreen({ onLoopTap }: Props) {
  const [entries, setEntries]     = useState<LoopItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const all = await getLoops();
      setEntries(all.filter(l => l.is_journal));
    } catch (e) {
      if (e instanceof ApiError) {
        setError('Failed to load journal entries.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Journal</Text>
          {!loading && (
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{entries.length} entries</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>No journal entries yet.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={C.accent}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onLoopTap?.(item)}
              style={styles.card}
            >
              <View style={styles.cardBorder} />
              <View style={styles.cardContent}>
                {/* Title row */}
                <View style={styles.titleRow}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                {/* Summary */}
                {!!item.summary && (
                  <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>
                )}
                {/* Meta row */}
                <View style={styles.metaRow}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{item.type}</Text>
                  </View>
                  <Text style={styles.metaSep}>·</Text>
                  <Text style={styles.metaAge}>
                    {item.days_old === 0 ? 'today' : `${item.days_old}d ago`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  countChip: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.accent,
  },

  // Center (loading / empty / error)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
  },
  errorText: {
    fontSize: 14,
    color: C.red,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
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
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
  },
  cardBorder: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: C.border,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 2,
  },
  cardEmoji: {
    fontSize: 16,
    paddingTop: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  // Summary
  cardSummary: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 2,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  typePill: {
    backgroundColor: C.surface2,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },
  metaSep: {
    fontSize: 12,
    color: C.subtle,
  },
  metaAge: {
    fontSize: 12,
    color: C.muted,
  },
});
