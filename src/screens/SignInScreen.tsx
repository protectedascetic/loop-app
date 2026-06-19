/**
 * SignInScreen — warm, calm entry point. Google Sign-In.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogle } from '../lib/auth';
import { C, FONT, serifHeading, shadow } from '../theme';

interface Props { onSignedIn: () => void }

export default function SignInScreen({ onSignedIn }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.ok) onSignedIn();
    else if (!result.cancelled) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.top}>
        <View style={styles.mark}><Text style={styles.markText}>↺</Text></View>
        <Text style={serifHeading(34)}>Loop</Text>
        <Text style={styles.subtitle}>Capture. Resolve. Stay clear.</Text>
      </View>

      <View style={styles.bottom}>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.googleBtn, loading && styles.disabled]} onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={C.accent} size="small" /> : (
            <>
              <View style={styles.gIcon}><Text style={styles.gIconText}>G</Text></View>
              <Text style={styles.googleLabel}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.legal}>Your loops are private to your account.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 40 },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 76, height: 76, borderRadius: 22, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 22, ...shadow(3) },
  markText: { color: '#fff', fontSize: 40, fontFamily: FONT.serif },
  subtitle: { fontSize: 15, color: C.muted, marginTop: 10 },

  bottom: { gap: 14 },
  error: { color: C.red, fontSize: 13.5, textAlign: 'center' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, height: 54, ...shadow(2) },
  gIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  gIconText: { color: C.accentDeep, fontWeight: '800', fontSize: 14 },
  googleLabel: { fontSize: 15.5, fontWeight: '600', color: C.text },
  legal: { fontSize: 12, color: C.subtle, textAlign: 'center' },
  disabled: { opacity: 0.6 },
});
