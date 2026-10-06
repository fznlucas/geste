/** A live adapter that cannot run says why, instead of failing silently (docs/admin-v2/03 §1). */
export class IntegrationNotConfigured extends Error {
  constructor(
    public integrationId: string,
    public reason: string,
  ) {
    super(reason);
  }
}
