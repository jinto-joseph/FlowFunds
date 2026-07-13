import { useEffect, useRef, useState } from "react";

export default function QRScannerModal({ isOpen, onClose, onScanned }) {
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }
    startCameraScanner();
    return () => stopScanner();
  }, [isOpen]);

  function stopScanner() {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().catch(() => {});
      scannerInstanceRef.current.clear().catch(() => {});
      scannerInstanceRef.current = null;
    }
  }

  async function startCameraScanner() {
    setError("");
    setScanning(true);
    try {
      // Wait for DOM element
      await new Promise((r) => setTimeout(r, 300));
      const el = document.getElementById("qr-reader");
      if (!el) { setError("Scanner element not found"); setScanning(false); return; }
      
      if (typeof window.Html5Qrcode === "undefined") {
        setError("QR scanner library not loaded. Please check your internet connection.");
        setScanning(false);
        return;
      }

      const html5QrCode = new window.Html5Qrcode("qr-reader");
      scannerInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleDecodedText(decodedText);
          stopScanner();
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      setError("Camera access denied or unavailable.");
      setScanning(false);
    }
  }

  function handleDecodedText(text) {
    // Parse UPI URI: upi://pay?pa=xxx&pn=yyy&am=zzz&cu=INR
    const parsed = parseUpiUri(text);
    if (parsed) {
      onScanned(parsed);
      onClose();
    } else {
      setError("Not a valid UPI QR code. Please scan a UPI payment QR code.");
    }
  }

  function parseUpiUri(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (!lower.startsWith("upi://pay")) return null;

    try {
      const queryIdx = text.indexOf("?");
      if (queryIdx === -1) return null;
      const queryString = text.slice(queryIdx + 1);
      
      const params = new URLSearchParams(queryString);
      return {
        upiId: params.get("pa") || "",
        payeeName: params.get("pn") || "",
        amount: params.get("am") || "",
        currency: params.get("cu") || "INR",
        transactionNote: params.get("tn") || "",
        rawUri: text,
      };
    } catch {
      return null;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="glass-card w-full max-w-md p-5 relative animate-fade-in-up">
        {/* Close */}
        <button
          onClick={() => { stopScanner(); onClose(); }}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        <h3 className="section-title mb-4">
          <span>📷</span>
          <span>Scan UPI QR Code</span>
        </h3>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Camera Scanner */}
        <div>
          <div
            id="qr-reader"
            ref={scannerRef}
            className="w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50"
            style={{ minHeight: "280px" }}
          />
          <p className="text-xs text-slate-500 text-center mt-3">
            Point your camera at a UPI QR code
          </p>
        </div>
      </div>
    </div>
  );
}
