import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a QR code (a scannable 2D barcode) for the given value as an <img>.
// `res` oversamples the bitmap relative to the drawn size — print needs a
// higher multiple than screen so module edges stay crisp at printer DPI.
export default function Qr({ value, size = 120, res = 2, className = '' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: size * res, errorCorrectionLevel: 'M' })
      .then((d) => active && setSrc(d))
      .catch(() => active && setSrc(''));
    return () => {
      active = false;
    };
  }, [value, size, res]);

  return src ? (
    <img src={src} width={size} height={size} alt="" className={className} />
  ) : (
    <div style={{ width: size, height: size }} className={`bg-line/40 rounded ${className}`} />
  );
}
