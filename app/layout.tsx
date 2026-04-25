import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ひとこと箱",
  description: "家族の日常のひとことを静かに受け止めるインボックスです。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ひとこと箱",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#9b6f5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
