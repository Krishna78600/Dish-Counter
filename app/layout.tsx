// app/layout.tsx
import type { Metadata } from "next";
import { AuthProvider } from './context/authcontext';
import AuthGuard from './components/AuthGuard';
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
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
