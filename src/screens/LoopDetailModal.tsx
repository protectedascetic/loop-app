/**
 * LoopDetailModal — full loop view: summary, notes, add-note, resolve, snooze.
 */
import React, { useState } from 'react';
import {
  View, Text, Modal, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LoopItem, resolveLoop, snoozeLoop, snoozeUntil, addNote, setDue } from '../lib/api';
import { C, FONT, TYPE_EMOJI, PRI_COLOR, serifHeading, shadow, dueDateIn, dueWeekend, localYMD } from '../theme';
import { Tag, toast } from '../ui';

interface Props {
  loop: LoopItem;
  onClose: () => void;
  onResolved: () => void;
}

export default function LoopDetailModal({ loop, onClose, onResolved }: Props) {
  const [notes, setNotes] = useState<string[]>(loop.notes ?? []);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [due, setDueState] = useState<string | null>(loop.due_at);
  const [pickerMode, setPickerMode] = useState<null | 'due' | 'snooze'>(null);

  async function applyDue(iso: string | null) {
    setDueState(iso);
    try { await setDue(loop.id, iso); toast(iso ? 'Due date set' : 'Due date cleared'); }
    catch { toast('Failed to set due date', true); }
  }

  function onPickDate(event: { type: string }, date?: Date) {
    const mode = pickerMode;
    setPickerMode(null);
    if (event.type !== 'set' || !date) return;
    const iso = localYMD(date);
    if (mode === 'due') applyDue(iso);
    else if (mode === 'snooze') doSnoozeUntil(iso);
  }
  async function doSnoozeUntil(ymd: string) {
    try { await snoozeUntil(loop.id, `${ymd}T09:00:00`); toast(`Snoozed to ${ymd} ☾`); onResolved(); }
    catch { toast('Failed to snooze', true); }
  }

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      await addNote(loop.id, text);
      setNotes(prev => [...prev, text]);
      setNoteText('');
      toast('Note saved ✎');
    } catch {
      toast('Failed to add note', true);
    } finally {
      setAddingNote(false);
    }
  }

  async function handleResolve() {
    setResolving(true);
    try { await resolveLoop(loop.id); toast('Resolved ✓'); onResolved(); }
    catch { setResolving(false); toast('Failed to resolve', true); }
  }

  function handleSnooze() {
    Alert.alert('Snooze this loop', 'Come back to it in…', [
      { text: '1 day', onPress: () => doSnooze(1) },
      { text: '3 days', onPress: () => doSnooze(3) },
      { text: '1 week', onPress: () => doSnooze(7) },
      { text: 'Pick a date…', onPress: () => setPickerMode('snooze') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  async function doSnooze(days: number) {
    try { await snoozeLoop(loop.id, days); toast(`Snoozed ${days}d ☾`); onResolved(); }
    catch { toast('Failed to snooze', true); }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerEmoji}>{TYPE_EMOJI[loop.type] ?? loop.emoji ?? '📌'}</Text>
              <Tag type={loop.type} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={serifHeading(23)}>{loop.title}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.priDot, { backgroundColor: PRI_COLOR[loop.priority] ?? C.amber }]} />
              <Text style={styles.metaText}>{loop.priority} priority</Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={[styles.metaText, loop.stale && { color: C.orange, fontWeight: '600' }]}>
                {loop.days_old === 0 ? 'opened today' : `${loop.days_old}d old`}{loop.stale ? ' · aging' : ''}
              </Text>
            </View>

            {!!loop.summary && <Text style={styles.summary}>{loop.summary}</Text>}

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>DUE DATE{due ? `  ·  ${due}` : ''}</Text>
            <View style={styles.dueRow}>
              {[['Today', dueDateIn(0)], ['Tomorrow', dueDateIn(1)], ['Weekend', dueWeekend()], ['Next week', dueDateIn(7)]].map(([label, iso]) => (
                <TouchableOpacity key={label} style={styles.dueBtn} onPress={() => applyDue(iso)}>
                  <Text style={styles.dueBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.dueBtn} onPress={() => setPickerMode('due')}>
                <Text style={styles.dueBtnText}>📅 Pick date</Text>
              </TouchableOpacity>
              {due && (
                <TouchableOpacity style={styles.dueBtn} onPress={() => applyDue(null)}>
                  <Text style={[styles.dueBtnText, { color: C.red }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {pickerMode && (
              <DateTimePicker value={due ? new Date(due) : new Date()} mode="date" minimumDate={new Date()} onChange={onPickDate} />
            )}

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>NOTES</Text>
            {notes.length === 0
              ? <Text style={styles.notesEmpty}>No notes yet. Add a thought, update, or next step.</Text>
              : notes.map((n, i) => <View key={i} style={styles.note}><Text style={styles.noteText}>{n}</Text></View>)}

            <View style={styles.addRow}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note…"
                placeholderTextColor={C.subtle}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleAddNote}
              />
              <TouchableOpacity style={[styles.addBtn, (!noteText.trim() || addingNote) && styles.disabled]} onPress={handleAddNote} disabled={!noteText.trim() || addingNote}>
                {addingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />
            <TouchableOpacity style={[styles.resolveBtn, resolving && styles.disabled]} onPress={handleResolve} disabled={resolving}>
              {resolving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resolveText}>Mark resolved</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} disabled={resolving}>
              <Text style={styles.snoozeText}>☾  Snooze</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  handle: { width: 36, height: 4, backgroundColor: C.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 22 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2, borderRadius: 16 },
  closeText: { fontSize: 22, color: C.muted, lineHeight: 26 },

  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  priDot: { width: 9, height: 9, borderRadius: 5 },
  metaText: { fontSize: 13, color: C.muted, textTransform: 'capitalize' },
  metaSep: { fontSize: 13, color: C.subtle },
  summary: { fontFamily: FONT.serif, fontSize: 16, color: C.muted, lineHeight: 25, marginTop: 14 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.subtle, letterSpacing: 1, marginBottom: 10 },
  dueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueBtn: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8 },
  dueBtnText: { fontSize: 13, fontWeight: '600', color: C.muted },
  notesEmpty: { fontSize: 13.5, color: C.subtle, fontStyle: 'italic' },
  note: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, marginBottom: 6 },
  noteText: { fontSize: 14, color: C.text, lineHeight: 20 },

  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  noteInput: { flex: 1, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.text, minHeight: 44, maxHeight: 120 },
  addBtn: { backgroundColor: C.accent, borderRadius: 11, paddingHorizontal: 18, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  resolveBtn: { backgroundColor: C.green, borderRadius: 13, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...shadow(1) },
  resolveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  snoozeBtn: { borderRadius: 13, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.amber },
  snoozeText: { color: '#9A7415', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
