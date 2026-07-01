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
  instrDate?: string;
  instrGrade?: string;
  instrSize?: string;
  instrQuantity?: number;
  instrMake?: string;
  instrLocationFrom?: string;
  instrLocationTo?: string;
  actQuantity?: number;
  actGrade?: string;
  actLocationFrom?: string;
  actLocationTo?: string;
  instructedBy?: { name: string; role: string };
  actualsFilledBy?: { name: string; role: string };
  verifiedBy?: { name: string; role: string };
  createdAt: string;
}

interface LotSelection { lotId: string; assignedQty: number; grade: string; size: string; supplyCondition: string; make: string; description: string; quantity: number }

const emptyActuals = { date: "", grade: "", size: "", quantity: "", make: "", uidNo: "", pieces: "", supplyCondition: "", locationFrom: "", locationTo: "", remarks: "", description: "" };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  instruction: { label: "Instruction Issued", color: "bg-gray-100 text-gray-600" },
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
};

export default function TransferPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;
  const isVerifier = user?.role === "verifier";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Instruction state (3-step)
  const [showInstr, setShowInstr] = useState(false);
  const [instrStep, setInstrStep] = useState(1);
  const [locationFrom, setLocationFrom] = useState("");
  const [instrLots, setInstrLots] = useState<LotSelection[]>([]);
  const [instrForm, setInstrForm] = useState({ date: "", quantity: "", locationTo: "", pieces: "", uidNo: "", remarks: "" });

  // Actuals state
  const [actualsId, setActualsId] = useState<string | null>(null);
  const [actForm, setActForm] = useState(emptyActuals);
  const [actLotSelections, setActLotSelections] = useState<LotSelection[]>([]);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function load() { fetch("/api/forms/transfer").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  function openInstr() {
    setShowInstr(true); setInstrStep(1);
    setLocationFrom(""); setInstrLots([]);
    setInstrForm({ date: "", quantity: "", locationTo: "", pieces: "", uidNo: "", remarks: "" });
    setError("");
  }

  function goInstrStep2() {
    if (!locationFrom) { setError("Please select Location From."); return; }
    setError(""); setInstrStep(2);
  }

  function goInstrStep3() {
    if (instrLots.length === 0) { setError("Please select at least one lot."); return; }
    setError(""); setInstrStep(3);
  }

  const primaryLot = instrLots[0];

  async function submitInstruction(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    if (!primaryLot) { setError("No lot selected."); setSaving(false); return; }
    const res = await fetch("/api/forms/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "instruction",
        date: instrForm.date,
        grade: primaryLot.grade,
        size: primaryLot.size,
        supplyCondition: primaryLot.supplyCondition,
        make: primaryLot.make,
        description: primaryLot.description,
        quantity: instrForm.quantity,
        locationFrom,
        locationTo: instrForm.locationTo,
        pieces: instrForm.pieces,
        uidNo: instrForm.uidNo,
        remarks: instrForm.remarks,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowInstr(false); load();
  }

  async function submitActuals(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch(`/api/forms/transfer/${actualsId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "actuals", ...actForm, lotSelections: actLotSelections.map((l) => ({ lotId: l.lotId, assignedQty: l.assignedQty })) }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setActualsId(null); setActForm(emptyActuals); load();
  }

  async function verify(id: string) {
    if (!confirm("Verify this entry? This will update the stock database.")) return;
    const res = await fetch(`/api/forms/transfer/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "verify" }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/transfer/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  function generateCard(e: Entry) {
    const lines = [
      "═══ INTERNAL TRANSFER ═══",
      `Date: ${e.instrDate ? new Date(e.instrDate).toLocaleDateString("en-IN") : "—"}`,
      `Grade: ${e.instrGrade || "—"}`,
      `Size: ${e.instrSize || "—"}`,
      `Quantity: ${e.instrQuantity ?? "—"}`,
      `Make: ${e.instrMake || "—"}`,
      `From: ${e.instrLocationFrom || "—"}`,
      `To: ${e.instrLocationTo || "—"}`,
      "═════════════════════════",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Card copied to clipboard!"));
  }

  const onActLotChange = useCallback((s: LotSelection[]) => setActLotSelections(s), []);
  const onInstrLotChange = useCallback((s: LotSelection[]) => setInstrLots(s), []);

  const setI = (k: string, v: string) => setInstrForm((f) => ({ ...f, [k]: v }));
  const setA = (k: string, v: string) => setActForm((f) => ({ ...f, [k]: v }));

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 1</p>
            <h1 className="text-2xl font-bold">Internal Transfer</h1>
          </div>
          <button onClick={openInstr} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">
            + New Instruction
          </button>
        </div>

        {/* Instruction form — 3 steps */}
        {showInstr && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${instrStep === s ? "bg-purple-600 text-white" : instrStep > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {instrStep > s ? "✓" : s}
                  </div>
                  <span className={`text-sm ${instrStep === s ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
                    {s === 1 ? "Location From" : s === 2 ? "Select Lots" : "Fill Instruction"}
                  </span>
                  {s < 3 && <span className="text-gray-300 ml-1">›</span>}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {instrStep === 1 && (
              <div className="space-y-4 max-w-sm">
                <h2 className="text-base font-semibold">Step 1 — Select Source Location</h2>
                <Field label="Location From" required>
                  <DynamicSelect field="location" value={locationFrom} onChange={setLocationFrom} required />
                </Field>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={goInstrStep2} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">Next →</button>
                  <button type="button" onClick={() => setShowInstr(false)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {instrStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 2 — Select Lots to Transfer <span className="text-gray-400 font-normal text-sm">from {locationFrom}</span></h2>
                <LotSelector filterByLocation={locationFrom} onSelectionChange={onInstrLotChange} />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={goInstrStep3} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition">Next →</button>
                  <button type="button" onClick={() => setInstrStep(1)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {instrStep === 3 && primaryLot && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 3 — Issue Instruction</h2>

                {/* Read-only lot summary */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">From Selected Lot(s)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500">Grade:</span> <span className="font-semibold">{primaryLot.grade}</span></div>
                    <div><span className="text-gray-500">Size:</span> <span className="font-semibold">{primaryLot.size}</span></div>
                    <div><span className="text-gray-500">Make:</span> <span className="font-semibold">{primaryLot.make}</span></div>
                    <div><span className="text-gray-500">Supply Cond.:</span> <span className="font-semibold">{primaryLot.supplyCondition}</span></div>
                    <div><span className="text-gray-500">Description:</span> <span className="font-semibold">{primaryLot.description}</span></div>
                    <div><span className="text-gray-500">From:</span> <span className="font-semibold">{locationFrom}</span></div>
                    {instrLots.length > 1 && <div className="col-span-full text-xs text-purple-600">{instrLots.length} lots selected (total {instrLots.reduce((a, l) => a + l.quantity, 0).toFixed(3)} MT)</div>}
                  </div>
                </div>

                <form onSubmit={submitInstruction} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Date" required><input type="date" required value={instrForm.date} onChange={(e) => setI("date", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Quantity to Transfer" required><input type="number" step="0.001" required value={instrForm.quantity} onChange={(e) => setI("quantity", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Location To" required><DynamicSelect field="location" value={instrForm.locationTo} onChange={(v) => setI("locationTo", v)} required /></Field>
                    <Field label="Pieces"><input type="number" value={instrForm.pieces} onChange={(e) => setI("pieces", e.target.value)} className={inputCls()} /></Field>
                    <Field label="UID No."><input type="text" value={instrForm.uidNo} onChange={(e) => setI("uidNo", e.target.value)} className={inputCls()} /></Field>
                    <Field label="Remarks"><input type="text" value={instrForm.remarks} onChange={(e) => setI("remarks", e.target.value)} className={inputCls()} /></Field>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition">{saving ? "Saving..." : "Issue Instruction"}</button>
                    <button type="button" onClick={() => setInstrStep(2)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Actuals form */}
        {actualsId && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Stage 2 — Fill Actuals</h2>
            <form onSubmit={submitActuals} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date" required><input type="date" required value={actForm.date} onChange={(e) => setA("date", e.target.value)} className={inputCls()} /></Field>
                <Field label="Grade" required><DynamicSelect field="grade" value={actForm.grade} onChange={(v) => setA("grade", v)} required /></Field>
                <Field label="Size" required><DynamicSelect field="size" value={actForm.size} onChange={(v) => setA("size", v)} required /></Field>
                <Field label="Supply Condition" required><DynamicSelect field="supplyCondition" value={actForm.supplyCondition} onChange={(v) => setA("supplyCondition", v)} required /></Field>
                <Field label="Make" required><DynamicSelect field="make" value={actForm.make} onChange={(v) => setA("make", v)} required /></Field>
                <Field label="Description"><DynamicSelect field="description" value={actForm.description} onChange={(v) => setA("description", v)} /></Field>
                <Field label="Quantity" required><input type="number" step="0.001" required value={actForm.quantity} onChange={(e) => setA("quantity", e.target.value)} className={inputCls()} /></Field>
                <Field label="Location From" required><DynamicSelect field="location" value={actForm.locationFrom} onChange={(v) => setA("locationFrom", v)} required /></Field>
                <Field label="Location To" required><DynamicSelect field="location" value={actForm.locationTo} onChange={(v) => setA("locationTo", v)} required /></Field>
                <Field label="Pieces"><input type="number" value={actForm.pieces} onChange={(e) => setA("pieces", e.target.value)} className={inputCls()} /></Field>
                <Field label="UID No."><input type="text" value={actForm.uidNo} onChange={(e) => setA("uidNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Remarks"><input type="text" value={actForm.remarks} onChange={(e) => setA("remarks", e.target.value)} className={inputCls()} /></Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Source Lot(s)</p>
                <LotSelector onSelectionChange={onActLotChange} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">{saving ? "Saving..." : "Submit Actuals"}</button>
                <button type="button" onClick={() => setActualsId(null)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Grade</th>
                <th className="px-4 py-3 font-medium text-gray-600">From → To</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                {isVerifier && <th className="px-4 py-3 font-medium text-gray-600">By</th>}
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={isVerifier ? 7 : 6} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e) => {
                const s = STATUS_LABEL[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{e.instrDate ? new Date(e.instrDate).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-4 py-3 font-medium">{e.instrGrade || "—"}</td>
                    <td className="px-4 py-3">{e.instrLocationFrom} → {e.instrLocationTo}</td>
                    <td className="px-4 py-3 text-right">{e.instrQuantity ?? "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    {isVerifier && <td className="px-4 py-3 text-gray-500 text-xs">{e.instructedBy?.name || "—"}</td>}
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      <button onClick={() => generateCard(e)} className="text-purple-600 hover:underline text-xs">Copy Card</button>
                      {e.status === "instruction" && <button onClick={() => { setActualsId(e.id); setActForm(emptyActuals); setError(""); }} className="text-amber-600 hover:underline text-xs">Fill Actuals</button>}
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
