import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { signInWithGoogle } from '../lib/auth';
import { C } from '../theme';

interface Props {
  onSignedIn: () => void;
}

export default function SignInScreen({ onSignedIn }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.ok) {
      onSignedIn();
    } else if (!result.cancelled) {
      setError(result.error);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.top}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>↺</Text>
        </View>
        <Text style={styles.title}>Loop</Text>
        <Text style={styles.subtitle}>Capture. Resolve. Stay clear.</Text>
      </View>

      <View style={styles.bottom}>
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.disabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={C.accent} size="small" />
          ) : (
            <>
              <View style={styles.gIconBox}>
                <Text style={styles.gIconText}>G</Text>
              </View>
              <Text style={styles.googleLabel}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing, you agree to use this app responsibly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  top: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: C.text,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  bottom: {
    gap: 12,
  },
  error: {
    color: C.red,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  googleBtn: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: C.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  disabled: {
    opacity: 0.6,
  },
  gIconBox: {
    width: 28,
    height: 28,
    backgroundColor: C.accentLight,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gIconText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.accent,
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  legal: {
    fontSize: 11,
    color: C.subtle,
    textAlign: 'center',
  },
});
