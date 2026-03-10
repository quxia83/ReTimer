import * as Notifications from "expo-notifications";

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
      body: `${medicationName} is safe to take again.`,
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
