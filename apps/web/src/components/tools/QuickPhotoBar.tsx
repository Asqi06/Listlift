import { useState } from 'preact/hooks';

export interface UploadedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  kb: number;
  name: string;
}

export async function resizeImageForVision(file: File, maxDim = 512): Promise<UploadedPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/webp', 0.8);
  const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
  return { dataUrl, width, height, kb, name: file.name };
}

interface Props {
  photo: UploadedPhoto | null;
  onChange: (photo: UploadedPhoto | null) => void;
  label?: string;
}

export default function QuickPhotoBar({ photo, onChange, label = 'Upload product photo (recommended — AI inspects the image directly)' }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setError(null);
    try {
      const resized = await resizeImageForVision(file, 512);
      onChange(resized);
    } catch {
      setError('Could not read that image. Try JPG, PNG, or WebP.');
    }
  };

  return (
    <div
      onPaste={(e) => {
        const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
        if (item) handleFile(item.getAsFile() ?? undefined);
      }}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px dashed var(--border-strong)',
        background: 'var(--subtle)',
      }}
    >
      {photo ? (
        <img
          src={photo.dataUrl}
          alt="Product preview"
          width={64}
          height={64}
          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
        />
      ) : (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      )}

      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <strong style={{ fontSize: '0.88rem' }}>
          {photo ? `Photo attached (${photo.width}×${photo.height} WebP · ${photo.kb} KB)` : label}
        </strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <label class="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            {photo ? 'Change Photo' : 'Upload Photo'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile((e.target as HTMLInputElement).files?.[0])}
            />
          </label>
          <label class="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleFile((e.target as HTMLInputElement).files?.[0])}
            />
          </label>
          {photo && (
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
        {error && <span class="badge badge-fail" style={{ width: 'fit-content' }}>{error}</span>}
      </div>
    </div>
  );
}
