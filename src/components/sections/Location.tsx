import { TrainFront, ShoppingBag, Building2, Trees } from 'lucide-react';
import ScrollReveal from '../ui/ScrollReveal';

const distances = [
  { icon: TrainFront, text: 'Chicago & Grand CTA \u2014 3 min walk' },
  { icon: ShoppingBag, text: 'Magnificent Mile \u2014 8 min walk' },
  { icon: Building2, text: 'The Loop \u2014 10 min walk' },
  { icon: Trees, text: 'Chicago Riverwalk \u2014 5 min walk' },
];

export default function Location() {
  return (
    <section id="location" className="bg-cream-200 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <ScrollReveal className="flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-brick-500 mb-4">
            LOCATION
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-charcoal-700 mb-6">
            The Heart of River North
          </h2>
          <p className="text-base leading-relaxed text-charcoal-500 mb-8">
            401 W. Ontario Street places you at the center of Chicago&rsquo;s most dynamic
            neighborhood&mdash;surrounded by world-class galleries, restaurants, and nightlife,
            with easy access to the Loop, Magnificent Mile, and public transit.
          </p>
          <div className="space-y-4">
            {distances.map((d) => (
              <div key={d.text} className="flex items-center gap-3">
                <d.icon className="w-5 h-5 text-brick-500 flex-shrink-0" />
                <span className="text-sm text-charcoal-500">{d.text}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal className="flex-1">
          <div className="rounded-lg overflow-hidden shadow-lg">
            <iframe
              title="Birken Lofts location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2969.5!2d-87.6388!3d41.8935!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880e2cad6f0896c7%3A0x4b0896a0c3e8e8a2!2s401%20W%20Ontario%20St%2C%20Chicago%2C%20IL%2060654!5e0!3m2!1sen!2sus!4v1"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
