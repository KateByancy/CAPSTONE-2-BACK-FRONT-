"use client";
import {useState} from 'react';
import {apiFetch,getApiUrl} from '@/lib/api';
const labels:Record<string,string>={request_created:'Payment request issued',receipt_submitted:'Receipt submitted for verification',payment_confirmed:'Funds confirmed by admin',receipt_returned:'Receipt returned for correction',request_cancelled:'Payment request cancelled'};
export default function PaymentHistory({id}:{id:number}){
 const [rows,setRows]=useState<Array<{event:string;created_at:string}>>([]);
 const [status,setStatus]=useState('');
 async function load(){setStatus('Loading history...');try{const response=await apiFetch(getApiUrl()+'/payment/'+id+'/history');const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to load payment history.');setRows(result.history);setStatus(result.history.length?'':'No new audit events. Earlier payment records remain in your payment list.');}catch(error){setStatus(error instanceof Error?error.message:'Unable to load history.');}}
 return <details className="mt-4 border-t border-stone-200 pt-3" onToggle={event=>{if(event.currentTarget.open)void load();}}><summary className="cursor-pointer text-xs font-semibold text-brand-800">Payment history</summary>{status && <p role="status" className="mt-3 text-xs text-stone-500">{status}</p>}<ol className="mt-3 space-y-3">{rows.map((row,index)=><li key={index} className="border-l-2 border-brand-200 pl-3 text-xs"><p>{labels[row.event]||row.event.replaceAll('_',' ')}</p><time className="mt-1 block text-stone-500">{new Date(row.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} (PH)</time></li>)}</ol></details>;
}
