import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';

import { API_BASE_URL } from '../constants/Api';

// Configure default notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register device for Push Notifications and send token to backend
 */
export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notifications!');
      return null;
    }

    // Get EAS Project ID from app.json / Constants
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log('EAS Project ID not found in configurations.');
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log('Expo Push Token retrieved:', token);

    // Get client timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Register token with Express backend
    await axios.post(`${API_BASE_URL}/notifications/register`, {
      userId,
      token,
      platform: Platform.OS,
      timezone,
    });

    return token;
  } catch (error) {
    console.error('Error during push notification registration:', error);
    return null;
  }
}

/**
 * Remove device push token from backend
 */
export async function unregisterPushNotificationsAsync(userId: string, token: string) {
  try {
    await axios.post(`${API_BASE_URL}/notifications/remove`, {
      userId,
      token,
    });
    console.log('Successfully unregistered push token from backend');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}
