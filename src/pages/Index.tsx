import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Differentiators from "@/components/Differentiators";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <Differentiators />
      <Pricing />
      <Testimonials />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
