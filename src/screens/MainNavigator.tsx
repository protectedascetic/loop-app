import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme';
import HomeScreen from './HomeScreen';
import JournalScreen from './JournalScreen';
import BrainScreen from './BrainScreen';
import LoopDetailModal from './LoopDetailModal';
import { LoopItem } from '../lib/api';
import { NotificationTapPayload } from '../../App';

interface Props {
  onSignOut: () => void;
  notificationTap?: NotificationTapPayload | null;
  onNotificationTapHandled?: () => void;
}

type Tab = 'home' | 'journal' | 'brain';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',    label: 'Loops',   icon: '⚡' },
  { id: 'journal', label: 'Journal', icon: '📓' },
  { id: 'brain',   label: 'Brain',   icon: '🧠' },
];

export default function MainNavigator({ onSignOut, notificationTap, onNotificationTapHandled }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedLoop, setSelectedLoop] = useState<LoopItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function onLoopResolved() {
    setSelectedLoop(null);
    setRefreshKey(k => k + 1);
  }

  return (
    <View style={styles.root}>
      {/* Screen area */}
      <View style={styles.screen}>
        {activeTab === 'home' && (
          <HomeScreen
            key={refreshKey}
            onSignOut={onSignOut}
            onLoopTap={setSelectedLoop}
            notificationTap={notificationTap}
            onNotificationTapHandled={onNotificationTapHandled}
          />
        )}
        {activeTab === 'journal' && (
          <JournalScreen onLoopTap={setSelectedLoop} />
        )}
        {activeTab === 'brain' && (
          <BrainScreen />
        )}
      </View>

      {/* Bottom tab bar */}
      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>

      {/* Loop detail modal */}
      {selectedLoop && (
        <LoopDetailModal
          loop={selectedLoop}
          onClose={() => setSelectedLoop(null)}
          onResolved={onLoopResolved}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  screen:       { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  tabItem:      { flex: 1, alignItems: 'center', paddingBottom: 4, position: 'relative' },
  tabIcon:      { fontSize: 20 },
  tabLabel:     { fontSize: 10, fontWeight: '600', color: C.muted, marginTop: 2, letterSpacing: 0.3 },
  tabLabelActive: { color: C.accent },
  tabIndicator: {
    position: 'absolute', top: -8, width: 28, height: 3,
    backgroundColor: C.accent, borderRadius: 2,
  },
});
