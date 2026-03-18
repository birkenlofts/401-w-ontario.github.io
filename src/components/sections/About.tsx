import ScrollReveal from '../ui/ScrollReveal';

export default function About() {
  return (
    <section id="about" className="bg-cream-200 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <ScrollReveal className="flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-brick-500 mb-4">
            OUR STORY
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-charcoal-700 mb-6">
            A Legacy Renewed
          </h2>
          <p className="text-base leading-relaxed text-charcoal-500 mb-5">
            Built in 1905 as the headquarters for the S. Birkenstein &amp; Sons Company, this
            heavy timber loft building has stood as a testament to Chicago&rsquo;s industrial
            heritage for over a century. Located in the heart of River North, its red brick
            facade and arched windows have witnessed the neighborhood&rsquo;s transformation
            from manufacturing hub to one of the city&rsquo;s most vibrant districts.
          </p>
          <p className="text-base leading-relaxed text-charcoal-500">
            Birken Lofts honors this legacy through a thoughtful adaptive
            reuse&mdash;preserving the building&rsquo;s defining character elements including
            exposed heavy timber beams, original masonry walls, and distinctive arched window
            openings&mdash;while introducing 57 modern residences designed for contemporary
            living.
          </p>
        </ScrollReveal>

        <ScrollReveal className="flex-1">
          <img
            src="/images/elevations/401-W-Ontario-No-Signs-Black-White.jpg"
            alt="S. Birkenstein & Sons Building, 1905"
            className="w-full h-auto rounded object-cover"
            loading="lazy"
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
