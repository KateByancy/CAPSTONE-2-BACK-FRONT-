"use client";

import GCashPayments from '@/components/GCashPayments';

export default function Payments({ onBack }: { onBack?: () => void }) {
  return <GCashPayments role="client" onBack={onBack} />;
}
