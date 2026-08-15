import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  title: "Prince Links",
  description: "Prince Links — create your customized creator profile, links, content, and analytics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col justify-between`}
      >
      <SessionWrapper>
        <div className="flex-1 flex flex-col justify-between">
          <Header />
          <main className="flex-1"> 
            {children}
          </main>
          <Footer />
        </div>
      </SessionWrapper>
      </body>
    </html>
  );
}
