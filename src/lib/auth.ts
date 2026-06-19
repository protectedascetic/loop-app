/**
 * Google Sign-In + Firebase auth utilities.
 *
 * Uses @react-native-google-signin/google-signin.
 * The WEB_CLIENT_ID comes from your Firebase console:
 *   Authentication → Sign-in method → Google → Web client ID
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { login as apiLogin, clearToken, LoginResponse } from './api';

// ── Config ────────────────────────────────────────────────────────────────────

export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({
    webClientId,
    // Request the user's ID token (needed for Firebase verification on backend)
    scopes: ['profile', 'email'],
  });
}

// ── Sign in ───────────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; data: LoginResponse; isNew: boolean }
  | { ok: false; cancelled: boolean; error: string };

export async function signInWithGoogle(fcmToken?: string): Promise<AuthResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();

    // Get the Firebase ID token
    const { idToken } = await GoogleSignin.getTokens();
    if (!idToken) return { ok: false, cancelled: false, error: 'No ID token returned' };

    const data = await apiLogin(idToken, fcmToken);
    return { ok: true, data, isNew: data.is_new_user };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, cancelled: true, error: 'Cancelled' };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return { ok: false, cancelled: false, error: 'Sign-in already in progress' };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { ok: false, cancelled: false, error: 'Google Play Services not available' };
    }
    console.error('Google Sign-In error:', error);
    return { ok: false, cancelled: false, error: error.message ?? 'Unknown error' };
  }
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch (_) {
    // best-effort
  }
  await clearToken();
}

// ── Check signed in ───────────────────────────────────────────────────────────

export async function isSignedIn(): Promise<boolean> {
  // google-signin v14 removed isSignedIn(); getCurrentUser() is the replacement.
  return GoogleSignin.getCurrentUser() !== null;
}
