import Hero from "@/components/hero/Hero";
import ImpactSection from "@/components/impact/ImpactSection";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ImpactSection />
        {/* Placeholder for next section — builds continue here */}
        <div
          className="relative z-10 flex h-screen items-center justify-center bg-[#040302]"
          id="services"
        >
          <p className="font-mono text-xs tracking-widest text-white/20 uppercase">
            Next Section →
          </p>
        </div>
      </main>
    </>
  );
}
