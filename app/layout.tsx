// app/layout.tsx
import type { Metadata } from "next";
import { AuthProvider } from './context/AuthContext';
import "./globals.css";

export const metadata: Metadata = {
  title: "Dish Counter",
  description: "Employee meal management by Firebase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
