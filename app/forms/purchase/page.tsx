"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, inputCls } from "@/components/FormField";
import * as XLSX from "xlsx";

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

interface ImportRow {
  date: string;
  grade: string;
  size: string;
  supplyCondition: string;
  quantity: string;
  location: string;
  make: string;
  description: string;
  uidNo: string;
  pieces: string;
  length: string;
  remarks: string;
  _error?: string;
}

const empty = { date: "", grade: "", size: "", supplyCondition: "", pieces: "", make: "", quantity: "", length: "", description: "", location: "", uidNo: "", remarks: "" };

// Normalise Excel header names to our field keys
function normaliseHeader(h: string): string {
  const s = h.trim().toLowerCase().replace(/[\s_\-\.]+/g, "");
  if (s.includes("date")) return "date";
  if (s.includes("grade")) return "grade";
  if (s.includes("size")) return "size";
  if (s.includes("supply") || s.includes("condition")) return "supplyCondition";
  if (s.includes("qty") || s.includes("quantity")) return "quantity";
  if (s.includes("location") || s.includes("loc")) return "location";
  if (s.includes("make")) return "make";
  if (s.includes("desc")) return "description";
  if (s.includes("uid")) return "uidNo";
  if (s.includes("piece")) return "pieces";
  if (s.includes("length")) return "length";
  if (s.includes("remark")) return "remarks";
  return s;
}

function excelDateToISO(val: unknown): string {
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  if (typeof val === "string" && val.trim()) {
    // Try to parse common Indian formats: DD/MM/YYYY or DD-MM-YYYY
    const parts = val.trim().split(/[\/\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
      if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

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

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; failed: number } | null>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (raw.length === 0) { alert("No data found in the Excel file."); return; }

      // Map headers
      const rows: ImportRow[] = raw.map((r) => {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          const key = normaliseHeader(k);
          mapped[key] = String(v ?? "").trim();
        }
        const date = excelDateToISO(r[Object.keys(r).find((k) => normaliseHeader(k) === "date") ?? ""] ?? mapped.date);
        const row: ImportRow = {
          date,
          grade: mapped.grade || "",
          size: mapped.size || "",
          supplyCondition: mapped.supplyCondition || "",
          quantity: mapped.quantity || "",
          location: mapped.location || "",
          make: mapped.make || "",
          description: mapped.description || "",
          uidNo: mapped.uidNo || "",
          pieces: mapped.pieces || "",
          length: mapped.length || "",
          remarks: mapped.remarks || "",
        };
        const missing = [];
        if (!row.date) missing.push("Date");
        if (!row.grade) missing.push("Grade");
        if (!row.quantity) missing.push("Quantity");
        if (missing.length) row._error = `Missing: ${missing.join(", ")}`;
        return row;
      });
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function runImport() {
    if (!importRows) return;
    setImporting(true);
    let ok = 0; let failed = 0;
    for (const row of importRows) {
      if (row._error) { failed++; continue; }
      const res = await fetch("/api/forms/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) ok++; else failed++;
    }
    setImporting(false);
    setImportResult({ ok, failed });
    if (ok > 0) loadEntries();
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
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileRef.current?.click()}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 transition"
            >
              Import Excel
            </button>
            <button
              onClick={() => { setShowForm(true); setForm(empty); setEditId(null); setError(""); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              + New Entry
            </button>
          </div>
        </div>

        {/* Excel import preview */}
        {importRows && !importResult && (
          <div className="bg-white rounded-2xl border border-blue-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Import Preview — {importRows.length} row{importRows.length !== 1 ? "s" : ""}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {importRows.filter((r) => !r._error).length} valid ·{" "}
                  <span className="text-red-500">{importRows.filter((r) => r._error).length} with errors (will be skipped)</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={runImport} disabled={importing || importRows.every((r) => !!r._error)}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                  {importing ? "Importing..." : `Import ${importRows.filter((r) => !r._error).length} Entries`}
                </button>
                <button onClick={() => setImportRows(null)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80 border border-gray-100 rounded-xl">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-gray-50 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Grade</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Size</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Supply Cond.</th>
                    <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Location</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Make</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Description</th>
                    <th className="px-3 py-2 font-medium text-gray-600">UID No.</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Pieces</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Remarks</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${r._error ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-1.5">{r.date || "—"}</td>
                      <td className="px-3 py-1.5 font-medium">{r.grade || "—"}</td>
                      <td className="px-3 py-1.5">{r.size || "—"}</td>
                      <td className="px-3 py-1.5">{r.supplyCondition || "—"}</td>
                      <td className="px-3 py-1.5 text-right">{r.quantity || "—"}</td>
                      <td className="px-3 py-1.5">{r.location || "—"}</td>
                      <td className="px-3 py-1.5">{r.make || "—"}</td>
                      <td className="px-3 py-1.5">{r.description || "—"}</td>
                      <td className="px-3 py-1.5">{r.uidNo || "—"}</td>
                      <td className="px-3 py-1.5">{r.pieces || "—"}</td>
                      <td className="px-3 py-1.5">{r.remarks || "—"}</td>
                      <td className="px-3 py-1.5">
                        {r._error
                          ? <span className="text-red-500 font-medium">{r._error}</span>
                          : <span className="text-green-600 font-medium">✓ Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className={`rounded-2xl border p-4 mb-6 flex items-center justify-between ${importResult.failed === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="text-sm font-medium">
              Import complete — <span className="text-green-700">{importResult.ok} imported</span>
              {importResult.failed > 0 && <span className="text-red-600"> · {importResult.failed} failed</span>}
            </p>
            <button onClick={() => { setImportRows(null); setImportResult(null); }} className="text-gray-500 text-sm hover:underline">Dismiss</button>
          </div>
        )}

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
                <th className="px-4 py-3 font-medium text-gray-600">Supply Condition</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 font-medium text-gray-600">Make</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 font-medium text-gray-600">UID No.</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Pieces</th>
                <th className="px-4 py-3 font-medium text-gray-600">Remarks</th>
                {isVerifier && <th className="px-4 py-3 font-medium text-gray-600">Created By</th>}
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={isVerifier ? 13 : 12} className="text-center text-gray-400 py-10">No entries yet.</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 font-medium">{e.grade}</td>
                  <td className="px-4 py-3">{e.size}</td>
                  <td className="px-4 py-3">{e.supplyCondition}</td>
                  <td className="px-4 py-3 text-right font-semibold">{e.quantity.toFixed(3)}</td>
                  <td className="px-4 py-3">{e.location}</td>
                  <td className="px-4 py-3">{e.make}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.description === "Prime" || e.description === "PRIME" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {e.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.uidNo ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{e.pieces ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{e.remarks ?? "—"}</td>
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
