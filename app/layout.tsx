import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link"

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

        {/* NAV BAR */}
        <div style={navBar}>
          <div style={navInner}>

            
  <div style={navTagline}>
  Every click opens a door to another piece of auto racing history.
</div>

            <div style={navLinks}>
  <Link href="/" style={navLink}>Home</Link>
  <Link href="/tracks" style={navLink}>Tracks</Link>
  <Link href="/drivers" style={navLink}>Drivers</Link>
  <Link href="/series" style={navLink}>Series</Link>
  <Link href="/results" style={navLink}>Results</Link>
  <Link href="/media" style={navLink}>Media Archive</Link>
</div>

          </div>
        </div>

        {/* PAGE CONTENT */}
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
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '24px',
  flexWrap: 'wrap',
}

const navTagline: React.CSSProperties = {
  color: '#f0dfbf',
  fontSize: '25px',
  fontWeight: 600,
  lineHeight: 1.15,
  flex: '1 1 520px',
  minWidth: 0,
  whiteSpace: 'normal',
  overflow: 'visible',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
}

const navLinks: React.CSSProperties = {
  display: 'flex',
  gap: '18px',
  fontSize: '15px',
  flexWrap: 'wrap',
  justifyContent: 'center',
}

const navLogo: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  textDecoration: 'none',
  color: '#eadfc7',
}

const navLink: React.CSSProperties = {
  textDecoration: 'none',
  color: '#f3e4c7',
  fontWeight: 500,
  transition: 'opacity 0.2s ease',
}