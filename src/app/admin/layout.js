import { siteConfig } from "@/config/site";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/Toast";
import { fontVariables } from "../fonts";
import "../globals.css";

// Admin is its own root layout (English, LTR, never indexed).
export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Admin", template: "%s | 4 BRO Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col bg-bone">
        <ToastProvider>
          <ConfirmProvider>
            <div className="flex min-h-dvh flex-col">{children}</div>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
