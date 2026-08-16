'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useScrollSpy from '@/hooks/useScrollSpy';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const onHome = pathname === '/';
  const active = useScrollSpy(onHome);
  const onHistory = pathname.startsWith('/history');
  const onBlog = pathname.startsWith('/blog');
  const onThingsToDo = pathname.startsWith('/things-to-do');

  const links = [
    { href: '/#top', label: 'Home', current: onHome && active === '' },
    { href: '/#plans', label: 'Floor Plans', current: onHome && active === 'plans' },
    { href: '/#amenities', label: 'Amenities', current: onHome && active === 'amenities' },
    { href: '/#neighborhood', label: 'Neighborhood', current: onHome && active === 'neighborhood' },
    { href: '/things-to-do/', label: 'Things to Do', current: onThingsToDo },
    { href: '/history/', label: 'History', current: onHistory },
    { href: '/blog/', label: 'Journal', current: onBlog },
  ];

  const close = () => setOpen(false);

  // While the overlay menu is open: lock page scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector('a')?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <nav className="site-nav">
        <Link href="/" className="nav-brand" onClick={close}>Birken Lofts</Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.label} href={l.href} aria-current={l.current ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
          <Link className="btn btn-primary" href="/#contact">Contact us</Link>
        </div>
        <button
          ref={menuBtnRef}
          className="nav-menu-btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="nav-drawer"
        >
          <span className={`nav-burger${open ? ' nav-burger--open' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>
      {open && (
        <div className="nav-drawer" ref={drawerRef} id="nav-drawer">
          <nav className="drawer-links" aria-label="Site">
            {links.map((l, i) => (
              <Link key={l.label} href={l.href} onClick={close} aria-current={l.current ? 'page' : undefined}>
                {l.label}
                <span className="drawer-num">{String(i + 1).padStart(2, '0')}</span>
              </Link>
            ))}
          </nav>
          <div className="drawer-foot">
            <Link className="btn btn-primary" href="/#contact" onClick={close}>Contact us</Link>
            <div className="drawer-address">401 W. Ontario Street, Chicago</div>
          </div>
        </div>
      )}
    </>
  );
}
