"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const navLinks = [
  { label: "Soluções", href: "#solucoes" },
  { label: "Automação", href: "#automacao" },
  { label: "SeguroScout", href: "/seguro-scout", isPage: true },
  { label: "Contacto", href: "#contacto" },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        setIsScrolled(window.scrollY > 50)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (href: string, isPage?: boolean) => {
    setIsMobileMenuOpen(false)

    if (!isPage && href.startsWith("#")) {
      if (typeof window !== "undefined") {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const scrollToContact = () => {
    if (typeof window !== "undefined") {
      document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png"
                alt="Norm8"
                className="h-10 w-auto"
              />
            </Link>

            {/* Desktop */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link, index) =>
                link.isPage ? (
                  <Link
                    key={index}
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={index}
                    onClick={() => handleNavClick(link.href, link.isPage)}
                    className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </button>
                )
              )}
            </div>

            {/* CTA */}
            <div className="hidden md:block">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl group"
                onClick={scrollToContact}
              >
                Começar
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#0A0A0F] pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link, index) =>
                link.isPage ? (
                  <Link
                    key={index}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-medium text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={index}
                    onClick={() => handleNavClick(link.href, link.isPage)}
                    className="text-2xl font-medium text-white text-left"
                  >
                    {link.label}
                  </button>
                )
              )}

              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl mt-4 py-6"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  scrollToContact()
                }}
              >
                Começar
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}