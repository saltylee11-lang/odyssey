import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { BottomNav } from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "奥德赛 - 寻找归途",
  description: "通过 AI 对话，记录和探索你人生的每一个想法",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "奥德赛",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-180.png",
  },
};

export const viewport = {
  themeColor: "#183947",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function PWARegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Netlify inserts a newline after the charset tag. React expects no text node there.
          const afterCharset = document.head.querySelector('meta[charset]')?.nextSibling;
          if (afterCharset?.nodeType === Node.TEXT_NODE && !afterCharset.textContent.trim()) {
            afterCharset.remove();
          }
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <PWARegister />
      </head>
      <body className="min-h-full flex flex-col text-slate-800">
        <BottomNav />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
