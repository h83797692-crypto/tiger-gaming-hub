"use client";

import { DonationModal } from "@/components/DonationModal";

export function DonationButton() {
  return (
    <div className="donation-floating-button fixed left-4 top-1/2 z-50 -translate-y-1/2" dir="rtl">
      <DonationModal />
    </div>
  );
}