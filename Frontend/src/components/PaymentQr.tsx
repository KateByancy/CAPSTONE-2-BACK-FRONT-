"use client";
import {useRef} from 'react';
import Image from 'next/image';
import {imageSource} from './AdminImageUpload';
export default function PaymentQr({src,name}:{src:string;name:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const source=imageSource(src);
 return <div className="marc-payment-qr"><button type="button" onClick={()=>dialog.current?.showModal()} aria-label={'Enlarge GCash QR for '+name} className="marc-payment-qr-trigger"><Image src={source} alt={'GCash QR for '+name} width={1264} height={848} unoptimized className="marc-payment-qr-image"/><span>Tap to enlarge QR</span></button><p className="mt-2 text-center text-xs text-stone-500">Check the recipient in GCash before confirming a transfer.</p><dialog ref={dialog} className="marc-payment-qr-dialog" aria-label="Full-size GCash QR" onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}><form method="dialog"><button autoFocus className="rounded-lg border px-4 py-2 text-sm">Close QR</button></form><Image src={source} alt={'Full-size GCash QR for '+name} width={1264} height={848} unoptimized className="marc-payment-qr-full"/><a href={source} target="_blank" rel="noopener noreferrer" className="block p-3 text-center text-sm underline">Open original image</a></dialog></div>;
}
