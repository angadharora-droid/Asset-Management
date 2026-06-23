import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal.jsx';
import { Btn, Banner } from '../ui.jsx';
import { compressImage } from '../../utils/image.js';
import { IconCamera, IconRefresh, IconClose, IconImage } from '../Icon.jsx';

// Turns a getUserMedia rejection into a message a non-technical user can act on.
function friendlyError(e) {
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError')
    return 'Camera permission was blocked. Allow camera access for this site in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError')
    return 'No camera was found on this device.';
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'The camera is already in use by another app. Close it and try again.';
  return e?.message || 'Could not start the camera.';
}

// Live camera capture. getUserMedia gives a real preview on desktop tabs,
// tablets and phones (rear camera preferred); if the browser blocks it we fall
// back to the OS camera via a file input with `capture`. Multiple shots can be
// taken in one session and are committed together when the dialog closes.
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackRef = useRef(null);
  const shotsRef = useRef([]);

  const [facing, setFacing] = useState('environment');
  const [hasMultiple, setHasMultiple] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState([]);

  // Keep a ref copy so the unmount cleanup can commit without stale closure.
  shotsRef.current = shots;

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start(mode) {
    stopStream();
    setReady(false);
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext === false
          ? 'The camera needs a secure (HTTPS) connection. Use the upload option below instead.'
          : 'This browser does not support live camera capture. Use the upload option below.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
      // Labels need permission first, so only now can we count real cameras.
      navigator.mediaDevices
        .enumerateDevices()
        .then((ds) => setHasMultiple(ds.filter((d) => d.kind === 'videoinput').length > 1))
        .catch(() => {});
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  // Start on mount; restart when the user flips the camera. Stop on unmount.
  useEffect(() => {
    start(facing);
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  function flip() {
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'));
  }

  async function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
      const dataUrl = await compressImage(blob, 1000, 0.7);
      setShots((s) => [...s, dataUrl]);
    } catch {
      setError('Could not capture the photo. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onFallbackFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) {
        if (f.type.startsWith('image/')) urls.push(await compressImage(f, 1000, 0.7));
      }
      if (urls.length) setShots((s) => [...s, ...urls]);
    } finally {
      setBusy(false);
    }
  }

  // Commit whatever was captured, then close — fired for the X, Escape and scrim.
  function finish() {
    stopStream();
    if (shotsRef.current.length) onCapture(shotsRef.current);
    onClose();
  }

  const removeShot = (i) => setShots((s) => s.filter((_, idx) => idx !== i));

  return (
    <Modal
      onClose={finish}
      ariaLabel="Take a photo"
      header={
        <div>
          <div className="flex items-center gap-2">
            <span className="gold-rule !w-5" />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold">Camera</span>
          </div>
          <h3 className="font-serif text-[17px] text-navy leading-tight mt-0.5">Take a photo</h3>
        </div>
      }
      footer={
        <div className="flex items-center gap-2.5">
          {hasMultiple && !error && (
            <Btn variant="ghost" onClick={flip} aria-label="Switch camera" className="!px-3 flex-none">
              <IconRefresh size={17} />
            </Btn>
          )}
          {error ? (
            <Btn variant="ghost" block onClick={() => fallbackRef.current?.click()}>
              <IconImage size={17} /> Upload instead
            </Btn>
          ) : (
            <Btn variant="gold" block loading={busy} disabled={!ready} onClick={capture}>
              <IconCamera size={18} /> Capture
            </Btn>
          )}
          <Btn variant="primary" onClick={finish} className="flex-none">
            {shots.length ? `Done · ${shots.length}` : 'Close'}
          </Btn>
        </div>
      }
    >
      {error ? (
        <Banner tone="error">{error}</Banner>
      ) : (
        <div className="relative mx-auto w-full max-w-[340px] aspect-[3/4] rounded-xl overflow-hidden bg-navy-deep">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[13px]">
              Starting camera…
            </div>
          )}
        </div>
      )}

      {shots.length > 0 && (
        <div className="flex gap-2 mt-3.5 overflow-x-auto pb-1">
          {shots.map((url, i) => (
            <div key={i} className="relative flex-none">
              <img src={url} alt={`Captured ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-line" />
              <button
                type="button"
                onClick={() => removeShot(i)}
                aria-label={`Remove captured photo ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-navy-deep/90 text-white flex items-center justify-center
                           hover:bg-damaged transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <IconClose size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* OS-camera fallback for browsers that block live preview */}
      <input
        ref={fallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onFallbackFiles}
      />
    </Modal>
  );
}
