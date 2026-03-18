import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import useScrollSpy from '../../hooks/useScrollSpy';

const links = [
  { id: 'about', label: 'About' },
  { id: 'residences', label: 'Residences' },
  { id: 'features', label: 'Features' },
  { id: 'location', label: 'Location' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useScrollSpy();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-charcoal-700/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-20">
        <a href="#hero" className="font-heading text-xl md:text-2xl font-bold text-white tracking-widest">
          BIRKEN LOFTS
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={`text-sm transition-colors ${
                active === link.id ? 'text-brick-400' : 'text-timber-300 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-charcoal-700/98 backdrop-blur-sm border-t border-charcoal-600 px-6 pb-6">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setMenuOpen(false)}
              className={`block py-3 text-sm ${
                active === link.id ? 'text-brick-400' : 'text-timber-300'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
