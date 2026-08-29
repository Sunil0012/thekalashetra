import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adminListLots, adminUpsertLot, adminDeleteLot } from "@/lib/auction.functions";
import { formatBid } from "@/lib/format";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/sessions_/$id/lots")({
  head: () => ({ meta: [{ title: "Manage Lots — Admin" }] }),
  component: AdminLots,
});

function AdminLots() {
  const { id } = Route.useParams();
  const list = useServerFn(adminListLots);
  const upsert = useServerFn(adminUpsertLot);
  const del = useServerFn(adminDeleteLot);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "lots", id], queryFn: () => list({ data: { sessionId: id } }) });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const m = useMutation({
    mutationFn: (p: any) => upsert({ data: p }),
    onSuccess: () => { toast.success("Lot saved"); qc.invalidateQueries({ queryKey: ["admin", "lots", id] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const md = useMutation({
    mutationFn: (lotId: string) => del({ data: { id: lotId } }),
    onSuccess: () => { toast.success("Lot deleted"); qc.invalidateQueries({ queryKey: ["admin", "lots", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const session = data?.session;
  const lots = data?.lots ?? [];
  const nextLotNumber = lots.length ? Math.max(...lots.map((l: any) => l.lot_number)) + 1 : 1;

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <Link to="/admin/sessions" className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">← All sessions</Link>
      <div className="mt-6 flex items-end justify-between border-b border-border pb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Lots in session</div>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{session?.title ?? "…"}</h1>
          {session && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status: {session.status} · {lots.length} lots</div>}
        </div>
        <button onClick={() => { setEditing({}); setOpen(true); }} className="bg-foreground text-background px-5 py-3 text-[11px] uppercase tracking-[0.18em]">+ Add lot</button>
      </div>

      <div className="mt-8 grid gap-3">
        {lots.map((l: any) => (
          <div key={l.id} className="border border-border p-4 grid grid-cols-[64px_1fr_auto_auto_auto] items-center gap-5">
            <div className="w-16 h-16 bg-muted overflow-hidden">
              {l.image_url && <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />}
            </div>
            <div>
              <div className="font-serif text-lg">#{l.lot_number} · {l.artist} — <span className="italic">{l.title}</span></div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l.category ?? "—"} · {l.status}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Current</div>
              <div className="font-serif">{formatBid(l.current_bid)}</div>
            </div>
            <div className="text-right font-mono text-[11px] text-muted-foreground">{l.bid_count} bids</div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(l); setOpen(true); }} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-foreground">Edit</button>
              <button onClick={() => { if (confirm("Delete this lot?")) md.mutate(l.id); }} className="border border-border px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500">Delete</button>
            </div>
          </div>
        ))}
        {lots.length === 0 && <div className="text-center py-12 text-muted-foreground text-[13px]">No lots yet — add the first artwork.</div>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload: any = {
                session_id: id,
                lot_number: Number(fd.get("lot_number") || nextLotNumber),
                artist: String(fd.get("artist") || ""),
                title: String(fd.get("title") || ""),
                year: fd.get("year") ? Number(fd.get("year")) : null,
                medium: String(fd.get("medium") || ""),
                dimensions: String(fd.get("dimensions") || ""),
                provenance: String(fd.get("provenance") || ""),
                description: String(fd.get("description") || ""),
                category: String(fd.get("category") || "Painting"),
                image_url: String(fd.get("image_url") || "") || null,
                starting_bid: Number(fd.get("starting_bid") || 0),
              };
              if (editing?.id) payload.id = editing.id;
              m.mutate(payload);
            }}
            className="bg-background border border-border w-full max-w-2xl p-8 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="font-serif text-3xl">{editing?.id ? "Edit lot" : "Add lot"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <F name="lot_number" label="Lot #" type="number" defaultValue={editing?.lot_number ?? nextLotNumber} required />
              <F name="starting_bid" label="Starting bid (USD)" type="number" defaultValue={editing?.starting_bid} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F name="artist" label="Artist" defaultValue={editing?.artist} required />
              <F name="title" label="Title" defaultValue={editing?.title} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <F name="year" label="Year" type="number" defaultValue={editing?.year} />
              <F name="medium" label="Medium" defaultValue={editing?.medium} />
              <F name="dimensions" label="Dimensions" defaultValue={editing?.dimensions} />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Category</label>
              <select name="category" defaultValue={editing?.category ?? "Painting"} className="w-full bg-transparent border-b border-border py-3">
                {["Painting", "Drawing", "Sculpture", "Photography", "Print"].map((c) => <option key={c} value={c} className="bg-background">{c}</option>)}
              </select>
            </div>
            <ImageUpload 
              value={editing?.image_url} 
              onChange={(url) => {
                const hiddenInput = document.querySelector('input[name="image_url"]') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = url;
              }}
              folder="lots"
              label="Lot Image"
            />
            <input type="hidden" name="image_url" defaultValue={editing?.image_url ?? ""} />
            <F name="provenance" label="Provenance" defaultValue={editing?.provenance} textarea />
            <F name="description" label="Description" defaultValue={editing?.description} textarea />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setOpen(false)} className="border border-border px-5 py-3 text-[11px] uppercase tracking-[0.18em]">Cancel</button>
              <button type="submit" disabled={m.isPending} className="bg-foreground text-background px-5 py-3 text-[11px] uppercase tracking-[0.18em]">{m.isPending ? "Saving…" : "Save lot"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function F({ name, label, defaultValue, type = "text", required, textarea }: any) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-foreground resize-none" />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-foreground" />
      )}
    </div>
  );
}
