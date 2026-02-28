import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROBOPRO - Virtual MCU Simulation",
  description: "Browser-based microcontroller simulation environment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="overflow-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
