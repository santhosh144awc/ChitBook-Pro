import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChitBook Pro - Chit Fund Management",
  description: "Complete chit fund management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 6000, // Show for 6 seconds
              style: {
                background: '#363636',
                color: '#fff',
                maxWidth: '600px',
                fontSize: '14px',
                padding: '16px',
                wordBreak: 'break-word',
              },
              error: {
                duration: 8000, // Show errors for 8 seconds
                style: {
                  background: '#ef4444',
                  color: '#fff',
                  maxWidth: '600px',
                  fontSize: '14px',
                  padding: '16px',
                  wordBreak: 'break-word',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
