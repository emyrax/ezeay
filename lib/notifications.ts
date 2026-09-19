import Constants from "expo-constants";
import { Platform, Linking } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  (Constants as any).appOwnership === "expo";

let initialized = false;
let notificationsModule: NotificationsModule | null = null;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
  } catch (err) {
    if (__DEV__) {
      console.warn("[notifications] expo-notifications unavailable:", err);
    }
  }
  return notificationsModule;
}

export async function initNotifications() {
  if (initialized) return;
  initialized = true;

  if (isExpoGo) return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return false;

  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function openNotificationSettings() {
  if (Platform.OS === "android") {
    await Linking.openSettings();
  } else {
    await Linking.openURL("app-settings:");
  }
}

export async function scheduleCourseNotification(courseTitle: string) {
  if (isExpoGo) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Course Generated!",
      body: `"${courseTitle}" is ready. Start learning now.`,
      data: { courseTitle },
      sound: true,
    },
    trigger: null,
  });
}
