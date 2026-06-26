/**
 * NotesScreen — long-form dated artefacts. A note is kept whole; the AI pulls
 * out *your* tasks (linked to Loops) and attributes the rest to other people.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import {
  getNotes, getNote, createNote, deleteNote,
  NoteItem, NoteDetail, ApiError,
} from '../lib/api';
import { C, FONT, serifHeading, shadow } from '../theme';
import { Skeletons, EmptyState, FadeIn, toast } from '../ui';

interface Props { onUnauthorized: () => void; onOpenLoop?: (id: number) => void }

export default function NotesScreen({ onUnauthorized, onOpenLoop }: Props) {
  const [notes, setNotes] = useState<NoteItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<NoteDetail | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setNotes(null);
    try { setNotes((await getNotes()).notes); }
    catch (e) { if (e instanceof ApiError && e.isUnauthorized) onUnauthorized(); setNotes([]); }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() { setRefreshing(true); await load(true); setRefreshing(false); }

  async function save() {
    const text = body.trim();
    if (!text) { toast('Write something first', true); return; }
    setSaving(true);
    try {
      const d = await createNote(text, title.trim() || undefined);
      const n = d.created_loops?.length ?? 0;
      toast(n ? `Note saved · ${n} task${n === 1 ? '' : 's'} added` : 'Note saved');
      setTitle(''); setBody('');
      load(true);
    } catch { toast('Failed to save', true); }
    finally { setSaving(false); }
  }

  async function open(id: number) {
    setOpenId(id); setDetail(null);
    try { setDetail(await getNote(id)); }
    catch { toast('Failed to open', true); setOpenId(null); }
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete note?', 'Tasks already added to Loops will stay.', [
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteNote(id); toast('Note deleted'); setOpenId(null); setDetail(null); load(true); }
        catch { toast('Failed', true); }
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Detail view ──
  if (openId !== null) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => { setOpenId(null); setDetail(null); }}>
          <Text style={styles.back}>← All notes</Text>
        </TouchableOpacity>
        {!detail ? <View style={{ marginTop: 12 }}><Skeletons n={2} height={40} /></View> : (
          <FadeIn>
            <Text style={serifHeading(23)}>{detail.title}</Text>
            <Text style={styles.detailDate}>{detail.created_at}</Text>
            {!!detail.summary && <Text style={styles.detailSum}>{detail.summary}</Text>}

            {detail.linked_loops.length > 0 && <>
              <Text style={styles.sub}>YOUR TASKS · ADDED TO LOOPS</Text>
              {detail.linked_loops.map(l => (
                <TouchableOpacity key={l.id} style={styles.task} onPress={() => onOpenLoop?.(l.id)}>
                  <Text style={styles.taskText}>{l.emoji} {l.title}{l.status !== 'open' ? '  ✓' : ''}</Text>
                </TouchableOpacity>
              ))}
            </>}

            {detail.items.filter(i => (i.owner || '').toLowerCase() !== 'me').length > 0 && <>
              <Text style={styles.sub}>MENTIONED · OTHERS</Text>
              {detail.items.filter(i => (i.owner || '').toLowerCase() !== 'me').map((it, i) => (
                <View key={i} style={styles.other}>
                  <Text style={styles.otherText}><Text style={styles.otherName}>{it.owner}</Text>  ·  {it.title}</Text>
                </View>
              ))}
            </>}

            <Text style={styles.sub}>THE NOTE</Text>
            <View style={styles.bodyBox}><Text style={styles.bodyText}>{detail.body}</Text></View>

            <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(detail.id)}>
              <Text style={styles.delText}>Delete note</Text>
            </TouchableOpacity>
          </FadeIn>
        )}
      </ScrollView>
    );
  }

  // ── List + compose ──
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <Text style={styles.intro}>Meetings, brain-dumps and docs — kept whole, with your tasks pulled out.</Text>

      <View style={styles.compose}>
        <TextInput style={styles.titleIn} placeholder="Title (optional)" placeholderTextColor={C.subtle} value={title} onChangeText={setTitle} />
        <TextInput style={styles.bodyIn} placeholder="Paste or write a note — a meeting recap, brain-dump, a doc…" placeholderTextColor={C.subtle} value={body} onChangeText={setBody} multiline />
        <View style={styles.composeRow}>
          <Text style={styles.hint}>Kept verbatim · tasks auto-extracted</Text>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save note</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {notes === null ? <Skeletons n={3} height={84} />
        : notes.length === 0 ? <EmptyState emoji="📓" title="No notes yet." sub="Paste a meeting recap or brain-dump — it stays whole, and your tasks get pulled out." />
        : notes.map((n, i) => (
          <FadeIn key={n.id} delay={i * 40}>
            <TouchableOpacity style={styles.card} onPress={() => open(n.id)} activeOpacity={0.7}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.cardDate}>{n.days_old === 0 ? 'today' : `${n.days_old}d ago`}</Text>
              </View>
              <Text style={styles.cardSum} numberOfLines={2}>{n.summary || n.snippet}</Text>
              <View style={styles.cardMeta}>
                {n.task_count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{n.task_count} task{n.task_count === 1 ? '' : 's'} for you</Text></View>}
                {n.item_count > 0 && <Text style={styles.metaDim}>{n.item_count} item{n.item_count === 1 ? '' : 's'} noted</Text>}
              </View>
            </TouchableOpacity>
          </FadeIn>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 48 },
  intro: { fontSize: 14, color: C.muted, marginBottom: 14 },

  compose: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 18, ...shadow(1) },
  titleIn: { fontFamily: FONT.serif, fontSize: 18, color: C.text, paddingVertical: 4 },
  bodyIn: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, fontSize: 14.5, color: C.text, minHeight: 96, marginTop: 8, textAlignVertical: 'top' },
  composeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  hint: { fontSize: 11.5, color: C.subtle, flex: 1 },
  saveBtn: { backgroundColor: C.accent, borderRadius: 11, paddingHorizontal: 18, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10, ...shadow(1) },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontFamily: FONT.serif, fontSize: 17, color: C.text, flex: 1 },
  cardDate: { fontSize: 12, color: C.subtle },
  cardSum: { fontSize: 13.5, color: C.muted, marginTop: 4, lineHeight: 19 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  badge: { backgroundColor: C.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: C.accentDeep },
  metaDim: { fontSize: 12, color: C.subtle },

  back: { color: C.accent, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  detailDate: { fontSize: 13, color: C.subtle, marginTop: 4, marginBottom: 12 },
  detailSum: { fontFamily: FONT.serif, fontSize: 16, color: C.muted, lineHeight: 24, marginBottom: 6 },
  sub: { fontSize: 11, fontWeight: '700', color: C.subtle, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  task: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, marginBottom: 6 },
  taskText: { fontSize: 14, color: C.text },
  other: { backgroundColor: C.surface2, borderRadius: 10, padding: 10, marginBottom: 6 },
  otherText: { fontSize: 13.5, color: C.muted },
  otherName: { color: C.clay, fontWeight: '700' },
  bodyBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 15 },
  bodyText: { fontSize: 14.5, color: C.text, lineHeight: 24 },
  delBtn: { marginTop: 18, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  delText: { color: C.red, fontSize: 13.5, fontWeight: '600' },
});
