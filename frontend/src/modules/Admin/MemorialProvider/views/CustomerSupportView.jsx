import React from 'react';
import { HeartHandshake } from 'lucide-react';

/**
 * There is no vendor-to-customer chat backend anywhere in this app (no
 * Conversation/Message model tied to a booking) — the previous version of
 * this screen was a fully hardcoded fake chat with invented customers,
 * messages, and a fake voice-call overlay. Real customer callback requests
 * (name, phone, message) are available on the Service Requests page instead.
 */
export function CustomerSupportView() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-[20px] border border-border-light">
      <HeartHandshake size={40} className="text-text-disabled mb-4" />
      <h3 className="text-base font-bold text-text-primary">In-app chat isn't available yet</h3>
      <p className="text-sm text-text-secondary mt-2 max-w-sm leading-relaxed">
        There's no messaging backend for vendor-to-customer chat. Real customer contact details
        (phone, message) are on the Service Requests page for callback requests you've claimed.
      </p>
    </div>
  );
}
