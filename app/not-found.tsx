import Image from 'next/image';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';

export default function NotFound() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[#060B14] px-6 pt-28 text-[#E8EDF8] sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_28%_12%,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_76%_18%,rgba(14,165,233,0.10),transparent_28%),linear-gradient(135deg,#060B14_0%,#081120_52%,#050814_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px]" />

      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="max-w-2xl">
            <a aria-label="Norm8" className="mb-10 inline-flex items-center" href="/">
              <Image
                alt="Norm8"
                className="h-auto w-[132px]"
                height={42}
                priority
                src="/brand/norm8-logo.png"
                width={158}
              />
            </a>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#60A5FA]">
              Erro 404
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-white sm:text-5xl lg:text-6xl">
              Página não encontrada
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#9AA9C7] sm:text-lg">
              A página que tentou aceder não existe, foi movida ou o link pode estar
              incorreto.
            </p>
            <p className="mt-3 max-w-xl text-base leading-8 text-[#9AA9C7] sm:text-lg">
              Pode voltar ao site da Norm8 ou regressar à página anterior.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#93C5FD]/30 bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(37,99,235,0.28)] transition hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60A5FA]"
                href="/"
              >
                <Home size={16} />
                Voltar ao site
              </a>
              <BackButton className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-5 text-sm font-semibold text-[#D8E2F7] transition hover:border-white/18 hover:bg-white/[0.075] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60A5FA]">
                <ArrowLeft size={16} />
                Voltar atrás
              </BackButton>
            </div>
          </div>

          <aside
            aria-label="Resumo do erro"
            className="rounded-lg border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#60A5FA]/20 bg-[#2563EB]/15 text-[#93C5FD]">
              404
            </div>
            <h2 className="mt-6 text-lg font-semibold text-white">Link indisponível</h2>
            <p className="mt-3 text-sm leading-6 text-[#8FA2C4]">
              Se chegou aqui a partir de uma ligação partilhada, confirme se o endereço
              está completo e atualizado.
            </p>
            <a
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#93C5FD] transition hover:text-white"
              href="/marcar-reuniao"
            >
              Falar com a Norm8
              <ArrowRight size={15} />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}