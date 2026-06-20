/**
 * MainNavigator — shared header + 4 spaces (Today / Loops / Journal / Brain),
 * capture FAB, detail modal, toast host. Custom tab switcher (no nav deps).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TodayScreen from './TodayScreen';
import LoopsScreen from './LoopsScreen';
import JournalScreen from './JournalScreen';
import ReadingScreen from './ReadingScreen';
import BrainScreen from './BrainScreen';
import LoopDetailModal from './LoopDetailModal';
import { useShareIntent } from 'expo-share-intent';
import { LoopItem, capture, captureImage } from '../lib/api';
import { signOut } from '../lib/auth';
import { NotificationTapPayload } from '../../App';
import { C, FONT, shadow } from '../theme';
import { ToastHost, toast } from '../ui';

interface Props {
  onSignOut: () => void;
  notificationTap?: NotificationTapPayload | null;
  onNotificationTapHandled?: () => void;
}

type Tab = 'today' | 'loops' | 'journal' | 'reading' | 'brain';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'loops', label: 'Loops' },
  { id: 'journal', label: 'Journal' },
  { id: 'reading', label: 'Reading' },
  { id: 'brain', label: 'Brain' },
];

export default function MainNavigator({ onSignOut, notificationTap, onNotificationTapHandled }: Props) {
  const [tab, setTab] = useState<Tab>('today');
  const [nonce, setNonce] = useState(0);          // bump → remount active screen to reload
  const [selected, setSelected] = useState<LoopItem | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [focusCapture, setFocusCapture] = useState(false);

  // Android/iOS share sheet → capture shared text/links (images: coming soon)
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: true });
  useEffect(() => {
    if (!hasShareIntent) return;
    (async () => {
      const text = shareIntent.webUrl || shareIntent.text;
      const img = (shareIntent.files || []).find(f => (f.mimeType || '').startsWith('image/'));
      if (text) {
        try {
          await capture(text);
          toast('Captured from share ✓');
          setTab('loops'); setNonce(n => n + 1);
        } catch { toast('Couldn’t capture the shared item', true); }
      } else if (img) {
        try {
          toast('Reading image…');
          await captureImage({ uri: img.path, name: img.fileName || 'image.jpg', type: img.mimeType || 'image/jpeg' });
          toast('Captured from image ✓');
          setTab('loops'); setNonce(n => n + 1);
        } catch { toast('Couldn’t capture the image', true); }
      }
      resetShareIntent();
    })();
  }, [hasShareIntent]);

  // Notification tap → jump to Loops and highlight the loop
  useEffect(() => {
    if (!notificationTap) return;
    setTab('loops');
    setNonce(n => n + 1);
    if (notificationTap.loop_id != null) {
      const id = typeof notificationTap.loop_id === 'string' ? parseInt(notificationTap.loop_id, 10) : notificationTap.loop_id;
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 3000);
    }
    onNotificationTapHandled?.();
  }, [notificationTap]);

  function go(t: Tab) {
    setFocusCapture(false);
    setTab(t);
    setNonce(n => n + 1);
  }

  function onResolvedFromModal() {
    setSelected(null);
    setNonce(n => n + 1);
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Sign out of Loop?', [
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); onSignOut(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const screenKey = `${tab}-${nonce}`;
  const onUnauthorized = onSignOut;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Shared header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.mark}><Text style={styles.markText}>↺</Text></View>
          <Text style={styles.wordmark}>Loop</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar — scrolls horizontally if it doesn't fit */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => go(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active screen */}
      <View style={styles.screen}>
        {tab === 'today' && <TodayScreen key={screenKey} onLoopTap={(id) => { setTab('loops'); setNonce(n => n + 1); setHighlightId(id); setTimeout(() => setHighlightId(null), 3000); }} onUnauthorized={onUnauthorized} focusCapture={focusCapture} />}
        {tab === 'loops' && <LoopsScreen key={screenKey} onOpenLoop={setSelected} onUnauthorized={onUnauthorized} highlightId={highlightId} />}
        {tab === 'journal' && <JournalScreen key={screenKey} onUnauthorized={onUnauthorized} />}
        {tab === 'reading' && <ReadingScreen key={screenKey} onUnauthorized={onUnauthorized} />}
        {tab === 'brain' && <BrainScreen key={screenKey} onUnauthorized={onUnauthorized} />}
      </View>

      {/* Capture FAB (everywhere except Today, which has the inline capture) */}
      {tab !== 'today' && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => { setTab('today'); setNonce(n => n + 1); setFocusCapture(true); }}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {selected && <LoopDetailModal loop={selected} onClose={() => { setSelected(null); setNonce(n => n + 1); }} onResolved={onResolvedFromModal} />}
      <ToastHost />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  mark: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  markText: { color: '#fff', fontSize: 16, fontFamily: FONT.serif },
  wordmark: { fontSize: 19, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  signOut: { borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  signOutText: { fontSize: 12.5, color: C.muted, fontWeight: '500' },

  tabsScroll: { flexGrow: 0, paddingBottom: 8 },
  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  tab: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  tabActive: { backgroundColor: C.text, ...shadow(1) },
  tabText: { fontSize: 14, fontWeight: '600', color: C.subtle },
  tabTextActive: { color: C.bg },

  screen: { flex: 1 },

  fab: { position: 'absolute', right: 18, bottom: 24, width: 54, height: 54, borderRadius: 17, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', ...shadow(3) },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
});
