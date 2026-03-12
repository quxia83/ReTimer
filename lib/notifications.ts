import * as Notifications from "expo-notifications";
import i18n from "@/lib/i18n";
import { db } from "@/db/client";
import { trackers, entryLogs, settings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleCooldownNotification(
  trackerName: string,
  cooldownMaxMinutes: number,
  trackerId: number
) {
  await cancelCooldownNotification(trackerId);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: trackerName,
      body: i18n.t("notification.intervalComplete", { name: trackerName }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: cooldownMaxMinutes * 60,
    },
    identifier: `cooldown-${trackerId}`,
  });
}

export async function cancelCooldownNotification(trackerId: number) {
  await Notifications.cancelScheduledNotificationAsync(`cooldown-${trackerId}`);
}

/**
 * Re-schedule notifications for all active cooldowns.
 * Called on app launch to recover notifications lost by force-quit.
 */
export async function rescheduleAllNotifications() {
  try {
    // Check if global notifications are enabled
    const globalSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "notificationsGlobal"));
    if (globalSetting.length > 0 && globalSetting[0].value === "false") return;

    // Check permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    // Cancel all existing scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get all trackers with notifications enabled
    const allTrackers = await db
      .select()
      .from(trackers)
      .where(eq(trackers.notifyEnabled, 1));

    for (const tracker of allTrackers) {
      // Get last entry for this tracker
      const lastEntryRows = await db
        .select()
        .from(entryLogs)
        .where(eq(entryLogs.trackerId, tracker.id))
        .orderBy(desc(entryLogs.loggedAt))
        .limit(1);

      if (lastEntryRows.length === 0) continue;

      const lastEntry = lastEntryRows[0];
      const elapsed = (Date.now() - new Date(lastEntry.loggedAt).getTime()) / 1000;
      const maxSeconds = tracker.cooldownMax * 60;
      const remaining = maxSeconds - elapsed;

      // Only schedule if cooldown hasn't finished yet
      if (remaining > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: tracker.name,
            body: i18n.t("notification.intervalComplete", { name: tracker.name }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.ceil(remaining),
          },
          identifier: `cooldown-${tracker.id}`,
        });
      }
    }
  } catch {
    // Silently fail — notifications are non-critical
  }
}
