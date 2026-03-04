"use client"

import { motion } from "framer-motion"
import { ArrowRight, Shield, Zap, TrendingUp, Database, CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const upcomingProducts = [
  { title: "Soluções de IA para operações", icon: Zap },
  { title: "Plataformas verticais por indústria", icon: TrendingUp },
  { title: "Sistemas internos de produtividade", icon: Database },
]

const seguroScoutFeatures = [
  "Recolha automática de dados",
  "Análise e filtragem inteligente",
  "Redução de tempo e custos operacionais",
  "Preparado para escalabilidade e conformidade",
]

export default function SolutionsSection() {
  return (
    <section id="solucoes" className="relative py-32 bg-[#0A0A0F]">

      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
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
            Produtos
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
            Soluções Norm8
          </h2>
        </motion.div>

        {/* Featured product */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mb-16"
        >
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-white/10">

            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />

            <div className="relative p-8 md:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-12 items-center">

                {/* Content */}
                <div>

                  {/* Active badge */}
                  <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 inline-flex items-center gap-2 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Produto ativo
                  </Badge>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-3xl md:text-4xl font-bold text-white">
                      SeguroScout
                    </h3>
                  </div>

                  <p className="text-xl text-blue-200/80 mb-6">
                    Plataforma inteligente de análise e gestão de seguros.
                  </p>

                  <p className="text-gray-400 leading-relaxed mb-8">
                    O SeguroScout utiliza Inteligência Artificial para automatizar a pesquisa,
                    comparação e qualificação de seguros, permitindo decisões mais rápidas,
                    informadas e eficientes.
                  </p>

                  {/* Features */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-8">
                    {seguroScoutFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/seguro-scout">
                    <Button className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl group">
                      Ver SeguroScout
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                </div>

                {/* Visual */}
                <div className="relative hidden lg:block">
                  <div className="relative aspect-square max-w-md mx-auto">

                    {/* Rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 rounded-full border border-blue-500/20 animate-pulse" />
                      <div className="absolute w-80 h-80 rounded-full border border-purple-500/10 animate-pulse delay-300" />
                      <div className="absolute w-96 h-96 rounded-full border border-white/5 animate-pulse delay-500" />
                    </div>

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                        <Shield className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    {/* Floating icon 1 */}
                    <motion.div
                      animate={{ y: [-10, 10, -10] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute top-10 right-10 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm"
                    >
                      <Zap className="w-6 h-6 text-blue-400" />
                    </motion.div>

                    {/* Floating icon 2 */}
                    <motion.div
                      animate={{ y: [10, -10, 10] }}
                      transition={{ duration: 5, repeat: Infinity }}
                      className="absolute bottom-10 left-10 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm"
                    >
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </motion.div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>

        {/* Upcoming products */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h4 className="text-xl font-semibold text-white mb-8 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Próximos Produtos
          </h4>

          <div className="grid md:grid-cols-3 gap-6">
          {upcomingProducts.map((product, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 border-dashed hover:border-white/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                <product.icon className="w-6 h-6 text-gray-400" />
              </div>

              <h5 className="text-lg font-medium text-gray-300 mb-2">
                {product.title}
              </h5>

              <Badge variant="outline" className="border-gray-700 text-gray-500">
                Em desenvolvimento
              </Badge>
            </div>
          ))}
        </div>

          <p className="text-center text-gray-500 mt-8">
            Novas soluções de IA a serem lançadas em breve.
          </p>
        </motion.div>

      </div>
    </section>
  )
}