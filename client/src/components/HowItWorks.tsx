import { Bell, Search, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Search,
    title: "Create Alert",
    description: "Set up custom alerts for your favorite spirit brands with specific search criteria and price limits."
  },
  {
    icon: Bell,
    title: "Set Criteria",
    description: "Define multiple name matches and maximum price points to ensure you only get notified about bottles you want."
  },
  {
    icon: Zap,
    title: "Get Notified",
    description: "Receive instant notifications when matching bottles become available on baxus.co, so you never miss a deal."
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl font-semibold text-center mb-16">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
