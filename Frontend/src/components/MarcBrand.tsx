import Image from 'next/image';

export default function MarcBrand({ light = false }: { light?: boolean }) {
  return (
    <span className={`marc-brand ${light ? 'marc-brand-light' : ''}`}>
      <Image
        className="marc-brand-image"
        src={light ? '/designs/logo%202.png' : '/designs/logo.png'}
        alt="Marc Interior Design — Inspired Living. Timeless Design."
        width={490}
        height={490}
        sizes="(max-width: 600px) 220px, 280px"
      />
    </span>
  );
}
