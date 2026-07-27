'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
};

/** QR généré localement (pas de dépendance à un CDN externe). */
export default function QrCodeImage({
  value,
  size = 200,
  alt = 'QR code',
  className,
}: Props) {
  const [src, setSrc] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setErr('');
    setSrc('');
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setErr('QR indisponible');
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (err) {
    return (
      <div
        className={`flex items-center justify-center border rounded-lg text-xs text-red-600 ${className || ''}`}
        style={{ width: size, height: size }}
      >
        {err}
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`border rounded-lg bg-gray-50 animate-pulse ${className || ''}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
