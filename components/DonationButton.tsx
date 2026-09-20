"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DonationModal } from "@/components/DonationModal";

export function DonationButton() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="donation-floating-button fixed left-4 top-1/2 z-50 -translate-y-1/2" dir="rtl">
      <button type="button" className="donation-trigger" onClick={() => setVisible(false)} aria-label="إخفاء دعم المشروع">
        <X size={16} aria-hidden="true" />
      </button>
      <DonationModal />
    </div>
  );
}