import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Reader",
  description:
    "Upload a supplier PDF and see which line items could be read, with the source for every number, and what was refused and why.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
