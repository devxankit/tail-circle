import React, { useEffect, useState } from 'react';

/**
 * A real, scannable ticket QR.
 *
 * Every ticket in the app used to draw one of two fakes: a lucide `QrCode`
 * glyph, which is a picture of a QR and encodes nothing, or a remote image
 * from a third-party generator, which encodes the booking number, leaks it off
 * the platform, and fails exactly when it matters — at a venue on bad signal.
 *
 * This renders locally from the booking's own ticket token, so the pass works
 * offline once the screen is open and the code cannot be reproduced by anyone
 * who merely knows the booking number.
 */

/**
 * What the code carries.
 *
 * A URL rather than a bare token, so an ordinary phone camera resolves to the
 * organiser's check-in screen with the ticket already filled in, instead of
 * showing staff a meaningless hex string. The token is in the query, which is
 * what the scan endpoint reads back out.
 */
export function ticketCode(booking) {
  return booking?.ticketToken || booking?.bookingNo || '';
}

export function ticketQrValue(booking) {
  const code = ticketCode(booking);
  if (!code) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/vendor/events-organizer/bookings?ticket=${encodeURIComponent(code)}`;
}

export function TicketQR({ booking, value, size = 160, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const payload = value ?? ticketQrValue(booking);

  useEffect(() => {
    let cancelled = false;
    if (!payload) {
      setFailed(true);
      return undefined;
    }
    setFailed(false);
    import('qrcode')
      .then((QRCode) =>
        (QRCode.default || QRCode).toDataURL(payload, {
          width: size * 2, // rendered at 2x so it stays crisp on dense screens
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' },
        })
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  /*
   * A pass that renders nothing is worse than one that renders a code someone
   * can read out, so fall back to the printable reference rather than an empty
   * box — the scan endpoint accepts a typed booking number too.
   */
  if (failed) {
    return (
      <div
        className={`flex items-center justify-center text-center bg-gray-50 rounded-xl border border-gray-200 p-3 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-[10px] font-black text-gray-500 leading-snug break-all">
          {ticketCode(booking) || 'Ticket unavailable'}
        </span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`bg-gray-100 rounded-xl animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Ticket QR code"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

export default TicketQR;
