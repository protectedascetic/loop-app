import React, { useState } from 'react';
import {
  View, Text, Modal, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoopItem, resolveLoop, snoozeLoop, addNote, ApiError } from '../lib/api';
import { C, PRI_COLOR, PRI_BG } from '../theme';

interface Props {
  loop: LoopItem;
  onClose: () => void;
  onResolved: () => void;
}

export default function LoopDetailModal({ loop, onClose, onResolved }: Props) {
  const [notes, setNotes]         = useState<string[]>(loop.notes ?? []);
  const [noteText, setNoteText]   = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [snoozing, setSnoozing]   = useState(false);

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      await addNote(loop.id, text);
      setNotes(prev => [...prev, text]);
      setNoteText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add note. Please try again.');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleResolve() {
    Alert.alert(
      'Mark as Resolved',
      'This will close the loop and remove it from your list.',
      [
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            setResolving(true);
            try {
              await resolveLoop(loop.id);
              onResolved();
            } catch (e) {
              setResolving(false);
              Alert.alert('Error', 'Failed to resolve. Please try again.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  async function handleSnooze() {
    Alert.alert('Snooze', 'How long?', [
      {
        text: '1 day',
        onPress: async () => {
          setSnoozing(true);
          try { await snoozeLoop(loop.id, 1); onClose(); }
          catch (_) { Alert.alert('Error', 'Failed to snooze.'); }
          finally { setSnoozing(false); }
        },
      },
      {
        text: '3 days',
        onPress: async () => {
          setSnoozing(true);
          try { await snoozeLoop(loop.id, 3); onClose(); }
          catch (_) { Alert.alert('Error', 'Failed to snooze.'); }
          finally { setSnoozing(false); }
        },
      },
      {
        text: '1 week',
        onPress: async () => {
          setSnoozing(true);
          try { await snoozeLoop(loop.id, 7); onClose(); }
          catch (_) { Alert.alert('Error', 'Failed to snooze.'); }
          finally { setSnoozing(false); }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const priColor = PRI_COLOR[loop.priority] ?? C.amber;
  const priBg    = PRI_BG[loop.priority]    ?? C.amberLight;

  return (
    <Modal
      visible
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Drag handle */}
          <View style={styles.handleBar} />

          {/* Header row */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.loopEmoji}>{loop.emoji}</Text>
              <Text style={styles.loopType}>{loop.type}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.title}>{loop.title}</Text>

            {/* Meta row */}
            <View style={styles.metaRow}>
              <View style={[styles.priPill, { backgroundColor: priBg }]}>
                <Text style={[styles.priPillText, { color: priColor }]}>{loop.priority}</Text>
              </View>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaAge}>
                {loop.days_old === 0 ? 'opened today' : `${loop.days_old}d old`}
              </Text>
            </View>

            {/* Summary */}
            {!!loop.summary && (
              <Text style={styles.summary}>{loop.summary}</Text>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Notes section */}
            <Text style={styles.sectionLabel}>NOTES</Text>

            {notes.length === 0 ? (
              <Text style={styles.notesEmpty}>No notes yet. Add one below.</Text>
            ) : (
              notes.map((note, i) => (
                <View key={i} style={styles.noteItem}>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))
            )}

            {/* Add note input */}
            <View style={styles.addNoteRow}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note…"
                placeholderTextColor={C.subtle}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                returnKeyType="done"
                blurOnSubmit
              />
              <TouchableOpacity
                style={[styles.addNoteBtn, (!noteText.trim() || addingNote) && styles.disabled]}
                onPress={handleAddNote}
                disabled={!noteText.trim() || addingNote}
              >
                {addingNote
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addNoteBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Action buttons */}
            <TouchableOpacity
              style={[styles.resolveBtn, resolving && styles.disabled]}
              onPress={handleResolve}
              disabled={resolving || snoozing}
            >
              {resolving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.resolveBtnText}>Mark resolved</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.snoozeBtn, snoozing && styles.disabled]}
              onPress={handleSnooze}
              disabled={resolving || snoozing}
            >
              {snoozing
                ? <ActivityIndicator color={C.amber} size="small" />
                : <Text style={styles.snoozeBtnText}>💤  Snooze</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },

  // Drag handle
  handleBar: {
    width: 32,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loopEmoji: {
    fontSize: 22,
  },
  loopType: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'capitalize',
    backgroundColor: C.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
    borderRadius: 16,
  },
  closeBtnText: {
    fontSize: 20,
    color: C.muted,
    lineHeight: 24,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 4,
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
    lineHeight: 28,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  priPillText: {
    fontSize: 12,
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

  // Summary
  summary: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },

  // Notes
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.subtle,
    letterSpacing: 1,
    marginBottom: 10,
  },
  notesEmpty: {
    fontSize: 13,
    color: C.subtle,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  noteItem: {
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },

  // Add note
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  noteInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    minHeight: 44,
  },
  addNoteBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Action buttons
  resolveBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resolveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  snoozeBtn: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.amber,
  },
  snoozeBtnText: {
    color: C.amber,
    fontSize: 15,
    fontWeight: '600',
  },

  disabled: {
    opacity: 0.5,
  },
});
