"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components";
import { getPushSettings } from "@/lib/api";
import { alerts as getAlerts } from "@/lib/metrics";
import { hasRole, useAdminQuery } from "@/lib/client";
import { useAdmin } from "./AdminFrame";

/** The push topic an alert belongs to (Alerts › Push notifications); others always notify. */
const TOPIC: Array<[RegExp, string]> = [
  [/^order:/, "new_order"],
  [/^to-print:/, "print_to_ship"],
  [/^support:/, "support_message"],
  [/^low-edition:/, "edition_low"],
];

/**
 * The notifier (web push later): an alert that appears while the admin is open shows a toast, unless
 * its push topic is off. Alerts already there when the page opened stay quiet.
 */
export function AlertNotifier() {
  const { staff } = useAdmin();
  const toast = useToast();
  const alerts = useAdminQuery(getAlerts, []);
  const topics = useAdminQuery(getPushSettings, []);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (alerts.status !== "ready" || topics.status !== "ready") return;
    const mine = alerts.data.filter((a) => hasRole(staff.role, a.roles) && !a.read);
    if (seen.current === null) {
      seen.current = new Set(mine.map((a) => a.id));
      return;
    }
    for (const a of mine) {
      if (seen.current.has(a.id)) continue;
      seen.current.add(a.id);
      const topic = TOPIC.find(([re]) => re.test(a.id))?.[1];
      if (topic && topics.data[topic] === false) continue;
      toast.show(a.phone?.text ?? a.text);
    }
  }, [alerts, topics, staff.role, toast]);
  return null;
}
