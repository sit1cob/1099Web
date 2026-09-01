import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, AlertTriangle } from 'lucide-react';
import ApiService from '../api/apiService';

/* ─── Types ─────────────────────────────────────────────────────── */
export interface AppliancePhotoUploaderProps {
  assignmentId: string;
  onUploadComplete?: () => void;
}

export interface AppliancePhotoUploaderHandle {
  uploadAll: () => Promise<{ successCount: number; failedCount: number }>;
  hasPhotos: () => boolean;
}

interface PhotoEntry {
  id: string;
  file: File;
  previewUrl: string;
}

interface WarningToast {
  id: string;
  message: string;
}

interface UploadProgress {
  current: number;
  total: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/* ─── Component ─────────────────────────────────────────────────── */
const AppliancePhotoUploader = forwardRef<AppliancePhotoUploaderHandle, AppliancePhotoUploaderProps>(
  ({ assignmentId, onUploadComplete }, ref) => {
    const [photos, setPhotos] = useState<PhotoEntry[]>([]);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [warnings, setWarnings] = useState<WarningToast[]>([]);

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    /* Keep a stable ref for cleanup on unmount */
    const photosRef = useRef(photos);
    photosRef.current = photos;

    useEffect(() => {
      return () => {
        photosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl));
      };
    }, []);

    /* ── Add photos ── */
    const addPhotos = (files: FileList | null) => {
      if (!files) return;
      const entries: PhotoEntry[] = Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .map(file => ({
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));
      setPhotos(prev => [...prev, ...entries]);
    };

    /* ── Remove photo ── */
    const removePhoto = (id: string) => {
      setPhotos(prev => {
        const entry = prev.find(p => p.id === id);
        if (entry) URL.revokeObjectURL(entry.previewUrl);
        return prev.filter(p => p.id !== id);
      });
    };

    /* ── Toast warning ── */
    const addWarning = (message: string) => {
      const id = Date.now().toString();
      setWarnings(prev => [...prev, { id, message }]);
      setTimeout(() => setWarnings(prev => prev.filter(w => w.id !== id)), 5000);
    };

    /* ── Upload single photo (Steps 1 → 2 → 3) with retry ── */
    const uploadSinglePhoto = async (entry: PhotoEntry, index: number, maxRetries = 2): Promise<boolean> => {
      const mimeType = entry.file.type || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `appliance_photo_${Date.now()}_${index}.${ext}`;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          /* Step 1 — Get presigned upload token */
          const tokenRes = await ApiService.getCompletionPhotoUploadToken(assignmentId, fileName, mimeType);
          const tokenEntry = tokenRes?.data?.tokens?.[0];
          if (!tokenEntry) throw new Error('No upload token received');
          const { token, uploadUrl, uploadFields } = tokenEntry;

          /* Step 2 — Upload file to S3 (use fetch to avoid axios global headers) */
          const formData = new FormData();
          Object.entries(uploadFields as Record<string, string>).forEach(([k, v]) =>
            formData.append(k, v)
          );
          formData.append('file', entry.file);
          await fetch(uploadUrl, { method: 'POST', body: formData });

          /* Step 3 — Consume token */
          await ApiService.consumePhotoTokens(assignmentId, [token]);

          return true;
        } catch {
          if (attempt < maxRetries) {
            await sleep(attempt === 0 ? 500 : 1000);
          }
        }
      }
      return false;
    };

    /* ── Imperative handle ── */
    useImperativeHandle(ref, () => ({
      hasPhotos: () => photos.length > 0,

      uploadAll: async () => {
        if (photos.length === 0) {
          onUploadComplete?.();
          return { successCount: 0, failedCount: 0 };
        }

        let successCount = 0;
        let failedCount = 0;

        setProgress({ current: 1, total: photos.length });

        for (let i = 0; i < photos.length; i++) {
          setProgress({ current: i + 1, total: photos.length });

          const ok = await uploadSinglePhoto(photos[i], i);
          if (ok) {
            successCount++;
          } else {
            failedCount++;
            addWarning(`Photo ${i + 1} of ${photos.length} failed after retries and was skipped.`);
          }

          /* 300 ms delay between uploads */
          if (i < photos.length - 1) {
            await sleep(300);
          }
        }

        setProgress(null);
        onUploadComplete?.();
        return { successCount, failedCount };
      },
    }));

    const isUploading = progress !== null;

    return (
      <div>
        {/* Warning toasts */}
        {warnings.length > 0 && (
          <div className="space-y-2 mb-3">
            {warnings.map(w => (
              <div
                key={w.id}
                className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{w.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Camera / Gallery buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="h-4 w-4" />
            Camera
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="h-4 w-4" />
            Gallery
          </button>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="flex items-center gap-2 mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
            <p className="text-xs text-blue-700 font-medium">
              Uploading photo {progress.current} of {progress.total}...
            </p>
          </div>
        )}

        {/* Thumbnails grid — 90×90 each */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {photos.map(entry => (
              <div
                key={entry.id}
                className="relative group rounded-lg overflow-hidden border border-gray-200"
                style={{ height: 90 }}
              >
                <img
                  src={entry.previewUrl}
                  alt="Appliance photo"
                  className="w-full h-full object-cover"
                />
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => removePhoto(entry.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}
        />
      </div>
    );
  }
);

AppliancePhotoUploader.displayName = 'AppliancePhotoUploader';
export default AppliancePhotoUploader;
