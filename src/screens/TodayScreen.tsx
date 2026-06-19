/**
 * TodayScreen — the cockpit. Greeting + mental load, capture,
 * AI briefing, "needs you now" attention cards, recent momentum.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import {
  getToday, getBriefing, capture, TodayData, FocusItem, ApiError,
} from '../lib/api';
import { C, FONT, TYPE_EMOJI, serifHeading, shadow, dueMeta } from '../theme';
import { SectionLabel, Tag, Bar, LoadMeter, Skeletons, EmptyState, FadeIn, toast } from '../ui';

interface Props {
  onLoopTap: (id: number) => void;
  onUnauthorized: () => void;
  focusCapture?: boolean;
}

export default function TodayScreen({ onLoopTap, onUnauthorized, focusCapture }: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [capText, setCapText] = useState('');
  const [capturing, setCapturing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const d = await getToday();
      setData(d);
      setBriefing(null);
      getBriefing().then(b => setBriefing(b.text || '')).catch(() => setBriefing(''));
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) onUnauthorized();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (focusCapture) setTimeout(() => inputRef.current?.focus(), 350); }, [focusCapture]);

  async function handleCapture() {
    const text = capText.trim();
    if (!text) return;
    setCapturing(true);
    try {
      const r = await capture(text);
      setCapText('');
      const names = (r.created ?? []).map(c => `${c.emoji} ${c.title}`).join(', ');
      toast(names ? `Captured ${names}`.slice(0, 60) : 'Captured');
      load(true);
    } catch {
      toast('Capture failed — try again', true);
    } finally {
      setCapturing(false);
    }
  }

  const stateLine = (d: TodayData) => {
    const mood = d.open_count === 0 ? 'your mind is clear'
      : d.load < 0.4 ? 'mind is fairly clear'
      : d.load < 0.7 ? 'a full but manageable load'
      : 'carrying a lot right now';
    return mood;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      {/* Greeting */}
      <View style={styles.greet}>
        <Text style={serifHeading(29)}>{data ? `${data.greeting}, ${data.name}` : 'Hello'}</Text>
        {data && (
          <View style={styles.stateRow}>
            <Text style={styles.stateText}>{data.open_count} open loop{data.open_count === 1 ? '' : 's'}</Text>
            <View style={styles.loadPill}>
              <LoadMeter frac={data.load} />
              <Text style={styles.loadPillText}>{stateLine(data)}</Text>
            </View>
            {data.stale_count > 0 && <Text style={styles.aging}>· {data.stale_count} aging</Text>}
          </View>
        )}
      </View>

      {/* Capture */}
      <View style={styles.capture}>
        <TextInput
          ref={inputRef}
          style={styles.captureInput}
          placeholder="What's on your mind?"
          placeholderTextColor={C.subtle}
          value={capText}
          onChangeText={setCapText}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleCapture}
        />
        <TouchableOpacity style={[styles.send, capturing && { opacity: 0.5 }]} onPress={handleCapture} disabled={capturing} activeOpacity={0.85}>
          {capturing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>↑</Text>}
        </TouchableOpacity>
      </View>

      {/* Briefing */}
      {data && data.open_count > 0 && (
        <BriefingCard text={briefing} />
      )}

      {/* Needs you now */}
      <SectionLabel>Needs you now</SectionLabel>
      {loading ? <Skeletons n={3} height={86} /> :
        !data || data.focus.length === 0 ?
          <EmptyState emoji="✨" title="Nothing's pulling at you." sub="Your mental RAM is clear. Enjoy it." /> :
          data.focus.map((f, i) => <FocusCard key={f.id} item={f} rank={i + 1} max={Math.max(...data.focus.map(x => x.attn), 1)} onPress={() => onLoopTap(f.id)} />)
      }

      {/* Momentum */}
      <SectionLabel>Recent momentum</SectionLabel>
      {data && data.streak > 1 && (
        <View style={styles.streak}><Text style={styles.streakText}>🔥 {data.streak}-day closing streak</Text></View>
      )}
      {data && data.momentum.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
          {data.momentum.map((m, i) => (
            <View key={i} style={styles.momCard}>
              <Text style={styles.momCheck}>✓</Text>
              <Text style={styles.momText} numberOfLines={2}>{m.title}</Text>
              <Text style={styles.momWhen}>{m.days_ago === 0 ? 'today' : m.days_ago === 1 ? 'yesterday' : `${m.days_ago}d ago`}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.momEmpty}>Resolve a loop to start building momentum.</Text>
      )}
    </ScrollView>
  );
}

