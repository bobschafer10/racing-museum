import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./series-mobile.css";
import "./series-routes-mobile.css";
import "./research-center-home.css";
import "./research-center-home-v2.css";
import "./research-center-dark.css";
import "./research-center-nav.css";
import "./research-center-home-dark.css";
import "./home-final-polish.css";
import Link from "next/link"
import ResearchCenterNav from "@/components/ResearchCenterNav"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Upper Midwest Auto Racing Museum",
  description: "Historic racing archive",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div style={navBar} className="site-nav-bar">
          <div style={navInner} className="site-nav-inner">
            <div style={navTagline} className="site-nav-tagline">
              Every click opens a door to another piece of auto racing history.
            </div>

            <div style={navLinks} className="site-nav-links">
              <Link href="/" style={navLink}>Home</Link>
              <Link href="/tracks" style={navLink}>Tracks</Link>
              <Link href="/drivers" style={navLink}>Drivers</Link>
              <Link href="/series" style={navLink}>Series</Link>
              <Link href="/events" style={navLink}>Special Events</Link>
              <Link href="/results" style={navLink}>Results</Link>
              <Link href="/media" style={navLink}>Photos & Media</Link>
              <Link href="/stats/feature-winners" style={researchNavLink}>Research Center</Link>
              <Link href="/#support-museum" style={navLink}>Support the Museum</Link>
            </div>
          </div>
        </div>

        <ResearchCenterNav />

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}

const navBar: React.CSSProperties = {
  background: '#2f2417',
  color: '#eadfc7',
  borderBottom: '2px solid #5d3f17',
}

const navInner: React.CSSProperties = {
  maxWidth: '1600px',
  margin: '0 auto',
  padding: '9px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '22px',
  flexWrap: 'wrap',
}

const navTagline: React.CSSProperties = {
  color: '#f0dfbf',
  fontSize: '14px',
  fontWeight: 650,
  lineHeight: 1.2,
  flex: '1 1 360px',
  minWidth: 0,
  whiteSpace: 'normal',
  overflow: 'visible',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
}

const navLinks: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  fontSize: '13px',
  flexWrap: 'wrap',
  justifyContent: 'center',
}

const navLink: React.CSSProperties = {
  textDecoration: 'none',
  color: '#f3e4c7',
  fontWeight: 600,
  transition: 'opacity 0.2s ease',
}

const researchNavLink: React.CSSProperties = {
  ...navLink,
  color: '#fff4dd',
  fontWeight: 800,
  border: '1px solid #9e7136',
  background: '#6d241c',
  padding: '6px 10px',
  boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
}