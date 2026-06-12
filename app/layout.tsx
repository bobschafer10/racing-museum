import type { Metadata } from "next";
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
  With every click, a new door opens to another piece of auto racing history.
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
  flexWrap: 'nowrap',
}

const navTagline: React.CSSProperties = {
  color: '#f0dfbf',
  fontSize: '25px',
  fontWeight: 600,
  lineHeight: 1.15,
  flex: '0 1 820px',
  minWidth: '320px',
  maxWidth: '820px',
  whiteSpace: 'normal',
  overflow: 'hidden',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
  letterSpacing: '0.01em',
}

const navLogo: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  textDecoration: 'none',
  color: '#eadfc7',
}

const navLinks: React.CSSProperties = {
  display: 'flex',
  gap: 'clamp(8px, 2vw, 22px)',
  fontSize: 'clamp(12px, 1.8vw, 15px)',
  flexWrap: 'wrap',
  justifyContent: 'center',
  flex: '1 1 360px',
}

const navLink: React.CSSProperties = {
  textDecoration: 'none',
  color: '#f3e4c7',
  fontWeight: 500,
  transition: 'opacity 0.2s ease',
}