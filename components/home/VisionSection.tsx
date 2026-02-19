"use client"

import { motion } from "framer-motion"
import { Globe, Layers, Lightbulb } from "lucide-react"

export default function VisionSection() {
  return (
    <section className="relative py-32 bg-[#0A0A0F] overflow-hidden">

      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >

          {/* Icons */}
          <div className="flex items-center justify-center gap-6 mb-10">

            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <Globe className="w-7 h-7 text-blue-400" />
            </motion.div>

            <motion.div
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25"
            >
              <Lightbulb className="w-8 h-8 text-white" />
            </motion.div>

            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <Layers className="w-7 h-7 text-purple-400" />
            </motion.div>

          </div>

          <span className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4 block">
            Visão
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            A construir a infraestrutura
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              de IA do futuro
            </span>
          </h2>

          <p className="text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
            A Norm8 está a desenvolver um ecossistema de soluções SaaS baseadas em
            Inteligência Artificial para múltiplas indústrias. O nosso objetivo é
            capacitar empresas com tecnologia inteligente, escalável e preparada para o futuro.
          </p>

        </motion.div>

      </div>
    </section>
  )
}