import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SalesProvider } from "@/context/SalesContext";
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
        <AuthProvider>
          <SalesProvider>
            <LoginOverlay />
            {children}
          </SalesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
