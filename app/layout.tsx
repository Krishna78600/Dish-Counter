import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}