import "./globals.css";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import SearchInline from "@/components/SearchInline";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

export const metadata = {
  title: {
    default: "Dramahub",
    template: "%s · Dramahub"
  },
  description: "Streaming katalog drama dan video."
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://dramahubv1.vercel.app" />
        <link rel="preconnect" href="https://images.weserv.nl" />
      </head>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`} data-theme="cinema">
        <div className="bg" aria-hidden="true"></div>
        <header className="site-header">
          <div className="brand">
            <a className="logo" href="/">Dramahub</a>
            <nav className="nav-links">
              <a href="/">Browse</a>
              <a href="/search">Search</a>
            </nav>
          </div>
          <div className="header-actions">
            <SearchInline />
            <button
              className="theme-toggle"
              type="button"
              data-action="theme-toggle"
              aria-label="Toggle theme"
            >
              <span>Theme</span>
            </button>
          </div>
        </header>

        <main className="container">{children}</main>

        <footer className="site-footer">
          <span>Streaming katalog video • Proxy API lokal</span>
        </footer>

        <Script src="/js/app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
