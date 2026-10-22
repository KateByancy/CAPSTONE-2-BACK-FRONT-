"use client";
import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api';
import { imageSource } from '@/components/AdminImageUpload';
export interface CatalogDesign {id:string; name:string; category:string; image:string; description:string; price:number|null;features:string[]}
export function designPrice(price?:number|null) {return price == null ? 'Price on request' : 'From PHP '+Number(price).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});}
export function useDesignCatalog(){
 const [designs,setDesigns]=useState<CatalogDesign[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{const controller=new AbortController();const load=async()=>{try{const response=await fetch(getApiUrl()+'/design-catalog',{cache:'no-store',signal:controller.signal});const rows=await response.json();if(!response.ok||!Array.isArray(rows))throw Error('Unable to load designs.');setDesigns(rows.map(item=>({...item,image:imageSource(item.image),features: Array.isArray(item.features)?item.features:typeof item.features==='string'?JSON.parse(item.features):[],price:item.price==null?null:Number(item.price)})));setError('');}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Unable to load designs.');}finally{if(!controller.signal.aborted)setLoading(false);}};void load();const timer=setInterval(()=>void load(),15000);return()=>{controller.abort();clearInterval(timer);};},[]);
 return {designs,error,loading};
}
