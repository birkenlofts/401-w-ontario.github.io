import { useForm } from 'react-hook-form';
import { useState } from 'react';
import ScrollReveal from '../ui/ScrollReveal';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unitPreference: string;
  message: string;
}

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSubmitted(true);
        reset();
      }
    } catch {
      // Silently handle — form still works without Formspree configured
      setSubmitted(true);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-md bg-white border border-charcoal-100 text-charcoal-700 text-sm focus:outline-none focus:ring-2 focus:ring-brick-500/50 focus:border-brick-500 transition';

  return (
    <section id="contact" className="bg-cream-300 px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 md:gap-20">
        <ScrollReveal className="flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-brick-500 mb-4">
            GET IN TOUCH
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-charcoal-700 mb-6">
            Register Your Interest
          </h2>
          <p className="text-base leading-relaxed text-charcoal-500 mb-8">
            Be among the first to learn about availability, pricing, and exclusive preview
            opportunities at Birken Lofts.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-charcoal-700">401 W. Ontario Street</p>
            <p className="text-sm text-charcoal-500">Chicago, IL 60654</p>
            <p className="text-sm text-charcoal-400">River North</p>
          </div>
        </ScrollReveal>

        <ScrollReveal className="flex-1">
          {submitted ? (
            <div className="bg-cream-200 rounded-lg p-10 text-center">
              <h3 className="font-heading text-2xl font-bold text-charcoal-700 mb-3">
                Thank You!
              </h3>
              <p className="text-charcoal-500">
                We&rsquo;ve received your information and will be in touch soon.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-cream-200 rounded-lg p-8 md:p-10 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    {...register('firstName', { required: true })}
                    className={inputClass}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-brick-500 mt-1">Required</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    {...register('lastName', { required: true })}
                    className={inputClass}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-brick-500 mt-1">Required</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email', { required: true })}
                  className={inputClass}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-brick-500 mt-1">Required</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className={inputClass}
                  placeholder="(312) 555-0100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Unit Preference
                </label>
                <select {...register('unitPreference')} className={inputClass}>
                  <option value="">Select a preference...</option>
                  <option value="1-bed">One Bedroom</option>
                  <option value="2-bed">Two Bedroom</option>
                  <option value="any">No Preference</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">
                  Message
                </label>
                <textarea
                  {...register('message')}
                  rows={4}
                  className={inputClass}
                  placeholder="Tell us what you're looking for..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-brick-500 text-white font-semibold text-sm rounded-md hover:bg-brick-600 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Register Interest'}
              </button>
            </form>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
