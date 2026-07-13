import { useEffect, useRef, useState } from "react";

export default function QRScannerModal({ isOpen, onClose, onScanned }) {
  const [mode, setMode] = useState("camera"); // "camera" | "file"
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }
    if (mode === "camera") {
      startCameraScanner();
    }
    return () => stopScanner();
  }, [isOpen, mode]);

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
      setError("Camera access denied or unavailable. Try uploading an image instead.");
      setScanning(false);
      setMode("file");
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (typeof window.Html5Qrcode === "undefined") {
      setError("QR scanner library not loaded.");
      return;
    }

    const html5QrCode = new window.Html5Qrcode("qr-reader-file");
    html5QrCode
      .scanFile(file, true)
      .then((decodedText) => {
        handleDecodedText(decodedText);
      })
      .catch((err) => {
        console.error("QR image scan error:", err);
        setError("Could not read QR code from image. Please try a clearer image.");
      });
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
    // Match both upi://pay? and just upi://pay (some QRs use lowercase)
    const lower = text.toLowerCase();
    if (!lower.startsWith("upi://pay")) return null;

    try {
      const url = new URL(text.replace(/^upi:\/\//i, "https://upi.placeholder/"));
      const params = url.searchParams;
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

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "camera"
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            📹 Camera
          </button>
          <button
            type="button"
            onClick={() => { stopScanner(); setMode("file"); }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "file"
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            🖼️ Upload Image
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {mode === "camera" ? (
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
        ) : (
          <div>
            <div id="qr-reader-file" style={{ display: "none" }} />
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-primary/50 transition-all bg-slate-900/50">
              <span className="text-3xl mb-2">📁</span>
              <span className="text-sm text-slate-400">Click to upload a QR code image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
