"use client"

import { motion } from "framer-motion"
import { Code2, Package, Shield, Target, Rocket } from "lucide-react"

const reasons = [
  {
    icon: Code2,
    title: "Desenvolvido por engenheiros",
    description: "Equipa técnica focada em qualidade e performance.",
  },
  {
    icon: Package,
    title: "Abordagem orientada a produto",
    description: "Criamos soluções, não projetos pontuais.",
  },
  {
    icon: Shield,
    title: "Arquitetura escalável e segura",
    description: "Sistemas preparados para crescimento.",
  },
  {
    icon: Target,
    title: "IA aplicada com foco em ROI",
    description: "Resultados mensuráveis e impacto real.",
  },
  {
    icon: Rocket,
    title: "Visão de longo prazo",
    description: "Parceiros no crescimento do seu negócio.",
  },
]

export default function WhyNorm8Section() {
  return (
    <section className="relative py-32 bg-[#0A0A0F]">

      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] -translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4 block">
            Diferencial
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Porque as empresas{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              escolhem a Norm8
            </span>
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500 ${
                index === 4 ? "lg:col-span-1 md:col-span-2 lg:col-start-2" : ""
              }`}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/50 transition-colors">
                  <reason.icon className="w-7 h-7 text-blue-400" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">
                  {reason.title}
                </h3>

                <p className="text-gray-400">
                  {reason.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
            <p className="text-xl md:text-2xl text-white font-medium">
              "Não vendemos automações.{" "}
              <span className="text-blue-400">
                Criamos sistemas que geram valor contínuo.
              </span>"
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  )
}