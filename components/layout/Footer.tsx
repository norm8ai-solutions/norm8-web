"use client"

import Link from "next/link"
import Image from "next/image"
import { Linkedin, Twitter, Mail } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const scrollTo = (id: string) => {
    if (typeof window !== "undefined") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <footer className="relative bg-[#0A0A0F] border-t border-white/10">

      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid md:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div className="md:col-span-2">
            <Image
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6958fdca26373c9614048efe/4f99edd00_Norm8_NewPrimary_Website_NoBG.png"
              alt="Norm8"
              width={160}
              height={40}
              className="h-10 w-auto mb-4"
            />

            <p className="text-gray-400 max-w-sm leading-relaxed">
              Desenvolvemos sistemas de Inteligência Artificial que automatizam,
              otimizam e escalam negócios reais.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Soluções</h4>

            <ul className="space-y-3">
              <li>
                <Link
                  href="/seguroscout"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  SeguroScout
                </Link>
              </li>

              <li>
                <button
                  onClick={() => scrollTo("automacao")}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Automação Personalizada
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contacto</h4>

            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contacto@norm8.ai"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  contacto@norm8.ai
                </a>
              </li>
            </ul>

            {/* Social */}
            <div className="flex items-center gap-4 mt-6">

              <a className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Linkedin className="w-5 h-5" />
              </a>

              <a className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
                <Twitter className="w-5 h-5" />
              </a>

              <a
                href="mailto:contacto@norm8.ai"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                <Mail className="w-5 h-5" />
              </a>

            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-gray-500 text-sm">
            © {currentYear} Norm8. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-6 text-sm">
            <a className="text-gray-500 hover:text-white transition-colors">
              Política de Privacidade
            </a>

            <a className="text-gray-500 hover:text-white transition-colors">
              Termos de Serviço
            </a>
          </div>

        </div>

      </div>
    </footer>
  )
}