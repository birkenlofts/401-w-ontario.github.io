interface Props {
  tag: string;
  title: string;
  description?: string;
  light?: boolean;
}

export default function SectionHeading({ tag, title, description, light }: Props) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <p className={`text-xs font-semibold tracking-[0.2em] mb-4 ${light ? 'text-brick-300' : 'text-brick-500'}`}>
        {tag}
      </p>
      <h2 className={`text-4xl md:text-5xl font-heading font-bold mb-4 ${light ? 'text-white' : 'text-charcoal-700'}`}>
        {title}
      </h2>
      {description && (
        <p className={`text-base ${light ? 'text-charcoal-200' : 'text-charcoal-400'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
