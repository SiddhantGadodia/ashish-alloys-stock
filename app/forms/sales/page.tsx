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
  instrCustomer?: string;
  actQuantity?: number;
  instructedBy?: { name: string; role: string };
  actualsFilledBy?: { name: string; role: string };
  verifiedBy?: { name: string; role: string };
  createdAt: string;
}

interface LotSelection { lotId: string; assignedQty: number; grade: string; size: string; supplyCondition: string; make: string; description: string; quantity: number }

const emptyInstr = { date: "", grade: "", size: "", quantity: "", make: "", uidNo: "", pieces: "", subLoc: "", supplyCondition: "", customer: "", vehicleNo: "", remarks: "" };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  instruction: { label: "Instruction Issued", color: "bg-gray-100 text-gray-600" },
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
};

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;
  const isVerifier = user?.role === "verifier";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showInstr, setShowInstr] = useState(false);
  const [instrForm, setInstrForm] = useState(emptyInstr);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actualsId, setActualsId] = useState<string | null>(null);
  const [actForm, setActForm] = useState(emptyInstr);
  const [lotSelections, setLotSelections] = useState<LotSelection[]>([]);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function load() { fetch("/api/forms/sales").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  async function submitInstruction(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/forms/sales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "instruction", ...instrForm }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowInstr(false); setInstrForm(emptyInstr); load();
  }

  async function submitActuals(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch(`/api/forms/sales/${actualsId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "actuals", ...actForm, lotSelections }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setActualsId(null); setActForm(emptyInstr); load();
  }

  async function verify(id: string) {
    if (!confirm("Verify this sale? This will deduct stock permanently.")) return;
    const res = await fetch(`/api/forms/sales/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "verify" }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/sales/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  function generateCard(e: Entry) {
    const lines = [
      "═══════ SALES ═══════",
      `Date: ${e.instrDate ? new Date(e.instrDate).toLocaleDateString("en-IN") : "—"}`,
      `Grade: ${e.instrGrade || "—"}`,
      `Size: ${e.instrSize || "—"}`,
      `Quantity: ${e.instrQuantity ?? "—"}`,
      `Make: ${e.instrMake || "—"}`,
      `Customer: ${e.instrCustomer || "—"}`,
      "═════════════════════",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Card copied!"));
  }

  const onLotChange = useCallback((s: LotSelection[]) => setLotSelections(s), []);

  const setI = (k: string, v: string) => setInstrForm((f) => ({ ...f, [k]: v }));
  const setA = (k: string, v: string) => setActForm((f) => ({ ...f, [k]: v }));

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 4</p>
            <h1 className="text-2xl font-bold">Sales</h1>
          </div>
          <button onClick={() => { setShowInstr(true); setInstrForm(emptyInstr); setError(""); }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition">
            + New Sale
          </button>
        </div>

        {showInstr && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Stage 1 — Issue Sales Instruction</h2>
            <form onSubmit={submitInstruction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date" required><input type="date" required value={instrForm.date} onChange={(e) => setI("date", e.target.value)} className={inputCls()} /></Field>
                <Field label="Grade" required><DynamicSelect field="grade" value={instrForm.grade} onChange={(v) => setI("grade", v)} required /></Field>
                <Field label="Size" required><DynamicSelect field="size" value={instrForm.size} onChange={(v) => setI("size", v)} required /></Field>
                <Field label="Supply Condition" required><DynamicSelect field="supplyCondition" value={instrForm.supplyCondition} onChange={(v) => setI("supplyCondition", v)} required /></Field>
                <Field label="Make" required><DynamicSelect field="make" value={instrForm.make} onChange={(v) => setI("make", v)} required /></Field>
                <Field label="Customer" required><DynamicSelect field="customer" value={instrForm.customer} onChange={(v) => setI("customer", v)} required /></Field>
                <Field label="Quantity" required><input type="number" step="0.001" required value={instrForm.quantity} onChange={(e) => setI("quantity", e.target.value)} className={inputCls()} /></Field>
                <Field label="Vehicle No."><input type="text" value={instrForm.vehicleNo} onChange={(e) => setI("vehicleNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Pieces"><input type="number" value={instrForm.pieces} onChange={(e) => setI("pieces", e.target.value)} className={inputCls()} /></Field>
                <Field label="UID No."><input type="text" value={instrForm.uidNo} onChange={(e) => setI("uidNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Sub Loc"><input type="text" value={instrForm.subLoc} onChange={(e) => setI("subLoc", e.target.value)} className={inputCls()} /></Field>
                <Field label="Remarks"><input type="text" value={instrForm.remarks} onChange={(e) => setI("remarks", e.target.value)} className={inputCls()} /></Field>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">{saving ? "Saving..." : "Issue Instruction"}</button>
                <button type="button" onClick={() => setShowInstr(false)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

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
                <Field label="Customer" required><DynamicSelect field="customer" value={actForm.customer} onChange={(v) => setA("customer", v)} required /></Field>
                <Field label="Quantity" required><input type="number" step="0.001" required value={actForm.quantity} onChange={(e) => setA("quantity", e.target.value)} className={inputCls()} /></Field>
                <Field label="Vehicle No."><input type="text" value={actForm.vehicleNo} onChange={(e) => setA("vehicleNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Pieces"><input type="number" value={actForm.pieces} onChange={(e) => setA("pieces", e.target.value)} className={inputCls()} /></Field>
                <Field label="UID No."><input type="text" value={actForm.uidNo} onChange={(e) => setA("uidNo", e.target.value)} className={inputCls()} /></Field>
                <Field label="Sub Loc"><input type="text" value={actForm.subLoc} onChange={(e) => setA("subLoc", e.target.value)} className={inputCls()} /></Field>
                <Field label="Remarks"><input type="text" value={actForm.remarks} onChange={(e) => setA("remarks", e.target.value)} className={inputCls()} /></Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Source Lot(s)</p>
                <LotSelector onSelectionChange={onLotChange} />
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
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
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
                    <td className="px-4 py-3">{e.instrCustomer || "—"}</td>
                    <td className="px-4 py-3 text-right">{e.instrQuantity ?? "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    {isVerifier && <td className="px-4 py-3 text-gray-500 text-xs">{e.instructedBy?.name || "—"}</td>}
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      <button onClick={() => generateCard(e)} className="text-red-600 hover:underline text-xs">Copy Card</button>
                      {e.status === "instruction" && <button onClick={() => { setActualsId(e.id); setActForm(emptyInstr); setError(""); setLotSelections([]); }} className="text-amber-600 hover:underline text-xs">Fill Actuals</button>}
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
