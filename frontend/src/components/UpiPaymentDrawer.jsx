export default function UpiPaymentDrawer({ isOpen, onClose, upiId, amount, payeeName, note }) {
  if (!isOpen || !upiId) return null;

  const amountNum = Number(amount) || 0;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || "")}&am=${amountNum > 0 ? amountNum : ""}&cu=INR&tn=${encodeURIComponent(note || "")}`;
  const qrData = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || "")}&am=${amountNum > 0 ? amountNum : ""}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="glass-card w-full max-w-md p-5 relative animate-fade-in-up">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        <h3 className="section-title mb-4">
          <span>⚡</span>
          <span>Pay via UPI</span>
        </h3>

        <div className="text-center space-y-4">
          {/* Payment details */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
            {payeeName && (
              <div className="text-sm text-slate-400">
                Pay to: <span className="text-white font-medium">{payeeName}</span>
              </div>
            )}
            <div className="text-sm text-slate-400">
              UPI ID: <span className="text-primary font-mono text-xs">{upiId}</span>
            </div>
            {amountNum > 0 && (
              <div className="text-2xl font-bold text-white">₹{amountNum.toLocaleString("en-IN")}</div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl inline-block">
              <img
                src={qrImageUrl}
                alt="UPI QR Code"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Scan this QR code with any UPI app</p>

          {/* Deep link button */}
          <a
            href={upiDeepLink}
            className="btn btn-primary w-full font-semibold flex items-center justify-center gap-2"
          >
            <span>📲</span>
            <span>Open UPI App</span>
          </a>

          <button
            onClick={onClose}
            className="btn w-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium"
          >
            ✅ Done — I've completed the payment
          </button>
        </div>
      </div>
    </div>
  );
}
