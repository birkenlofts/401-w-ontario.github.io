import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/elevations/401-W-Ontario-No-Signs.jpg)' }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-700/80 via-charcoal-700/60 to-charcoal-700/85" />

      <div className="relative z-10 text-center px-6 max-w-4xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs md:text-sm font-medium tracking-[0.3em] text-brick-300 mb-6"
        >
          RIVER NORTH &bull; CHICAGO
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-heading text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-wider mb-4"
        >
          BIRKEN LOFTS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="font-heading italic text-xl md:text-2xl text-cream-300 mb-3"
        >
          Historic Loft Living, Reimagined
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm md:text-base text-charcoal-200 mb-10"
        >
          57 residences within the landmark S. Birkenstein &amp; Sons Building
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="#contact"
            className="px-10 py-4 bg-brick-500 text-white font-semibold text-sm hover:bg-brick-600 transition-colors"
          >
            Stay Informed
          </a>
          <a
            href="#residences"
            className="px-10 py-4 border border-cream-300 text-cream-300 font-medium text-sm hover:bg-white/10 transition-colors"
          >
            Floor Plans
          </a>
        </motion.div>
      </div>
    </section>
  );
}
