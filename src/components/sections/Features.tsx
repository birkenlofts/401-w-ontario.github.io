import {
  TreePine, Landmark, Sun, WashingMachine,
  ChefHat, MapPin, Award, ArrowUpFromLine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { features } from '../../data/features';
import SectionHeading from '../ui/SectionHeading';
import ScrollReveal from '../ui/ScrollReveal';

const iconMap: Record<string, LucideIcon> = {
  TreePine, Landmark, Sun, WashingMachine,
  ChefHat, MapPin, Award, ArrowUpFromLine,
};

export default function Features() {
  return (
    <section id="features" className="bg-cream-300 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <SectionHeading
            tag="FEATURES"
            title="Where Heritage Meets Modern Living"
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <ScrollReveal key={feature.title}>
                <div className="bg-cream-200 rounded-lg p-8 h-full">
                  {Icon && <Icon className="w-8 h-8 text-brick-500 mb-4" />}
                  <h3 className="font-heading text-lg font-semibold text-charcoal-700 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-charcoal-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
