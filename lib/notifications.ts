import * as Notifications from "expo-notifications";
import i18n from "@/lib/i18n";
import { db } from "@/db/client";
import { medications, doseLogs, settings } from "@/db/schema";
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
  medicationName: string,
  cooldownMaxMinutes: number,
  medicationId: number
) {
  await cancelCooldownNotification(medicationId);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: medicationName,
      body: i18n.t("notification.intervalComplete", { name: medicationName }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: cooldownMaxMinutes * 60,
    },
    identifier: `cooldown-${medicationId}`,
  });
}

export async function cancelCooldownNotification(medicationId: number) {
  await Notifications.cancelScheduledNotificationAsync(`cooldown-${medicationId}`);
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

    // Get all medications with notifications enabled
    const meds = await db
      .select()
      .from(medications)
      .where(eq(medications.notifyEnabled, 1));

    for (const med of meds) {
      // Get last dose for this medication
      const lastDoseRows = await db
        .select()
        .from(doseLogs)
        .where(eq(doseLogs.medicationId, med.id))
        .orderBy(desc(doseLogs.takenAt))
        .limit(1);

      if (lastDoseRows.length === 0) continue;

      const lastDose = lastDoseRows[0];
      const elapsed = (Date.now() - new Date(lastDose.takenAt).getTime()) / 1000;
      const maxSeconds = med.cooldownMax * 60;
      const remaining = maxSeconds - elapsed;

      // Only schedule if cooldown hasn't finished yet
      if (remaining > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: med.name,
            body: i18n.t("notification.intervalComplete", { name: med.name }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.ceil(remaining),
          },
          identifier: `cooldown-${med.id}`,
        });
      }
    }
  } catch {
    // Silently fail — notifications are non-critical
  }
}
