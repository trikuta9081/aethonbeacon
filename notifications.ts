import Constants, { AppOwnership } from "expo-constants";
import { Platform } from "react-native";

type NotificationModule = typeof import("expo-notifications");

type PermissionResponse = {
  granted: boolean;
  canAskAgain?: boolean;
};

const noopModule = {
  AndroidImportance: { DEFAULT: 0 },
  SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
  setNotificationHandler: () => undefined,
  getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) as PermissionResponse,
  requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) as PermissionResponse,
  setNotificationChannelAsync: async () => undefined,
  cancelAllScheduledNotificationsAsync: async () => undefined,
  cancelScheduledNotificationAsync: async () => undefined,
  scheduleNotificationAsync: async () => null
} as const;

const isAndroidExpoGo = Platform.OS === "android" && Constants.appOwnership === AppOwnership.Expo;
const notificationsAvailable = Platform.OS !== "web" && !isAndroidExpoGo;

let realModule: NotificationModule | null = null;

function loadModule() {
  if (!notificationsAvailable) {
    return noopModule;
  }

  if (!realModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    realModule = require("expo-notifications") as NotificationModule;
  }

  return realModule;
}

const Notifications: any = new Proxy(noopModule, {
  get(target, property) {
    const module = loadModule() as Record<string | symbol, unknown>;
    return (module[property] ?? (target as Record<string | symbol, unknown>)[property]) as unknown;
  }
});

export default Notifications;
export { notificationsAvailable };
