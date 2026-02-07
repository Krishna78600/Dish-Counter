import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Management System",
  description: "Employee meal management with Firebase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}