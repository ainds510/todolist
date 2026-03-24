import type { Metadata } from "next";
import { Layout } from "antd";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TO-DO-LIST",
  description: "一个简洁现代的待办事项应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body>
          <Layout style={{ minHeight: "100vh" }}>
            {children}
          </Layout>
        </body>
      </html>
    </ClerkProvider>
  );
}
