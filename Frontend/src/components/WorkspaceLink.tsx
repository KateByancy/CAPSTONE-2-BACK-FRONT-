"use client";
import Link from 'next/link';import type {ReactNode} from 'react';
// The client workspace uses URL selection state instead of separate page routes.
export default function WorkspaceLink({href,children,className}:{href:string;children:ReactNode;className?:string}){
 return <Link href={href} className={className} onClick={event=>{
  if(href.startsWith('/?screen=')&&window.location.pathname==='/'&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
   event.preventDefault();window.history.pushState(null,'',href);window.dispatchEvent(new Event('marc-navigation-change'));
  }
 }}>{children}</Link>;
}
