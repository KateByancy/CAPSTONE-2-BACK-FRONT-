import ProjectQuotes from '@/components/ProjectQuotes';
export default async function Quotes({searchParams}:{searchParams:Promise<{booking?:string}>}){const {booking}=await searchParams;return <ProjectQuotes key={booking||'all'} initialBookingId={booking} role="admin"/>;}
