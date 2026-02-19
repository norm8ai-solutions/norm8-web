import HeroSection from "@/components/home/HeroSection"
import WhatWeDoSection from "@/components/home/WhatWeDoSection"
import SolutionsSection from "@/components/home/SolutionsSection"
import CustomAutomationSection from "@/components/home/CustomAutomationSection"
import WhyNorm8Section from "@/components/home/WhyNorm8Section"
import VisionSection from "@/components/home/VisionSection"
import CTASection from "@/components/home/CTASection"

export default function Page() {
  return (
    <main className="bg-[#0A0A0F]">
      <HeroSection />
      <WhatWeDoSection />
      <SolutionsSection />
      <CustomAutomationSection />
      <WhyNorm8Section />
      <VisionSection />
      <CTASection />
    </main>
  )
}