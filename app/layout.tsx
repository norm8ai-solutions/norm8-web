import "./globals.css"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

export const metadata = {
  title: "Norm8 — Sistemas de IA",
  description: "Desenvolvemos sistemas de Inteligência Artificial que automatizam, otimizam e escalam negócios reais.",
  icons: {
  icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body className="bg-[#0A0A0F] text-white min-h-screen">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}