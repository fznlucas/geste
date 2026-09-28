import { StoreChrome } from "./_chrome/StoreChrome";

/** Every store page: header, footer, cart drawer, toasts (docs/screens/store.md §Layout). */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreChrome>{children}</StoreChrome>;
}
