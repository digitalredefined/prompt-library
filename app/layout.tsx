import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/session-provider";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The header reads the Auth.js session, which depends on request cookies.
// Force dynamic rendering so production builds do not try to prerender routes
// that need per-request authentication state.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt Library",
  description: "Save, organize, categorize, and optimize your AI prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthSessionProvider>
          <SiteHeader />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
