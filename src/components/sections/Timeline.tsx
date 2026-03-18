import { milestones } from '../../data/timeline';
import SectionHeading from '../ui/SectionHeading';
import ScrollReveal from '../ui/ScrollReveal';

export default function Timeline() {
  return (
    <section id="timeline" className="bg-charcoal-700 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <SectionHeading
            tag="TIMELINE"
            title="The Journey to Home"
            light
          />
        </ScrollReveal>

        {/* Desktop horizontal timeline */}
        <div className="hidden md:flex mt-16 justify-center">
          {milestones.map((ms, i) => (
            <div key={ms.title} className="flex-1 flex flex-col items-center text-center px-4 relative">
              {/* Connector line */}
              {i < milestones.length - 1 && (
                <div className={`absolute top-3 left-1/2 w-full h-0.5 ${
                  ms.status === 'completed' ? 'bg-brick-500' : 'bg-charcoal-500'
                }`} />
              )}

              {/* Dot */}
              <div className={`relative z-10 w-6 h-6 rounded-full border-2 ${
                ms.status === 'current'
                  ? 'bg-brick-500 border-brick-300 ring-4 ring-brick-500/30'
                  : ms.status === 'completed'
                  ? 'bg-brick-500 border-brick-500'
                  : 'bg-charcoal-600 border-charcoal-400'
              }`} />

              <div className="mt-6">
                <p className={`text-xs font-semibold tracking-wider mb-2 ${
                  ms.status === 'current' ? 'text-brick-500' : 'text-charcoal-300'
                }`}>
                  {ms.date.toUpperCase()}
                </p>
                <h3 className={`font-heading text-lg font-semibold mb-2 ${
                  ms.status === 'upcoming' ? 'text-timber-300' : 'text-white'
                }`}>
                  {ms.title}
                </h3>
                <p className="text-xs text-charcoal-200 leading-relaxed max-w-[200px] mx-auto">
                  {ms.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile vertical timeline */}
        <div className="md:hidden mt-12 space-y-8 pl-8 border-l-2 border-charcoal-500">
          {milestones.map((ms) => (
            <div key={ms.title} className="relative">
              <div className={`absolute -left-[calc(2rem+5px)] w-3 h-3 rounded-full ${
                ms.status === 'current'
                  ? 'bg-brick-500 ring-4 ring-brick-500/30'
                  : ms.status === 'completed'
                  ? 'bg-brick-500'
                  : 'bg-charcoal-500'
              }`} />
              <p className={`text-xs font-semibold tracking-wider mb-1 ${
                ms.status === 'current' ? 'text-brick-500' : 'text-charcoal-300'
              }`}>
                {ms.date.toUpperCase()}
              </p>
              <h3 className={`font-heading text-lg font-semibold mb-1 ${
                ms.status === 'upcoming' ? 'text-timber-300' : 'text-white'
              }`}>
                {ms.title}
              </h3>
              <p className="text-sm text-charcoal-200">{ms.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
