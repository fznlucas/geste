import { ToastProvider } from "@/components";

/** Guide reader: focus mode, no site chrome (docs/screens/reader.md). */
export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
