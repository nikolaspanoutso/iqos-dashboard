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
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'red', color: 'white', padding: '4px' }}>
          DEBUG: App Loaded
        </div>
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
