"use client"

import { motion } from "framer-motion"
import { ArrowRight, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CTASection() {
  return (
    <section id="contacto" className="relative py-32 bg-[#0A0A0F]">
      
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2.5rem] overflow-hidden"
        >
          
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-pink-600/10" />
          <div className="absolute inset-0 bg-[#0A0A0F]/80" />
          <div className="absolute inset-[1px] rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02]" />
          
          <div className="relative p-12 md:p-16 lg:p-20 text-center">

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Pronto para escalar com
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Inteligência Artificial?
              </span>
            </h2>

            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Descubra como a Norm8 pode transformar o seu negócio com soluções de IA personalizadas e escaláveis.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-7 text-lg rounded-xl group transition-all duration-300 shadow-2xl shadow-white/10"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    document.getElementById("solucoes")?.scrollIntoView({ behavior: "smooth" })
                  }
                }}
              >
                Explorar Soluções
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-lg rounded-xl transition-all duration-300"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("mailto:contacto@norm8.ai", "_blank")
                  }
                }}
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                Falar com a Norm8
              </Button>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}