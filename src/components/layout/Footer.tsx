const navLinks = ['About', 'Residences', 'Features', 'Location', 'Contact'];

export default function Footer() {
  return (
    <footer className="bg-charcoal-700 px-6 md:px-12 lg:px-24 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
          <div>
            <p className="font-heading text-2xl font-bold text-white tracking-widest mb-3">
              BIRKEN LOFTS
            </p>
            <p className="text-sm text-charcoal-200">
              401 W. Ontario Street, Chicago, IL 60654
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-timber-300 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="border-t border-charcoal-500 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-charcoal-300">
            &copy; {new Date().getFullYear()} Birken Lofts. All rights reserved.
          </p>
          <a
            href="https://monroeresidential.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-timber-500 hover:text-timber-300 transition-colors"
          >
            A Monroe Residential Partners Development
          </a>
        </div>
      </div>
    </footer>
  );
}
