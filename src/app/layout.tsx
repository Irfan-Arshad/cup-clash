import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cup Clash",
  description: "Predict the scores. Beat your mates. Rule the leaderboard.",
  applicationName: "Cup Clash",

  icons: {
    icon: [
      {
        url: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/icon",
    apple: [
      {
        url: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Cup Clash",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    title: "Cup Clash",
    description: "Predict the scores. Beat your mates. Rule the leaderboard.",
    siteName: "Cup Clash",
    type: "website",
    images: [
      {
        url: "/icon",
        width: 512,
        height: 512,
        alt: "Cup Clash icon",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "Cup Clash",
    description: "Predict the scores. Beat your mates. Rule the leaderboard.",
    images: ["/icon"],
  },
};

export const viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} antialiased`}>{children}</body>
    </html>
  );
}