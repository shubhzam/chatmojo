import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "../lib/store/Provider";

export const metadata: Metadata = {
  title: "WebChat",
  description: "A WhatsApp-style chat app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}