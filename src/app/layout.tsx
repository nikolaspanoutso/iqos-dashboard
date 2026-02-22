import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import LoginOverlay from "@/components/Auth/LoginOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "IQOS Sales Dashboard",
  description: "Sales Network Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LoginOverlay />
          {children}
        </Providers>
      </body>
    </html>
  );
}
