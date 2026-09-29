/**
 * Sign-in settings of the Settings board: when the password last changed and the saved passkeys.
 * Supabase Auth keeps these later (WebAuthn credentials, `auth.users`); customers without a row
 * here have no passkey and set their password when their account was created.
 */
export interface PasskeyRow {
  id: string;
  userId: string;
  device: string;
  addedAt: string;
}

export const passkeys: PasskeyRow[] = [
  { id: "pk-camille-iphone", userId: "cus-camille-martin", device: "iPhone", addedAt: "2026-09-12T19:20:00Z" },
];

export const passwordChangedAt: Record<string, string> = {
  "cus-camille-martin": "2026-09-12T19:18:00Z",
};
