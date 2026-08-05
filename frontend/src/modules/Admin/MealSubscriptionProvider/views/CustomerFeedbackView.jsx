import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * There is no review/feedback backend for meal-subscription providers —
 * `Review.targetType` only covers product/provider/doctor/event, so a meal
 * vendor's customer feedback can never be fetched. The previous version of
 * this screen rendered a fully interactive-looking inbox (search, reply,
 * archive, resolve) wired to a `feedback` array that was permanently empty
 * and a local-only mutator with nothing behind it — that's worse than
 * telling the vendor plainly that this isn't wired up yet.
 */
export function CustomerFeedbackView() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-24 bg-white rounded-3xl border border-gray-100">
      <MessageSquare size={40} className="text-gray-200 mb-4" />
      <h3 className="text-base font-bold text-gray-700">Customer feedback isn't available yet</h3>
      <p className="text-sm text-gray-400 mt-2 max-w-sm">
        There's no review or feedback model wired up for meal-subscription vendors on the backend yet —
        this page will show real reviews once that's built.
      </p>
    </div>
  );
}
