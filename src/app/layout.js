import "./globals.css";

export const metadata = {
  title: "Resto Rasa Nusantara - Sajian Spesial Resep Warisan",
  description: "Menu digital interaktif untuk menikmati hidangan lezat dan otentik dari dapur kami.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
