import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

interface Props {
  onDetected: (isbn: string) => void;
}

// Live camera-scanner die ISBN-barcodes (EAN-13) leest via ZXing.
export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // onDetected in een ref houden zodat we de camera niet herstarten bij re-renders.
  const cb = useRef(onDetected);
  cb.current = onDetected;

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let stopped = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) {
          cb.current(result.getText());
        }
      })
      .then((c) => {
        if (stopped) c.stop();
        else controls = c;
      })
      .catch((err) => {
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Geen toegang tot de camera. Geef toestemming of gebruik het ISBN-veld hieronder.'
            : 'Kon de camera niet starten. Gebruik het ISBN-veld hieronder.',
        );
      });

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  if (error) {
    return <p className="scanner-error">{error}</p>;
  }

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" muted playsInline />
      <div className="scanner-frame" />
      <p className="scanner-hint">Richt op de streepjescode achterop het boek</p>
    </div>
  );
}
