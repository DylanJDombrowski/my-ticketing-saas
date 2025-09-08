import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { Pricing } from "@/components/home/pricing";
import { CTA } from "@/components/home/cta";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Pricing />
      <CTA />
    </div>
  );
}
