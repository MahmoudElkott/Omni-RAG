import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Omni·RAG — A Learning Hub",
  description: "A quiet study companion. Chat, quizzes, and flashcards from your own corpus.",
};

// Pre-paint theme from localStorage to avoid flash-of-wrong-theme
const themeInit = `
(function(){
  try {
    var raw = localStorage.getItem('omni-rag-store');
    var t = null;
    if (raw) {
      try { t = (JSON.parse(raw).state || {}).theme || null; } catch(e) {}
    }
    if (!t) t = 'emerald';
    var root = document.documentElement;
    root.dataset.theme = t;
    root.classList.toggle('dark', t !== 'emerald');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="emerald"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="h-full antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
