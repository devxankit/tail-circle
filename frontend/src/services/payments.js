import { api } from './api';

/**
 * Shared Razorpay checkout-sheet helper. `razorpay` is the payload returned
 * by any checkout/booking endpoint: { razorpayOrderId, amount, currency }.
 * Resolves after the payment is verified server-side; rejects on dismiss.
 */

let scriptPromise = null;

function loadRazorpayScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load Razorpay — check your connection'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function payWithRazorpay(razorpay, { description } = {}) {
  await loadRazorpayScript();
  await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: razorpay.razorpayOrderId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      name: 'TailCircle',
      description: description || 'TailCircle payment',
      handler: async (res) => {
        try {
          await api.post('/payments/verify', {
            razorpayOrderId: res.razorpay_order_id,
            razorpayPaymentId: res.razorpay_payment_id,
            signature: res.razorpay_signature,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      theme: { color: '#599D9A' },
    });
    rzp.on('payment.failed', (res) => reject(new Error(res.error?.description || 'Payment failed')));
    rzp.open();
  });
}
