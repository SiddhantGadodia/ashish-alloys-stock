"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, MultiSelect, inputCls } from "@/components/FormField";

interface Entry {
  id: string;
  date: string;
  grade: string;
  rmSize: string;
  quantity: number;
  make: string;
  conversionSizeTolerance: string;
  length: number;
  colourCode: string;
  machines: string;
  additionalInstruction: string | null;
  uidNo: string | null;
  createdBy?: { name: string; role: string };
  createdAt: string;
}

const MACHINES = ["M1","M2","M3","Grinding","Belt Polishing","Others"];
const empty = { date: "", grade: "", rmSize: "", quantity: "", make: "", conversionSizeTolerance: "", length: "", colourCode: "", machines: [] as string[], additionalInstruction: "", uidNo: "" };

export default function ProductionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isVerifier = (session?.user as { role?: string })?.role === "verifier";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function load() { fetch("/api/forms/production").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  const set = (k: string, v: string | string[]) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/forms/production/${editId}` : "/api/forms/production";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false); setForm(empty); setEditId(null); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/production/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  function generateCard(e: Entry) {
    const machines = JSON.parse(e.machines || "[]").join(", ");
    const lines = [
      "═══ PRODUCTION PLANNING ═══",
      `Date: ${new Date(e.date).toLocaleDateString("en-IN")}`,
      `Grade: ${e.grade}`,
      `RM Size: ${e.rmSize}`,
      `Quantity: ${e.quantity}`,
      `Make: ${e.make}`,
      `Conv. Size/Tol: ${e.conversionSizeTolerance}`,
      `Length: ${e.length}`,
      `Colour Code: ${e.colourCode}`,
      `Machines: ${machines}`,
      ...(e.additionalInstruction ? [`Additional: ${e.additionalInstruction}`] : []),
      ...(e.uidNo ? [`UID: ${e.uidNo}`] : []),
      "════════════════════════════",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("Card copied!"));
  }

  function startEdit(e: Entry) {
    setForm({
      date: e.date.slice(0,10), grade: e.grade, rmSize: e.rmSize,
      quantity: e.quantity.toString(), make: e.make, conversionSizeTolerance: e.conversionSizeTolerance,
      length: e.length.toString(), colourCode: e.colourCode,
      machines: JSON.parse(e.machines || "[]"),
      additionalInstruction: e.additionalInstruction || "", uidNo: e.uidNo || "",
    });
    setEditId(e.id); setShowForm(true);
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 2</p>
            <h1 className="text-2xl font-bold">Production Planning</h1>
          </div>
          <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); setError(""); }}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">
            + New Instruction
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">{editId ? "Edit" : "New"} Production Planning</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date" required><input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls()} /></Field>
                <Field label="Grade" required><DynamicSelect field="grade" value={form.grade} onChange={(v) => set("grade", v)} required /></Field>
                <Field label="RM Size" required><DynamicSelect field="size" value={form.rmSize} onChange={(v) => set("rmSize", v)} required /></Field>
                <Field label="Quantity" required><input type="number" step="0.001" required value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputCls()} /></Field>
                <Field label="Make" required><DynamicSelect field="make" value={form.make} onChange={(v) => set("make", v)} required /></Field>
                <Field label="Conv. Size/Tolerance" required><input type="text" required value={form.conversionSizeTolerance} onChange={(e) => set("conversionSizeTolerance", e.target.value)} className={inputCls()} /></Field>
                <Field label="Length" required><input type="number" step="0.01" required value={form.length} onChange={(e) => set("length", e.target.value)} className={inputCls()} /></Field>
                <Field label="Colour Code" required><DynamicSelect field="colourCode" value={form.colourCode} onChange={(v) => set("colourCode", v)} required /></Field>
                <Field label="UID No."><input type="text" value={form.uidNo} onChange={(e) => set("uidNo", e.target.value)} className={inputCls()} /></Field>
              </div>
              <Field label="Machines" required>
                <MultiSelect options={MACHINES} selected={form.machines} onChange={(v) => set("machines", v)} />
              </Field>
              <Field label="Additional Instruction">
                <textarea value={form.additionalInstruction} onChange={(e) => set("additionalInstruction", e.target.value)} rows={2} className={inputCls()} />
              </Field>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">{saving ? "Saving..." : editId ? "Update" : "Create Instruction"}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Grade</th>
                <th className="px-4 py-3 font-medium text-gray-600">RM Size</th>
                <th className="px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-600">Conv. Size</th>
                <th className="px-4 py-3 font-medium text-gray-600">Machines</th>
                {isVerifier && <th className="px-4 py-3 font-medium text-gray-600">By</th>}
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={isVerifier ? 8 : 7} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 font-medium">{e.grade}</td>
                  <td className="px-4 py-3">{e.rmSize}</td>
                  <td className="px-4 py-3">{e.quantity}</td>
                  <td className="px-4 py-3">{e.conversionSizeTolerance}</td>
                  <td className="px-4 py-3 text-xs">{JSON.parse(e.machines || "[]").join(", ")}</td>
                  {isVerifier && <td className="px-4 py-3 text-gray-500 text-xs">{e.createdBy?.name || "—"}</td>}
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => generateCard(e)} className="text-green-600 hover:underline text-xs">Copy Card</button>
                    <button onClick={() => startEdit(e)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
