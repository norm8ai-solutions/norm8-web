'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function CTASection() {
  const handleScrollToSolutions = (): void => {
    document.getElementById('solucoes')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const handleContactClick = (): void => {
    window.location.href = 'mailto:contacto@norm8.ai';
  };

  return (
    <section id="contacto" className="relative overflow-hidden bg-[#0A0A0F] py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-[500px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2.5rem]"
        >
          {/* Card Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-pink-600/10" />
          <div className="absolute inset-0 bg-[#0A0A0F]/80" />
          <div className="absolute inset-[1px] rounded-[2.5rem] bg-gradient-to-br from-white/[0.08] to-white/[0.02]" />

          <div className="relative p-12 text-center md:p-16 lg:p-20">
            {/* Decorative Elements */}
            <div className="absolute left-6 top-6 h-20 w-20 rounded-full border border-white/10" />
            <div className="absolute bottom-6 right-6 h-32 w-32 rounded-full border border-white/5" />
            <div className="absolute left-8 top-1/2 h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <div className="absolute right-12 top-1/4 h-2 w-2 rounded-full bg-purple-400 animate-pulse delay-500" />

            <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Pronto para escalar com
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Inteligência Artificial?
              </span>
            </h2>

            <p className="mx-auto mb-12 max-w-2xl text-xl text-gray-400">
              Descubra como a Norm8 pode transformar o seu negócio com soluções
              de IA personalizadas e escaláveis.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={handleScrollToSolutions}
                className="group rounded-xl bg-white px-10 py-7 text-lg text-gray-900 shadow-2xl shadow-white/10 transition-all duration-300 hover:bg-gray-100"
              >
                Explorar Soluções
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={handleContactClick}
                className="rounded-xl border-white/20 px-10 py-7 text-lg text-white transition-all duration-300 hover:bg-white/10"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Falar com a Norm8
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}