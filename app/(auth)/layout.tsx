import localFont from "next/font/local";
import "./styles.css";
import { Toaster } from "react-hot-toast";
import ToastMessage from "@/features/ui/toast-message";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

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
  title: "Login to Chat2Geo",
  description: "Login to access AI-powered geospatial analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <ToastMessage />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
