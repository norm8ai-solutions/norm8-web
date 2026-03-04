"use client"
import React from 'react';
import { 
  Shield, ArrowRight, CheckCircle2, Zap, Clock, 
  TrendingDown, Lock, BarChart3, FileSearch, 
  Database, RefreshCw, ArrowLeft
} from 'lucide-react';

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"



const features = [
  {
    icon: FileSearch,
    title: 'Recolha Automática de Dados',
    description: 'Extração inteligente de informações de múltiplas fontes de seguros em tempo real.'
  },
  {
    icon: BarChart3,
    title: 'Análise e Filtragem Inteligente',
    description: 'Algoritmos de IA que comparam, qualificam e recomendam as melhores opções.'
  },
  {
    icon: Clock,
    title: 'Redução de Tempo',
    description: 'Processos que levavam horas agora são concluídos em minutos.'
  },
  {
    icon: TrendingDown,
    title: 'Redução de Custos',
    description: 'Eliminação de tarefas manuais e otimização de recursos operacionais.'
  },
  {
    icon: Lock,
    title: 'Segurança e Conformidade',
    description: 'Arquitetura segura e em conformidade com regulamentações do setor.'
  },
  {
    icon: RefreshCw,
    title: 'Escalabilidade',
    description: 'Preparado para crescer com o seu negócio sem limitações.'
  }
];

const benefits = [
  'Decisões mais rápidas e informadas',
  'Redução significativa de tempo operacional',
  'Maior precisão na análise de dados',
  'Integração simples com sistemas existentes',
  'Dashboard intuitivo e em tempo real',
  'Suporte técnico especializado'
];

export default function SeguroScout() {
  return (
    <main className="bg-[#0A0A0F] min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          {/* Back Link */}
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Voltar à página principal
          </Link>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge className="mb-6 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 inline-flex items-center gap-2 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Produto ativo
                  </Badge>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-white">
                  SeguroScout
                </h1>
              </div>

              <p className="text-2xl text-blue-200/80 mb-6">
                Plataforma inteligente de análise e gestão de seguros.
              </p>

              <p className="text-lg text-gray-400 leading-relaxed mb-10">
                O SeguroScout utiliza Inteligência Artificial para automatizar a pesquisa, 
                comparação e qualificação de seguros, permitindo decisões mais rápidas, 
                informadas e eficientes. Uma solução completa para empresas que procuram 
                otimizar a gestão de seguros.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl group transition-all duration-300 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
                  onClick={() => window.open('mailto:contacto@norm8.ai?subject=SeguroScout - Solicitar Demo', '_blank')}
                >
                  Solicitar Demonstração
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 px-8 py-6 text-lg rounded-xl"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Funcionalidades
                </Button>
              </div>
            </motion.div>

            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[3rem] blur-3xl" />
                
                {/* Card */}
                <div className="relative rounded-[2rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-8 h-full flex flex-col justify-center">
                  {/* Mock Dashboard Elements */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Seguros Analisados</div>
                          <div className="text-2xl font-bold text-white">1,247</div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        +23%
                      </Badge>
                    </div>

                    <div className="h-32 bg-white/5 rounded-xl p-4">
                      <div className="flex items-end justify-between h-full gap-2">
                        {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                            className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5">
                        <div className="text-sm text-gray-400 mb-1">Tempo Médio</div>
                        <div className="text-xl font-semibold text-white">2.4 min</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5">
                        <div className="text-sm text-gray-400 mb-1">Precisão</div>
                        <div className="text-xl font-semibold text-white">98.7%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4 block">
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              O que o SeguroScout oferece
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Uma plataforma completa para revolucionar a forma como gere e analisa seguros.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/50 transition-colors">
                  <feature.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-32">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-4 block">
                Benefícios
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Porquê escolher o SeguroScout?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                Transforme a gestão de seguros da sua empresa com tecnologia de ponta.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-gray-300">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 rounded-2xl bg-white/5">
                    <Zap className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">85%</div>
                    <div className="text-sm text-gray-400">Menos tempo</div>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-white/5">
                    <TrendingDown className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">60%</div>
                    <div className="text-sm text-gray-400">Redução de custos</div>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-white/5">
                    <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">98%</div>
                    <div className="text-sm text-gray-400">Precisão</div>
                  </div>
                  <div className="text-center p-6 rounded-2xl bg-white/5">
                    <Clock className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">24/7</div>
                    <div className="text-sm text-gray-400">Disponibilidade</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para transformar a gestão de seguros?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Agende uma demonstração e descubra como o SeguroScout pode ajudar a sua empresa.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-7 text-lg rounded-xl group transition-all duration-300 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
                onClick={() => window.open('mailto:contacto@norm8.ai?subject=SeguroScout - Solicitar Demo', '_blank')}
              >
                Solicitar Demonstração
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link href="/">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 px-10 py-7 text-lg rounded-xl"
                >
                  <ArrowLeft className="mr-2 w-5 h-5" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}