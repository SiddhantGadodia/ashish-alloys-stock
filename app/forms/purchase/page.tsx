"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, inputCls } from "@/components/FormField";

interface Entry {
  id: string;
  date: string;
  grade: string;
  size: string;
  supplyCondition: string;
  make: string;
  quantity: number;
  description: string;
  location: string;
  pieces: number | null;
  uidNo: string | null;
  remarks: string | null;
  createdBy?: { name: string; role: string };
  createdAt: string;
}

const empty = { date: "", grade: "", size: "", supplyCondition: "", pieces: "", make: "", quantity: "", length: "", description: "", location: "", uidNo: "", remarks: "" };

export default function PurchasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isVerifier = (session?.user as { role?: string })?.role === "verifier";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  function loadEntries() {
    fetch("/api/forms/purchase").then((r) => r.json()).then(setEntries);
  }
  useEffect(() => { if (status === "authenticated") loadEntries(); }, [status]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/forms/purchase/${editId}` : "/api/forms/purchase";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    setShowForm(false); setForm(empty); setEditId(null); loadEntries();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    const res = await fetch(`/api/forms/purchase/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    loadEntries();
  }

  function startEdit(e: Entry) {
    setForm({
      date: e.date.slice(0, 10),
      grade: e.grade, size: e.size, supplyCondition: e.supplyCondition,
      pieces: e.pieces?.toString() || "", make: e.make, quantity: e.quantity.toString(),
      length: "", description: e.description, location: e.location,
      uidNo: e.uidNo || "", remarks: e.remarks || "",
    });
    setEditId(e.id); setShowForm(true); setError("");
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 0</p>
            <h1 className="text-2xl font-bold">Purchase Entry</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm(empty); setEditId(null); setError(""); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New Entry
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{editId ? "Edit" : "New"} Purchase Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Date" required>
                  <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Grade" required>
                  <DynamicSelect field="grade" value={form.grade} onChange={(v) => set("grade", v)} required />
                </Field>
                <Field label="Size" required>
                  <DynamicSelect field="size" value={form.size} onChange={(v) => set("size", v)} required />
                </Field>
                <Field label="Supply Condition" required>
                  <DynamicSelect field="supplyCondition" value={form.supplyCondition} onChange={(v) => set("supplyCondition", v)} required />
                </Field>
                <Field label="Make" required>
                  <DynamicSelect field="make" value={form.make} onChange={(v) => set("make", v)} required />
                </Field>
                <Field label="Description" required>
                  <DynamicSelect field="description" value={form.description} onChange={(v) => set("description", v)} required />
                </Field>
                <Field label="Location" required>
                  <DynamicSelect field="location" value={form.location} onChange={(v) => set("location", v)} required />
                </Field>
                <Field label="Quantity" required>
                  <input type="number" step="0.001" required value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Pieces">
                  <input type="number" value={form.pieces} onChange={(e) => set("pieces", e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Length (ft)">
                  <input type="number" step="0.01" value={form.length} onChange={(e) => set("length", e.target.value)} className={inputCls()} />
                </Field>
                <Field label="UID No.">
                  <input type="text" value={form.uidNo} onChange={(e) => set("uidNo", e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Remarks">
                  <input type="text" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={inputCls()} />
                </Field>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                  {saving ? "Saving..." : editId ? "Update" : "Save Entry"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
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
                <th className="px-4 py-3 font-medium text-gray-600">Size</th>
                <th className="px-4 py-3 font-medium text-gray-600">Condition</th>
                <th className="px-4 py-3 font-medium text-gray-600">Make</th>
                <th className="px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                {isVerifier && <th className="px-4 py-3 font-medium text-gray-600">Created By</th>}
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={isVerifier ? 10 : 9} className="text-center text-gray-400 py-10">No entries yet.</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 font-medium">{e.grade}</td>
                  <td className="px-4 py-3">{e.size}</td>
                  <td className="px-4 py-3">{e.supplyCondition}</td>
                  <td className="px-4 py-3">{e.make}</td>
                  <td className="px-4 py-3">{e.location}</td>
                  <td className="px-4 py-3 text-right font-semibold">{e.quantity.toFixed(3)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.description === "Prime" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {e.description}
                    </span>
                  </td>
                  {isVerifier && <td className="px-4 py-3 text-gray-500">{e.createdBy?.name || "—"}</td>}
                  <td className="px-4 py-3 flex gap-2">
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
