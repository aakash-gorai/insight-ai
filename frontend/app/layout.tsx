"use client";

import { useEffect } from "react";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function fixVH() {
      document.documentElement.style.setProperty(
        "--real-vh",
        `${window.innerHeight * 0.01}px`
      );
    }

    fixVH();
    window.addEventListener("resize", fixVH);

    return () => window.removeEventListener("resize", fixVH);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {/* APPLY REAL HEIGHT HERE */}
      <body className="h-[calc(var(--real-vh)*100)] overflow-hidden">
          <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
