/** What the app needs from Boxtal: a label (tracking number in the carrier's format). */
export interface BoxtalAdapter {
  createLabel(input: { orderId: string; orderNumber: string; carrier: "colissimo" | "mondial_relay" | "chronopost"; parcel: string; country: string }): Promise<{ trackingNo: string; costCents: number }>;
}
