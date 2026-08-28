import { forwardRef, useImperativeHandle, useRef, memo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function demarrageAvecDelai(promesse, delaiMs) {
  return Promise.race([
    promesse,
    new Promise((_, reject) => setTimeout(() => reject(new Error('DEMARRAGE_TROP_LONG')), delaiMs)),
  ]);
}

const ScannerQR = forwardRef(function ScannerQR({ elementId, onResultat }, ref) {
  const scannerRef = useRef(null);
  const traitementEnCours = useRef(false);

  useImperativeHandle(ref, () => ({
    async demarrer() {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          // rien à faire, il n'y avait peut-être rien à arrêter
        }
        scannerRef.current = null;
      }

      let cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        cameras = await Html5Qrcode.getCameras();
      }

      if (!cameras || cameras.length === 0) {
        throw new Error('AUCUNE_CAMERA');
      }

      const camerasArriere = cameras.filter((c) => /back|rear|environment|arrière/i.test(c.label));
      const camera = camerasArriere.length > 0 ? camerasArriere[camerasArriere.length - 1] : cameras[cameras.length - 1];

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await demarrageAvecDelai(
        scanner.start(
          camera.id,
          { fps: 10, qrbox: 250 },
          async (texteDecode) => {
            if (traitementEnCours.current) return;
            traitementEnCours.current = true;

            try {
              await onResultat(texteDecode);
            } finally {
              setTimeout(() => {
                traitementEnCours.current = false;
              }, 2000);
            }
          },
          () => {}
        ),
        8000
      );
    },

    async arreter() {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          // rien à faire
        }
        scannerRef.current = null;
      }
    },
  }));

  return <div id={elementId} className="mt-4 max-w-xs mx-auto rounded-xl overflow-hidden min-h-[250px]"></div>;
});

export default memo(ScannerQR);