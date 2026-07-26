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
    return (
      <p className="status status--error">
        <span className="status__dot" />
        {error}
      </p>
    );
  }

  return (
    <div className="scanner__stage">
      <video ref={videoRef} className="scanner__video" muted playsInline />
      <div className="scanner__frame" />
      <p className="scanner__hint">Houd de streepjescode op de achterkant in beeld</p>
    </div>
  );
}
