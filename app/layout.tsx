import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_COMPANY, APP_DESCRIPTION } from "@/lib/i18n/branding";
import { buildInlinePreferenceScript } from "@/lib/preferences/apply";
import { PREFERENCE_COOKIE_NAME } from "@/lib/preferences/types";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_COMPANY }],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const preferenceCookie = cookieStore.get(PREFERENCE_COOKIE_NAME)?.value ?? "";

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: buildInlinePreferenceScript(preferenceCookie),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
