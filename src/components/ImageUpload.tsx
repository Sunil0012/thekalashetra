import { useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
};

export function ImageUpload({ value, onChange, folder = "lots", label = "Image" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image must be under 20MB."); return; }
    setBusy(true);
    try {
      // Compress image if larger than 2MB for better performance
      const maxSize = 2 * 1024 * 1024; // 2MB threshold for compression
      if (file.size > maxSize) {
        const compressed = await compressImage(file, 1600, 0.85);
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onChange(dataUrl);
          toast.success("Image loaded and compressed");
          setBusy(false);
        };
        reader.onerror = () => {
          toast.error("Failed to read file");
          setBusy(false);
        };
        reader.readAsDataURL(compressed);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onChange(dataUrl);
          toast.success("Image loaded");
          setBusy(false);
        };
        reader.onerror = () => {
          toast.error("Failed to read file");
          setBusy(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
      setBusy(false);
    }
  };

  const compressImage = async (file: File, maxWidth: number, quality: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</label>
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 bg-muted overflow-hidden border border-border shrink-0">
          {value ? <img src={value} alt="preview" className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">No image</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-foreground disabled:opacity-50">
              {busy ? "Loading…" : value ? "Replace file" : "Upload from system"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange("")} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500">Remove</button>
            )}
          </div>
          <input
            type="url"
            placeholder="Or paste an image URL"
            defaultValue={value ?? ""}
            onBlur={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-b border-border py-2 text-[12px] focus:outline-none focus:border-foreground"
          />
        </div>
      </div>
    </div>
  );
}