function BriefingCard({ text }: { text: string | null }) {
  const loadingState = text === null;
  return (
    <FadeIn style={styles.briefing}>
      <View style={styles.briefingBar} />
      <View style={styles.briefingHead}>
        <View style={styles.briefingGlyph}><Text style={{ fontSize: 13 }}>☼</Text></View>
        <Text style={styles.briefingTitle}>LOOP'S READ ON TODAY</Text>
      </View>
      {loadingState
        ? <Text style={styles.briefingMuted}>Reading your day…</Text>
        : text ? <Text style={styles.briefingText}>{text}</Text> : null}
    </FadeIn>
  );
}

function FocusCard({ item, rank, max, onPress }: { item: FocusItem; rank: number; max: number; onPress: () => void }) {
  return (
    <FadeIn delay={rank * 40}>
      <TouchableOpacity style={styles.focus} activeOpacity={0.75} onPress={onPress}>
        <View style={styles.focusRank}><Text style={styles.focusRankText}>{rank}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.focusTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.focusMeta}>
            <Tag type={item.type} label={`${TYPE_EMOJI[item.type] ?? '📌'} ${item.type}`} />
            <Text style={styles.focusAge}>{item.days_old === 0 ? 'today' : `${item.days_old}d old`}</Text>
            {(() => { const dm = dueMeta(item.due_days); return dm
              ? <View style={{ backgroundColor: dm.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}><Text style={{ fontSize: 11, fontWeight: '700', color: dm.fg }}>{dm.label}</Text></View>
              : null; })()}
            {item.stale && <Text style={styles.focusAging}>· aging</Text>}
          </View>
          <View style={{ marginTop: 10 }}><Bar pct={(item.attn / max) * 100} /></View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.focusScore}>{item.attn}</Text>
          <Text style={styles.focusScoreLabel}>LOAD</Text>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },

  greet: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 4 },
  stateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stateText: { fontSize: 14.5, color: C.muted },
  loadPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11, ...shadow(1) },
  loadPillText: { fontSize: 12.5, fontWeight: '600', color: C.muted },
  aging: { fontSize: 13.5, color: C.orange, fontWeight: '600' },

  capture: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, marginTop: 16, ...shadow(2) },
  captureInput: { flex: 1, fontSize: 15.5, color: C.text, paddingVertical: 12, maxHeight: 140 },
  send: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', ...shadow(2) },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '600' },

  briefing: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, paddingLeft: 22, marginTop: 22, overflow: 'hidden', ...shadow(2) },
  briefingBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.clay },
  briefingHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  briefingGlyph: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.claySoft, alignItems: 'center', justifyContent: 'center' },
  briefingTitle: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: C.clay },
  briefingText: { fontFamily: FONT.serif, fontSize: 16.5, lineHeight: 27, color: C.text },
  briefingMuted: { fontSize: 13.5, color: C.subtle, fontStyle: 'italic' },

  focus: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 15, marginBottom: 10, ...shadow(1) },
  focusRank: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  focusRankText: { fontFamily: FONT.serif, fontSize: 16, color: C.accentDeep },
  focusTitle: { fontSize: 15.5, fontWeight: '600', color: C.text, lineHeight: 21 },
  focusMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  focusAge: { fontSize: 12.5, color: C.muted },
  focusAging: { fontSize: 12.5, color: C.orange, fontWeight: '600' },
  focusScore: { fontFamily: FONT.serif, fontSize: 20, color: C.clay },
  focusScoreLabel: { fontSize: 9, letterSpacing: 0.8, color: C.subtle, marginTop: 3 },

  streak: { alignSelf: 'flex-start', backgroundColor: C.claySoft, borderWidth: 1, borderColor: '#F1DCC9', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 13, marginBottom: 12 },
  streakText: { fontSize: 13, fontWeight: '600', color: C.clay },
  momCard: { width: 180, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: '#DCEEE1', borderRadius: 16, padding: 13 },
  momCheck: { color: C.green, fontSize: 15 },
  momText: { fontSize: 13.5, fontWeight: '600', color: C.text, marginTop: 6, lineHeight: 18 },
  momWhen: { fontSize: 11.5, color: C.green, fontWeight: '600', marginTop: 6 },
  momEmpty: { fontSize: 13.5, color: C.subtle, paddingVertical: 12 },
});
