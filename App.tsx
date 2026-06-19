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

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { configureGoogleSignIn } from './src/lib/auth';
import { getToken, updateFcmToken } from './src/lib/api';
import SignInScreen from './src/screens/SignInScreen';
import MainNavigator from './src/screens/MainNavigator';

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

export type NotificationTapPayload = {
  screen?: string;
  loop_id?: number | string;
  filter?: string;
};

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed]     = useState(false);
  // Stores data from a notification tap so the navigator can route to it
  const [tapPayload, setTapPayload] = useState<NotificationTapPayload | null>(null);
  const notifResponseListener = useRef<Notifications.EventSubscription | null>(null);

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

  // Handle notification taps (foreground + background/killed)
  useEffect(() => {
    // Tapped while app is running in fg or bg
    notifResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationTapPayload;
        if (data?.screen) setTapPayload(data);
      }
    );

    // App was killed — check if launched from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as NotificationTapPayload;
        if (data?.screen) setTapPayload(data);
      }
    });

    return () => {
      notifResponseListener.current?.remove();
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF8F3', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#5B57D6" size="large" />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!authed) {
    return (
      <>
        <SignInScreen onSignedIn={() => setAuthed(true)} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <MainNavigator
        onSignOut={() => setAuthed(false)}
        notificationTap={tapPayload}
        onNotificationTapHandled={() => setTapPayload(null)}
      />
      <StatusBar style="dark" />
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
