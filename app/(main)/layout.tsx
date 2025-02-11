import localFont from "next/font/local";
import "./styles.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@blocknote/mantine/style.css";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { getUserProfile } from "./actions/get-user-profile";
import ClientWrapper from "@/components/client-wrapper";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Define metadata for the root layout
export const metadata = {
  title: "Chat2Geo",
  description: "AI-powered geospatial analyticse",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: authResults, error } = await supabase.auth.getUser();
  if (error || !authResults?.user) {
    redirect("/login");
  }
  const userProfile = await getUserProfile();
  return (
    <html lang="en" suppressHydrationWarning>
      <TooltipProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans`}
        >
          <ClientWrapper userProfile={userProfile}>{children}</ClientWrapper>
          <Analytics />
        </body>
      </TooltipProvider>
    </html>
  );
}
