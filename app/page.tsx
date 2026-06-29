import HeroSection from '@/components/home/HeroSection';
import SolutionsSection from '@/components/home/SolutionsSection';
import ProductsSection from '@/components/home/ProductsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import CustomAutomationSection from '@/components/home/CustomAutomationSection';
import SecuritySection from '@/components/home/SecuritySection';
import FinalCTASection from '@/components/home/FinalCTASection';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060B14]">
      <HeroSection />

      <section id="solucoes">
        <SolutionsSection />
      </section>

      <section id="produtos">
        <ProductsSection />
      </section>

      <section id="como-funciona">
        <HowItWorksSection />
      </section>

      <section id="automacao">
        <CustomAutomationSection />
      </section>

      <section id="contacto">
        <SecuritySection />
        <FinalCTASection />
      </section>
    </main>
  );
}