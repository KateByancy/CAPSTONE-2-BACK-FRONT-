"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { imageSource } from './AdminImageUpload';

const PRIMARY_QR = '/designs/gcash%20qr.jpg';
const BACKUP_QR = '/designs/gcash-qr.jpg';

export default function PaymentQr({ src, name }: { src?: string | null; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initialSource = imageSource(src || PRIMARY_QR);
  const [currentSrc, setCurrentSrc] = useState(initialSource);
  const [attemptedBackup, setAttemptedBackup] = useState(false);

  useEffect(() => {
    setCurrentSrc(imageSource(src || PRIMARY_QR));
    setAttemptedBackup(false);
  }, [src]);

  const handleImageError = () => {
    if (currentSrc !== PRIMARY_QR) {
      setCurrentSrc(PRIMARY_QR);
    } else if (!attemptedBackup) {
      setAttemptedBackup(true);
      setCurrentSrc(BACKUP_QR);
    }
  };

  return (
    <div className="marc-payment-qr">
      <button 
        type="button" 
        onClick={() => dialog.current?.showModal()} 
        aria-label={'Enlarge GCash QR for ' + name} 
        className="marc-payment-qr-trigger"
      >
        <Image 
          src={currentSrc} 
          alt={'GCash QR for ' + name} 
          width={1264} 
          height={848} 
          unoptimized 
          onError={handleImageError}
          className="marc-payment-qr-image" 
        />
        <span>Tap to enlarge QR</span>
      </button>
      <p className="mt-2 text-center text-xs text-stone-500">
        Check the recipient in GCash before confirming a transfer.
      </p>
      <dialog 
        ref={dialog} 
        className="marc-payment-qr-dialog" 
        aria-label="Full-size GCash QR" 
        onClick={event => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <form method="dialog">
          <button autoFocus className="rounded-lg border px-4 py-2 text-sm">Close QR</button>
        </form>
        <Image 
          src={currentSrc} 
          alt={'Full-size GCash QR for ' + name} 
          width={1264} 
          height={848} 
          unoptimized 
          onError={handleImageError}
          className="marc-payment-qr-full" 
        />
        <a 
          href={currentSrc} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block p-3 text-center text-sm underline"
        >
          Open original image
        </a>
      </dialog>
    </div>
  );
}
