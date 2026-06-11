import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Helper to handle deep linking redirect from notification payload
  const handleNotificationRedirect = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    if (data && data.screen) {
      console.log(`Deep linking to screen: ${data.screen}`);
      try {
        router.push(data.screen as any);
      } catch (err) {
        console.error('Failed to navigate via notification deep link:', err);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    if (Platform.OS === 'web') {
      console.log('Push notifications are not supported on web.');
      return;
    }

    // Register push notification token on login
    registerForPushNotificationsAsync(user._id).then((token) => {
      if (token) setExpoPushToken(token);
    });

    // 1. Listen for incoming notifications in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Received foreground notification:', notification);
      setNotification(notification);
    });

    // 2. Listen for interactions when a user taps a notification (Background / Terminated state)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('User interacted with notification:', response);
      handleNotificationRedirect(response);
    });

    // 3. Handle notification that launched the app from a Terminated state
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('App launched from terminated state via notification:', response);
        handleNotificationRedirect(response);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return {
    expoPushToken,
    notification,
  };
}
export default usePushNotifications;
