import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Header from "@/components/Header";
import SessionWrapper from "@/components/SessionWrapper";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Linktree",
  description: "Linktree where you can find all my links",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <SessionWrapper>
        <main>
          <Header />
          <div className="max-w-4xl mx-auto p-6"> 
          {children}
          </div>
        </main>
      </SessionWrapper>
      </body>
    </html>
  );
}
