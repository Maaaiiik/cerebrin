import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // If using Google Fonts
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

// Example local fonts - assuming create-next-app defaults
// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Strategic Management Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-50">
        <WorkspaceProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto relative">
              {children}
            </main>
          </div>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
