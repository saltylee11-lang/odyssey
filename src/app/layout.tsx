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
    apple: "/icons/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function PWARegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <PWARegister />
      </head>
      <body className="min-h-full flex flex-col text-slate-800">
        <div
          className="fixed inset-0 -z-10"
          style={{
            background:
              "linear-gradient(165deg, #f0f4ff 0%, #f5f3ff 25%, #faf8ff 50%, #f8fafc 80%, #f1f5f9 100%)",
          }}
        />
        <div
          className="fixed inset-0 -z-10 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(129,140,248,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(167,139,250,0.06) 0%, transparent 60%)",
          }}
        />
        <ToastProvider>{children}</ToastProvider>
        <BottomNav />
      </body>
    </html>
  );
}
