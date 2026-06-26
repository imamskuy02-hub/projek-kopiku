import "./globals.css";

export const metadata = {
  title: "kopiku - Premium Coffee Shop Menu",
  description: "Menu digital interaktif untuk menikmati sajian kopi premium kami.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
