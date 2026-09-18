import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Climbing Fail",
  description: "A looping collection of climbing fails.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
