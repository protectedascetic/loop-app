import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { signInWithGoogle } from '../lib/auth';

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
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      <View style={styles.hero}>
        <Text style={styles.logo}>🧠</Text>
        <Text style={styles.title}>Loop</Text>
        <Text style={styles.subtitle}>Capture. Resolve. Stay clear.</Text>
      </View>

      <View style={styles.actions}>
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.disabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
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
    backgroundColor: '#0d0d0d',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#e4e4e4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    letterSpacing: 0.5,
  },
  actions: {
    gap: 12,
  },
  googleBtn: {
    backgroundColor: '#4a9eff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  legal: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
});
