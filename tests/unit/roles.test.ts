/** Roles and sessions (docs/admin-v2/05 "Roles and security (mock)"). */
import { describe, expect, it } from "vitest";
import { canOpenAdmin } from "@/components/admin/AdminShell";
import { sessionExpired, sessionTimeoutHours } from "@/lib/api/staff";

describe("pages by role", () => {
  it("breadcrumbs and cross-links follow the navigation's roles", () => {
    expect(canOpenAdmin("content", "/admin/customers")).toBe(false);
    expect(canOpenAdmin("support", "/admin/customers/detail/?id=x")).toBe(true);
    expect(canOpenAdmin("content", "/admin/analytics")).toBe(false);
    expect(canOpenAdmin("owner", "/admin/analytics")).toBe(true);
    // Content reads the edition stock.
    expect(canOpenAdmin("content", "/admin/editions")).toBe(true);
    expect(canOpenAdmin("support", "/admin/editions")).toBe(false);
  });
});

describe("session timeout", () => {
  it("12 hours from Settings › Security", () => {
    expect(sessionTimeoutHours()).toBe(12);
    const at = "2026-10-02T08:00:00Z";
    expect(sessionExpired(at, Date.parse("2026-10-02T19:59:00Z"))).toBe(false);
    expect(sessionExpired(at, Date.parse("2026-10-02T20:01:00Z"))).toBe(true);
  });
});
