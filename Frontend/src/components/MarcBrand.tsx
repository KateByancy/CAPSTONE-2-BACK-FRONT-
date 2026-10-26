import Image from 'next/image';

interface MarcBrandProps {
  light?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export default function MarcBrand({ light = false, iconOnly = false, className = '' }: MarcBrandProps) {
  if (iconOnly) {
    const iconSrc = light ? '/designs/ms-logo-light.png' : '/designs/ms-logo-dark.png';
    return (
      <span className={`marc-brand-icon ${light ? 'marc-brand-light' : ''} ${className}`}>
        <Image
          className="marc-brand-standalone-icon"
          src={iconSrc}
          alt="Marc Interior Design MS Logo"
          width={94}
          height={99}
          unoptimized
          priority
        />
      </span>
    );
  }

  return (
    <span className={`marc-brand ${light ? 'marc-brand-light' : ''} ${className}`}>
      <Image
        className="marc-brand-image"
        src={light ? '/designs/logo%202.png' : '/designs/logo.png'}
        alt="Marc Interior Design — Inspired Living. Timeless Design."
        width={490}
        height={490}
        sizes="(max-width: 600px) 220px, 280px"
        priority
      />
    </span>
  );
}
