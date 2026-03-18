import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import About from './components/sections/About';
import Units from './components/sections/Units';
import Features from './components/sections/Features';
import Location from './components/sections/Location';
import Timeline from './components/sections/Timeline';
import Contact from './components/sections/Contact';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Units />
        <Features />
        <Location />
        <Timeline />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
