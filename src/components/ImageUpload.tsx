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
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB."); return; }
    setBusy(true);
    try {
      // Convert to base64 data URL for now (local storage)
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
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
      setBusy(false);
    }
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
