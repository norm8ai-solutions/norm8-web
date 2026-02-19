"use client"

import { motion } from "framer-motion"
import { Bot, Cog, MessageSquare, Link2, Database, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const useCases = [
  { icon: Bot, text: "Agentes de IA para qualificação de leads" },
  { icon: Cog, text: "Automação de processos internos" },
  { icon: MessageSquare, text: "Assistentes inteligentes" },
  { icon: Link2, text: "Integrações com CRM e ferramentas internas" },
  { icon: Database, text: "Extração e enriquecimento de dados" },
]

export default function CustomAutomationSection() {
  return (
    <section id="automacao" className="relative py-32 bg-[#0A0A0F]">
      
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] -translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4 block">
              Soluções Personalizadas
            </span>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Precisa de uma automação específica para o seu negócio?
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              Nem todos os desafios se resolvem com um produto standard.
              A Norm8 também desenvolve sistemas de IA personalizados,
              adaptados às necessidades específicas de cada empresa.
            </p>

            {/* Use Cases */}
            <div className="space-y-4 mb-10">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all duration-300">
                    <useCase.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    {useCase.text}
                  </span>
                </motion.div>
              ))}
            </div>

            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl group transition-all duration-300 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
              onClick={() => {
                if (typeof window !== "undefined") {
                  document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })
                }
              }}
            >
              Solicitar Automação Personalizada
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative hidden lg:block"
          >
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">

              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
                <motion.path
                  d="M50 200 Q200 100 350 200"
                  stroke="url(#gradient1)"
                  strokeWidth="1"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.5 }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                <defs>
                  <linearGradient id="gradient1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="relative h-80 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}