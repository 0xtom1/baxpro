import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";

export default function SocialProof() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <Card className="p-12 text-center mb-12">
          <Quote className="w-12 h-12 text-primary mx-auto mb-6 opacity-20" />
          <blockquote className="text-2xl md:text-3xl font-serif mb-6 leading-relaxed">
            "This service saved me from missing out on a limited Pappy Van Winkle release. The alerts are instant and the price filtering is perfect."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div>
              <p className="font-semibold">Michael R.</p>
              <p className="text-sm text-muted-foreground">Spirits Collector, Nashville</p>
            </div>
          </div>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6">
            <Quote className="w-8 h-8 text-primary mb-4 opacity-20" />
            <p className="text-lg mb-4">"Finally found my unicorn bottle thanks to the multi-string alerts. Game changer!"</p>
            <p className="font-semibold">Sarah K.</p>
            <p className="text-sm text-muted-foreground">Louisville, KY</p>
          </Card>
          
          <Card className="p-6">
            <Quote className="w-8 h-8 text-primary mb-4 opacity-20" />
            <p className="text-lg mb-4">"The price alerts ensure I never overpay. Simple, effective, and reliable."</p>
            <p className="font-semibold">James T.</p>
            <p className="text-sm text-muted-foreground">Austin, TX</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
