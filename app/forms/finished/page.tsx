"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, inputCls } from "@/components/FormField";
import LotSelector from "@/components/LotSelector";

interface Entry {
  id: string;
  status: string;
  date: string;
  gradeFinal: string;
  sizeFinal: string;
  quantityFinal: number;
  make: string;
  locationInitial: string;
  locationFinal: string;
  suspenseQty: number;
  sourceLotId: string | null;
  pieces: number | null;
  uidNo: string | null;
  remarks: string | null;
  actualsFilledBy?: { name: string; role: string };
  verifiedBy?: { name: string; role: string };
  createdAt: string;
}

interface LotSelection { lotId: string; assignedQty: number }

const empty = { date: "", gradeFinal: "", sizeFinal: "", quantityFinal: "", make: "", uidNo: "", pieces: "", supplyCondition: "", locationInitial: "", locationFinal: "", suspenseQty: "0", remarks: "" };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
};

export default function FinishedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;
  const isVerifier = user?.role === "verifier";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lotSelections, setLotSelections] = useState<LotSelection[]>([]);
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function load() { fetch("/api/forms/finished").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const onLotChange = useCallback((s: LotSelection[]) => setLotSelections(s), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const sourceLotId = lotSelections[0]?.lotId;
    if (!sourceLotId) { setError("Please select a source lot."); setSaving(false); return; }
    const res = await fetch("/api/forms/finished", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sourceLotId }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false); setForm(empty); load();
  }

  async function verify(id: string) {
    if (!confirm("Verify this entry? This will update the stock database.")) return;
    const res = await fetch(`/api/forms/finished/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "verify" }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/finished/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 3</p>
            <h1 className="text-2xl font-bold">Finished Goods Transfer</h1>
          </div>
          <button onClick={() => { setShowForm(true); setForm(empty); setError(""); setLotSelections([]); setFilterLocation(""); }}
            className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">
            + New Entry
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">New Finished Goods Transfer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date" required><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls()} /></Field>
                <Field label="Grade (Final)" required><DynamicSelect field="grade" value={form.gradeFinal} onChange={(v) => set("gradeFinal", v)} required /></Field>
                <Field label="Size (Final)" required><DynamicSelect field="size" value={form.sizeFinal} onChange={(v) => set("sizeFinal", v)} required /></Field>
                <Field label="Quantity (Final)" required><input type="number" step="0.001" required value={form.quantityFinal} onChange={(e) => set("quantityFinal", e.target.value)} className={inputCls()} /></Field>
                <Field label="Make" required><DynamicSelect field="make" value={form.make} onChange={(v) => set("make", v)} required /></Field>
                <Field label="Supply Condition" required><DynamicSelect field="supplyCondition" value={form.supplyCondition} onChange={(v) => set("supplyCondition", v)} required /></Field>
                <Field label="Location Initial" required>
                  <DynamicSelect field="location" value={form.locationInitial} onChange={(v) => { set("locationInitial", v); setFilterLocation(v); }} required />
                </Field>
                <Field label="Location Final" required><DynamicSelect field="location" value={form.locationFinal} onChange={(v) => set("locationFinal", v)} required /></Field>
                <Field label="Suspense Qty"><input type="number" step="0.001" min="0" value={form.suspenseQty} onChange={(e) => set("suspenseQty", e.target.value)} className={inputCls()} /></Field>
                <Field label="Pieces"><input type="number" value={form.pieces} onChange={(e) => set("pieces", e.target.value)} className={inputCls()} /></Field>
                <Field label="UID No."><input type="text" value={form.uidNo} onChange={(e) => set("uidNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Remarks"><input type="text" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={inputCls()} /></Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Source Lot {filterLocation && <span className="text-gray-400 font-normal">(showing lots at: {filterLocation})</span>}</p>
                {filterLocation ? (
                  <LotSelector filterByLocation={filterLocation} onSelectionChange={onLotChange} />
                ) : (
                  <p className="text-sm text-gray-400">Select Location Initial first to filter lots.</p>
                )}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">{saving ? "Saving..." : "Submit"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Grade (Final)</th>
                <th className="px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Suspense</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                {isVerifier && <th className="px-4 py-3 font-medium text-gray-600">By</th>}
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={isVerifier ? 8 : 7} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e) => {
                const s = STATUS_LABEL[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-medium">{e.gradeFinal}</td>
                    <td className="px-4 py-3">{e.locationInitial} → {e.locationFinal}</td>
                    <td className="px-4 py-3 text-right font-semibold">{e.quantityFinal.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{e.suspenseQty > 0 ? e.suspenseQty.toFixed(3) : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    {isVerifier && <td className="px-4 py-3 text-gray-500 text-xs">{e.actualsFilledBy?.name || "—"}</td>}
                    <td className="px-4 py-3 flex gap-2">
                      {e.status === "actuals_filled" && isVerifier && <button onClick={() => verify(e.id)} className="text-green-600 hover:underline text-xs">Verify</button>}
                      {(e.status !== "verified" || isVerifier) && <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:underline text-xs">Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
