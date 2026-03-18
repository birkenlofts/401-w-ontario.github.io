import { useState } from 'react';
import { X } from 'lucide-react';
import { units } from '../../data/units';
import SectionHeading from '../ui/SectionHeading';
import ScrollReveal from '../ui/ScrollReveal';

export default function Units() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <section id="residences" className="bg-charcoal-700 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <SectionHeading
            tag="RESIDENCES"
            title="Find Your Loft"
            description="57 thoughtfully designed residences ranging from efficient studios to spacious two-bedrooms"
            light
          />
        </ScrollReveal>

        {/* Stats */}
        <ScrollReveal className="flex justify-center gap-12 md:gap-20 mt-12 mb-16">
          {[
            { value: '57', label: 'Total Units' },
            { value: '564\u2013819', label: 'Square Feet' },
            { value: '1\u20132', label: 'Bedrooms' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-4xl md:text-5xl font-bold text-brick-500">
                {stat.value}
              </p>
              <p className="text-sm text-charcoal-200 mt-1">{stat.label}</p>
            </div>
          ))}
        </ScrollReveal>

        {/* Unit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {units.map((unit) => (
            <ScrollReveal key={unit.id}>
              <div
                className="bg-charcoal-600 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setLightbox(unit.floorPlanImage)}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={unit.floorPlanImage}
                    alt={`${unit.name} floor plan`}
                    className="w-full h-64 object-contain bg-charcoal-800 p-4 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-2xl font-semibold text-white mb-1">
                    {unit.name}
                  </h3>
                  <p className="text-sm text-charcoal-200 mb-3">
                    {unit.bedrooms} Bed &bull; {unit.bathrooms} Bath &bull; {unit.sqft} SF
                  </p>
                  <p className="text-sm text-timber-300 leading-relaxed">
                    {unit.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-6 right-6 text-white hover:text-brick-400 transition-colors"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
            >
              <X size={32} />
            </button>
            <img
              src={lightbox}
              alt="Floor plan detail"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        )}
      </div>
    </section>
  );
}
