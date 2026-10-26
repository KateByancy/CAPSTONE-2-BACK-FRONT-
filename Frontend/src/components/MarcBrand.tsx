import Image from 'next/image';

interface MarcBrandProps {
  light?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export default function MarcBrand({ light = false, iconOnly = false, className = '' }: MarcBrandProps) {
  return (
    <span className={`${iconOnly ? 'marc-brand-icon' : 'marc-brand'} ${light ? 'marc-brand-light' : ''} ${className}`}>
      <Image
        className="marc-brand-image"
        src={light ? '/designs/logo%202.png' : '/designs/logo.png'}
        alt={iconOnly ? "Marc Interior Design MS Logo" : "Marc Interior Design — Inspired Living. Timeless Design."}
        width={490}
        height={490}
        sizes={iconOnly ? "64px" : "(max-width: 600px) 220px, 280px"}
        priority
      />
    </span>
  );
}
