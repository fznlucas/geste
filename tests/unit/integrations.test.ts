/** Integrations (docs/admin-v2/03): mode resolution, Live only when it can work, clear refusals. */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("modes", () => {
  it("defaults: almost everything on simulated data, a few off until wanted", async () => {
    const { INTEGRATIONS, getMode, modeCounts } = await import("@/lib/integrations");
    expect(INTEGRATIONS.length).toBeGreaterThanOrEqual(38);
    expect(getMode("stripe-payments")).toBe("mock");
    expect(getMode("klarna")).toBe("off");
    const c = modeCounts();
    expect(c.mock + c.live + c.off).toBe(INTEGRATIONS.length);
    expect(c.live).toBe(0);
  });

  it("NEXT_PUBLIC_INTEGRATION_<ID> sets the mode when the admin did not choose", async () => {
    vi.stubEnv("NEXT_PUBLIC_INTEGRATION_KLARNA", "mock");
    const { getMode } = await import("@/lib/integrations");
    expect(getMode("klarna")).toBe("mock");
  });

  it("Live needs a server: disabled with the reason until NEXT_PUBLIC_API_BASE is set", async () => {
    const { integration, statusOf } = await import("@/lib/integrations");
    expect(statusOf(integration("stripe-payments")!).liveBlocked).toBe("Needs a server · set NEXT_PUBLIC_API_BASE");
    expect(statusOf(integration("invoices")!).liveBlocked).toBeNull(); // works in the browser
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api.geste.studio");
    const again = await import("@/lib/integrations");
    expect(again.statusOf(again.integration("stripe-payments")!).liveBlocked).toBeNull();
  });

  it("an integration that is off refuses clearly instead of failing silently", async () => {
    vi.stubEnv("NEXT_PUBLIC_INTEGRATION_RESEND", "off");
    const { adapter, IntegrationNotConfigured } = await import("@/lib/integrations");
    expect(() => adapter("resend")).toThrow(IntegrationNotConfigured);
  });

  it("a live adapter without a server says what is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_INTEGRATION_BOXTAL", "live");
    const { adapter } = await import("@/lib/integrations");
    await expect(adapter("boxtal").createLabel({ orderId: "o", orderNumber: "GS-1001", carrier: "colissimo", parcel: "Tube", country: "FR" })).rejects.toThrow("Needs a server · set NEXT_PUBLIC_API_BASE");
  });

  it("the Boxtal mock gives carrier-format tracking numbers and the grid's price", async () => {
    const { boxtalMock } = await import("@/lib/integrations/boxtal/mock");
    expect((await boxtalMock.createLabel({ orderId: "o", orderNumber: "GS-1438", carrier: "colissimo", parcel: "Tube", country: "FR" })).trackingNo).toMatch(/^6A\d{11}$/);
    expect((await boxtalMock.createLabel({ orderId: "o", orderNumber: "GS-1438", carrier: "chronopost", parcel: "Tube", country: "FR" })).trackingNo).toMatch(/^XY\d{9}FR$/);
    expect((await boxtalMock.createLabel({ orderId: "o", orderNumber: "GS-1438", carrier: "colissimo", parcel: "Tube", country: "CH" })).costCents).toBe(2450);
  });
});
