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

interface LotInfo { lotId: string; assignedQty: number; grade: string; size: string; supplyCondition: string; make: string; description: string; quantity: number }

const emptyForm = { date: "", quantityFinal: "", locationFinal: "", suspenseQty: "0", pieces: "", uidNo: "", remarks: "" };

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
  const [step, setStep] = useState(1);
  const [locationInitial, setLocationInitial] = useState("");
  const [lotSelections, setLotSelections] = useState<LotInfo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function load() { fetch("/api/forms/finished").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onLotChange = useCallback((selections: { lotId: string; assignedQty: number; grade: string; size: string; supplyCondition: string; make: string; description: string; quantity: number }[]) => {
    setLotSelections(selections);
  }, []);

  function openForm() {
    setShowForm(true);
    setStep(1);
    setLocationInitial("");
    setLotSelections([]);
    setForm(emptyForm);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
  }

  function goStep2() {
    if (!locationInitial) { setError("Please select Location Initial."); return; }
    setError("");
    setStep(2);
  }

  function goStep3() {
    if (lotSelections.length === 0) { setError("Please select a source lot."); return; }
    setError("");
    setStep(3);
  }

  const selectedLot = lotSelections[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLot) { setError("No lot selected."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/forms/finished", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        gradeFinal: selectedLot.grade,
        sizeFinal: selectedLot.size,
        supplyCondition: selectedLot.supplyCondition,
        make: selectedLot.make,
        locationInitial,
        sourceLotId: selectedLot.lotId,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false);
    load();
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
          <button onClick={openForm} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">
            + New Entry
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? "bg-amber-600 text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {step > s ? "✓" : s}
                  </div>
                  <span className={`text-sm ${step === s ? "text-amber-700 font-semibold" : "text-gray-400"}`}>
                    {s === 1 ? "Location" : s === 2 ? "Select Lot" : "Fill Details"}
                  </span>
                  {s < 3 && <span className="text-gray-300 ml-1">›</span>}
                </div>
              ))}
            </div>

            {/* Step 1: Location Initial */}
            {step === 1 && (
              <div className="space-y-4 max-w-sm">
                <h2 className="text-base font-semibold">Step 1 — Select Source Location</h2>
                <Field label="Location Initial" required>
                  <DynamicSelect field="location" value={locationInitial} onChange={setLocationInitial} required />
                </Field>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={goStep2} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">Next →</button>
                  <button type="button" onClick={closeForm} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Step 2: Select Lot */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 2 — Select Source Lot <span className="text-gray-400 font-normal text-sm">at {locationInitial}</span></h2>
                <LotSelector filterByLocation={locationInitial} onSelectionChange={onLotChange} />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={goStep3} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">Next →</button>
                  <button type="button" onClick={() => setStep(1)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                </div>
              </div>
            )}

            {/* Step 3: Fill Details */}
            {step === 3 && selectedLot && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 3 — Fill Transfer Details</h2>

                {/* Read-only lot info from selection */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">From Selected Lot</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Grade:</span> <span className="font-semibold">{selectedLot.grade}</span></div>
                    <div><span className="text-gray-500">Size:</span> <span className="font-semibold">{selectedLot.size}</span></div>
                    <div><span className="text-gray-500">Make:</span> <span className="font-semibold">{selectedLot.make}</span></div>
                    <div><span className="text-gray-500">Supply Cond.:</span> <span className="font-semibold">{selectedLot.supplyCondition}</span></div>
                    <div><span className="text-gray-500">Description:</span> <span className="font-semibold">{selectedLot.description}</span></div>
                    <div><span className="text-gray-500">From:</span> <span className="font-semibold">{locationInitial}</span></div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Date" required><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Quantity (Final)" required><input type="number" step="0.001" required value={form.quantityFinal} onChange={(e) => set("quantityFinal", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Location Final" required><DynamicSelect field="location" value={form.locationFinal} onChange={(v) => set("locationFinal", v)} required /></Field>
                    <Field label="Suspense Qty"><input type="number" step="0.001" min="0" value={form.suspenseQty} onChange={(e) => set("suspenseQty", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Pieces"><input type="number" value={form.pieces} onChange={(e) => set("pieces", e.target.value)} className={inputCls()} /></Field>
                    <Field label="UID No."><input type="text" value={form.uidNo} onChange={(e) => set("uidNo", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Remarks"><input type="text" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={inputCls()} /></Field>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">{saving ? "Saving..." : "Submit"}</button>
                    <button type="button" onClick={() => setStep(2)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                  </div>
                </form>
              </div>
            )}
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
