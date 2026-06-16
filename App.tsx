/**
 * Loop — root component.
 * Handles auth state: shows SignInScreen or the main app.
 *
 * Before first run:
 *   1. Set EXPO_PUBLIC_API_URL in .env.local
 *   2. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID from Firebase console
 *   3. Run `npx expo install` to install new deps
 *   4. Build with EAS: `eas build --profile development --platform android`
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { configureGoogleSignIn } from './src/lib/auth';
import { getToken, updateFcmToken } from './src/lib/api';
import SignInScreen from './src/screens/SignInScreen';
import HomeScreen from './src/screens/HomeScreen';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);

  // Configure Google Sign-In once
  useEffect(() => {
    configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);
  }, []);

  // Check for existing JWT on app start
  useEffect(() => {
    (async () => {
      const token = await getToken();
      setAuthed(!!token);
      setChecking(false);
    })();
  }, []);

  // Register for push notifications and sync FCM token on login
  useEffect(() => {
    if (authed) registerForPushNotifications();
  }, [authed]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#4a9eff" size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!authed) {
    return (
      <>
        <SignInScreen onSignedIn={() => setAuthed(true)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <HomeScreen onSignOut={() => setAuthed(false)} />
      <StatusBar style="light" />
    </>
  );
}

async function registerForPushNotifications() {
  if (!Device.isDevice) return; // skip in simulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // Expo push token (Expo wraps FCM on Android)
  try {
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    if (expoPushToken) await updateFcmToken(expoPushToken);
  } catch (_) {
    // non-critical
  }
}
