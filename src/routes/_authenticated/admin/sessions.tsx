import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adminListAllSessions, adminUpsertSession, adminDeleteSession, adminSetSessionStatus } from "@/lib/auction.functions";
import { slugify, formatCountdown } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  head: () => ({ meta: [{ title: "Sessions — Admin" }] }),
  component: AdminSessions,
});

function AdminSessions() {
  useNow(30_000);
  const list = useServerFn(adminListAllSessions);
  const upsert = useServerFn(adminUpsertSession);
  const del = useServerFn(adminDeleteSession);
  const setStatus = useServerFn(adminSetSessionStatus);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "sessions"] as const, queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "sessions"] });
    qc.invalidateQueries({ queryKey: ["catalogue"] });
  };

  const m = useMutation({
    mutationFn: (payload: any) => upsert({ data: payload }),
    onSuccess: () => { toast.success("Saved"); invalidate(); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const md = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const ms = useMutation({
    mutationFn: (p: { id: string; status: "draft" | "upcoming" | "live" | "ended" }) => setStatus({ data: p }),
    onSuccess: (_d, p) => { toast.success(`Session is now ${p.status}`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Auction Sessions</div>
          <h1 className="mt-3 font-serif text-5xl">Sessions</h1>
        </div>
        <button onClick={() => { setEditing({}); setOpen(true); }} className="bg-foreground text-background px-5 py-3 text-[11px] uppercase tracking-[0.18em]">+ New session</button>
      </div>

      <div className="mt-8 grid gap-3">
        {(data ?? []).map((s: any) => (
          <div key={s.id} className="border border-border p-5 grid lg:grid-cols-[1fr_auto_auto_auto] items-center gap-4">
            <div>
              <div className="font-serif text-xl">{s.title}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                /{s.slug} · {new Date(s.starts_at).toLocaleString()} → {new Date(s.ends_at).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-block font-mono text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 border ${s.status === "live" ? "border-red-500 text-red-500" : "border-border text-muted-foreground"}`}>{s.status}</div>
              <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                {s.status === "live" ? <>Ends in <span className="text-red-500">{formatCountdown(s.ends_at)}</span></>
                  : s.status === "upcoming" ? <>Starts in {formatCountdown(s.starts_at)}</>
                  : s.status === "ended" ? "Closed" : "Not published"}
              </div>
            </div>
            <div className="flex gap-2">
              {(s.status === "upcoming" || s.status === "draft") && (
                <button onClick={() => ms.mutate({ id: s.id, status: "live" })} disabled={ms.isPending} className="border border-red-500 text-red-500 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:bg-red-500 hover:text-background transition-colors">Go live</button>
              )}
              {s.status === "live" && (
                <button onClick={() => { if (confirm("End this session now? Bidding will close immediately.")) ms.mutate({ id: s.id, status: "ended" }); }} disabled={ms.isPending} className="border border-foreground px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors">End now</button>
              )}
              {s.status === "ended" && (
                <button onClick={() => ms.mutate({ id: s.id, status: "upcoming" })} disabled={ms.isPending} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-foreground">Reopen as upcoming</button>
              )}
            </div>
            <div className="flex gap-2">
              <Link to="/admin/sessions/$id/lots" params={{ id: s.id }} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-foreground">Lots</Link>
              <button onClick={() => { setEditing(s); setOpen(true); }} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-foreground">Edit</button>
              <button onClick={() => { if (confirm("Delete this session and all its lots?")) md.mutate(s.id); }} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500">Delete</button>
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="text-center py-12 text-muted-foreground text-[13px]">No sessions yet — create your first.</div>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const start = new Date(String(fd.get("starts_at")));
              const end = new Date(String(fd.get("ends_at")));
              if (end <= start) { toast.error("End time must be after the start time."); return; }
              const mode = String(fd.get("mode") || "long") as "short" | "long";
              const payload: any = {
                title: String(fd.get("title") || ""),
                slug: slugify(String(fd.get("slug") || fd.get("title") || "")),
                description: String(fd.get("description") || ""),
                cover_image: String(fd.get("cover_image") || "") || null,
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                status: String(fd.get("status")) as any,
                mode,
                duration_minutes: mode === "short" ? Math.round((end.getTime() - start.getTime()) / 60000) : null,
              };
              if (editing?.id) payload.id = editing.id;
              m.mutate(payload);

            }}
            className="bg-background border border-border w-full max-w-2xl p-8 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-serif text-3xl">{editing?.id ? "Edit session" : "New session"}</h2>
            <Field name="title" label="Title" defaultValue={editing?.title} required />
            <Field name="slug" label="Slug (URL)" defaultValue={editing?.slug} placeholder="auto from title" />
            <Field name="description" label="Description" defaultValue={editing?.description} textarea />
            <ImageUpload 
              value={editing?.cover_image} 
              onChange={(url) => {
                // Update the form state with the new image URL
                const hiddenInput = document.querySelector('input[name="cover_image"]') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = url;
              }}
              folder="sessions"
              label="Cover Image"
            />
            <input type="hidden" name="cover_image" defaultValue={editing?.cover_image ?? ""} />
            <div className="grid grid-cols-2 gap-4">
              <Field name="starts_at" label="Starts at" type="datetime-local" defaultValue={editing?.starts_at ? toLocalInput(editing.starts_at) : ""} required />
              <Field name="ends_at" label="Ends at" type="datetime-local" defaultValue={editing?.ends_at ? toLocalInput(editing.ends_at) : ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Auction type</label>
                <select name="mode" defaultValue={editing?.mode ?? "long"} className="w-full bg-transparent border-b border-border py-3">
                  <option value="long" className="bg-background">Standard (multi-day)</option>
                  <option value="short" className="bg-background">Live bidding slot (timed window)</option>
                </select>
                <p className="mt-2 text-[11px] text-muted-foreground">Live slots appear on the Live Bidding page. Bids are only accepted between the start and end time above.</p>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Status</label>
                <select name="status" defaultValue={editing?.status ?? "upcoming"} className="w-full bg-transparent border-b border-border py-3">
                  {["draft", "upcoming", "live", "ended"].map((s) => <option key={s} value={s} className="bg-background">{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4">
              {editing?.id ? (
                <Link to="/admin/sessions/$id/lots" params={{ id: editing.id }} className="text-[11px] uppercase tracking-[0.18em] underline">Manage lots →</Link>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="border border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em]">Cancel</button>
                <button type="submit" disabled={m.isPending} className="bg-foreground text-background px-5 py-3 text-[11px] uppercase tracking-[0.18em]">{m.isPending ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ name, label, defaultValue, type = "text", required, placeholder, textarea }: any) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-foreground resize-none" rows={3} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-foreground" />
      )}
    </div>
  );
}
