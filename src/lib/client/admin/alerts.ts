"use client";

import { patchRow, requireStaff } from "../admin";

/**
 * Alerts (AdminMAlerts). Later: `notifications.read_at` and the staff's web-push subscription topics.
 * Reading an alert or changing a push topic is personal and not audited.
 */
export function markAlertRead(id: string) {
  requireStaff();
  patchRow("alerts", id, { read: true });
}

/** "Mark all read": every alert shown to this staff member. */
export function markAlertsRead(ids: string[]) {
  requireStaff();
  for (const id of ids) patchRow("alerts", id, { read: true });
}

export function setPushTopic(topic: string, on: boolean) {
  requireStaff();
  patchRow("push_settings", topic, { on });
}
