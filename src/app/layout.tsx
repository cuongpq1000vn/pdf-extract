import type { Metadata } from "next";
import { THEME_BOOT_SCRIPT } from "../shared/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Reader",
  description:
    "Upload a supplier PDF and see which line items could be read, with the source for every number, and what was refused and why.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script may set data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
