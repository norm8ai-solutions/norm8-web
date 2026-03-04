"use client"

import { motion } from "framer-motion"
import { Cpu, Workflow, Server } from "lucide-react"

const pillars = [
  {
    icon: Cpu,
    title: "Produtos SaaS de IA",
    description: "Plataformas inteligentes, focadas em problemas específicos de cada indústria.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Workflow,
    title: "Sistemas de Automação Inteligente",
    description: "Fluxos de trabalho com IA desenhados para resolver problemas reais do negócio.",
    gradient: "from-purple-500 to-pink-400",
  },
  {
    icon: Server,
    title: "Infraestrutura Escalável",
    description: "Arquitetura segura, modular e preparada para crescimento a longo prazo.",
    gradient: "from-emerald-500 to-teal-400",
  },
]

export default function WhatWeDoSection() {
  return (
    <section className="relative py-32 bg-[#0A0A0F]">

      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
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
            O que fazemos
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Soluções de IA,{" "}
            <span className="gradient-text">
              não apenas automações
            </span>
          </h2>
        </motion.div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-500 h-full">

                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${pillar.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />

                <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-r ${pillar.gradient} p-[1px] mb-6`}>
                  <div className="w-full h-full rounded-2xl bg-[#0A0A0F] flex items-center justify-center">
                    <pillar.icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
                  {pillar.title}
                </h3>

                <p className="text-gray-400 leading-relaxed">
                  {pillar.description}
                </p>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}