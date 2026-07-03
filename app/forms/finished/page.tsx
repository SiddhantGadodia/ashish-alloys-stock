"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, inputCls } from "@/components/FormField";
import LotPicker, { FullLot } from "@/components/LotPicker";

interface Entry {
  id: string;
  formNo: number;
  status: string;
  locationInitial: string | null;
  lotSectionsJson: string | null;
  actualsFilledBy: { name: string } | null;
  verifiedBy: { name: string } | null;
  createdAt: string;
}

type Section = { date: string; qty: string; supplyCondition: string; sizeFinal: string; locationFinal: string; subLocFinal: string; suspenseQty: string; pieces: string; remarks: string };
const emptySection = (): Section => ({ date: "", qty: "", supplyCondition: "", sizeFinal: "", locationFinal: "", subLocFinal: "", suspenseQty: "0", pieces: "", remarks: "" });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified:       { label: "Verified", color: "bg-green-100 text-green-700" },
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
  const [selectedLots, setSelectedLots] = useState<FullLot[]>([]);
  const [lotSections, setLotSections] = useState<Record<string, Section[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  function load() { fetch("/api/forms/finished").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  function openForm() { setShowForm(true); setStep(1); setLocationInitial(""); setSelectedLots([]); setLotSections({}); setError(""); }
  function close() { setShowForm(false); }

  function onLotsChange(lots: FullLot[]) {
    setSelectedLots(lots);
    setLotSections((prev) => {
      const next: Record<string, Section[]> = {};
      lots.forEach((l) => { next[l.id] = prev[l.id] ?? [emptySection()]; });
      return next;
    });
  }

  function setSecField(lotId: string, idx: number, k: keyof Section, v: string) {
    setLotSections((prev) => {
      const secs = [...(prev[lotId] ?? [])];
      secs[idx] = { ...secs[idx], [k]: v };
      return { ...prev, [lotId]: secs };
    });
  }
  function addSection(lotId: string) {
    setLotSections((prev) => ({ ...prev, [lotId]: [...(prev[lotId] ?? []), emptySection()] }));
  }
  function removeSection(lotId: string, idx: number) {
    setLotSections((prev) => {
      const secs = (prev[lotId] ?? []).filter((_, i) => i !== idx);
      return { ...prev, [lotId]: secs.length ? secs : [emptySection()] };
    });
  }

  function goStep2() { if (!locationInitial) { setError("Select location first"); return; } setError(""); setStep(2); }
  function goStep3() { if (selectedLots.length === 0) { setError("Select at least one lot"); return; } setError(""); setStep(3); }

  async function submit() {
    for (const lot of selectedLots) {
      const secs = lotSections[lot.id] ?? [];
      const total = secs.reduce((s, sec) => s + (parseFloat(sec.qty) || 0) + (parseFloat(sec.suspenseQty) || 0), 0);
      if (total > lot.quantity + 0.001) { setError(`Total qty+suspense for ${lot.grade} ${lot.size} (${total.toFixed(3)}) exceeds available ${lot.quantity.toFixed(3)}`); return; }
      for (const sec of secs) {
        if (!sec.date || !sec.sizeFinal || !sec.locationFinal || !sec.supplyCondition) { setError("Fill date, supply condition, size final and location final for all sections"); return; }
        if (lot.pieces != null && sec.pieces && parseInt(sec.pieces) > lot.pieces) { setError(`Pieces in a section exceeds lot pieces ${lot.pieces}`); return; }
      }
    }
    const payload = selectedLots.map((lot) => ({
      lotId: lot.id,
      lotSnapshot: { grade: lot.grade, make: lot.make, description: lot.description, uidNo: lot.uidNo, subLoc: lot.subLoc, quantity: lot.quantity, pieces: lot.pieces },
      sections: (lotSections[lot.id] ?? []).map((s) => ({
        date: s.date, qty: parseFloat(s.qty) || 0, supplyCondition: s.supplyCondition,
        sizeFinal: s.sizeFinal, locationFinal: s.locationFinal, subLocFinal: s.subLocFinal || undefined,
        suspenseQty: parseFloat(s.suspenseQty) || 0, pieces: s.pieces ? parseInt(s.pieces) : undefined, remarks: s.remarks || undefined,
      })),
    }));
    setSaving(true); setError("");
    const res = await fetch("/api/forms/finished", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationInitial, lotSections: payload }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    close(); load();
  }

  async function verify(id: string) {
    if (!confirm("Verify? This will update stock permanently.")) return;
    const res = await fetch(`/api/forms/finished/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "verify" }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/forms/finished/${id}`, { method: "DELETE" });
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
          {!showForm && <button onClick={openForm} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">+ New Entry</button>}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              {[1,2,3].map((s)=>(
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step===s?"bg-amber-600 text-white":step>s?"bg-green-500 text-white":"bg-gray-200 text-gray-500"}`}>{step>s?"✓":s}</div>
                  <span className={`text-sm ${step===s?"text-amber-700 font-semibold":"text-gray-400"}`}>{s===1?"Location":s===2?"Select Lots":"Fill Sections"}</span>
                  {s<3&&<span className="text-gray-300 ml-1">›</span>}
                </div>
              ))}
            </div>

            {step===1&&(
              <div className="space-y-4 max-w-sm">
                <h2 className="text-base font-semibold">Step 1 — Select Source Location</h2>
                <Field label="Location Initial" required><DynamicSelect field="location" value={locationInitial} onChange={setLocationInitial} required /></Field>
                {error&&<p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep2} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">Next →</button>
                  <button onClick={close} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}

            {step===2&&(
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 2 — Select Lots <span className="text-gray-400 font-normal text-sm">at {locationInitial}</span></h2>
                <LotPicker location={locationInitial} selected={selectedLots} onChange={onLotsChange} />
                {error&&<p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep3} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">Next →</button>
                  <button onClick={()=>setStep(1)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                </div>
              </div>
            )}

            {step===3&&(
              <div className="space-y-6">
                <h2 className="text-base font-semibold">Step 3 — Fill Sections Per Lot</h2>
                {selectedLots.map((lot)=>{
                  const secs = lotSections[lot.id]??[emptySection()];
                  const totalUsed = secs.reduce((s,sec)=>s+(parseFloat(sec.qty)||0)+(parseFloat(sec.suspenseQty)||0),0);
                  const remaining = lot.quantity - totalUsed;
                  return (
                    <div key={lot.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex flex-wrap gap-4 text-sm items-center justify-between">
                        <div className="flex flex-wrap gap-4">
                          {[["Grade",lot.grade],["Make",lot.make],["Description",lot.description],["UID No.",lot.uidNo??"—"],["Sub Loc",lot.subLoc??"—"],["Avail. Qty",lot.quantity.toFixed(3)]].map(([k,v])=>(
                            <div key={k}><span className="text-gray-400 text-xs">{k}</span><p className="font-medium">{v}</p></div>
                          ))}
                          {lot.pieces!=null&&<div><span className="text-gray-400 text-xs">Pieces</span><p className="font-medium">{lot.pieces}</p></div>}
                        </div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${remaining<-0.001?"bg-red-100 text-red-700":"bg-amber-50 text-amber-700"}`}>
                          Remaining: {remaining.toFixed(3)}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {secs.map((sec,idx)=>(
                          <div key={idx} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section {idx+1}</span>
                              {secs.length>1&&<button onClick={()=>removeSection(lot.id,idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <Field label="Date" required><input type="date" value={sec.date} onChange={(e)=>setSecField(lot.id,idx,"date",e.target.value)} className={inputCls()} /></Field>
                              <Field label="Qty" required><input type="number" step="0.001" min="0" value={sec.qty} onChange={(e)=>setSecField(lot.id,idx,"qty",e.target.value)} className={inputCls()} /></Field>
                              <Field label="Supply Condition" required><DynamicSelect field="supplyCondition" value={sec.supplyCondition} onChange={(v)=>setSecField(lot.id,idx,"supplyCondition",v)} required /></Field>
                              <Field label="Size Final" required><input type="text" value={sec.sizeFinal} onChange={(e)=>setSecField(lot.id,idx,"sizeFinal",e.target.value)} className={inputCls()} /></Field>
                              <Field label="Location Final" required><DynamicSelect field="location" value={sec.locationFinal} onChange={(v)=>setSecField(lot.id,idx,"locationFinal",v)} required /></Field>
                              <Field label="Sub Loc Final"><input type="text" value={sec.subLocFinal} onChange={(e)=>setSecField(lot.id,idx,"subLocFinal",e.target.value)} className={inputCls()} /></Field>
                              <Field label="Suspense Qty"><input type="number" step="0.001" min="0" value={sec.suspenseQty} onChange={(e)=>setSecField(lot.id,idx,"suspenseQty",e.target.value)} className={inputCls()} /></Field>
                              {lot.pieces!=null&&<Field label={`Pieces (max ${lot.pieces})`}><input type="number" min="0" max={lot.pieces} value={sec.pieces} onChange={(e)=>setSecField(lot.id,idx,"pieces",e.target.value)} className={inputCls()} /></Field>}
                              <Field label="Remarks"><input type="text" value={sec.remarks} onChange={(e)=>setSecField(lot.id,idx,"remarks",e.target.value)} className={inputCls()} /></Field>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pb-4">
                        <button onClick={()=>addSection(lot.id)} className="text-amber-600 hover:text-amber-700 text-sm font-semibold">+ Add Section</button>
                      </div>
                    </div>
                  );
                })}
                {error&&<p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={submit} disabled={saving} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition">{saving?"Saving…":"Submit"}</button>
                  <button onClick={()=>setStep(2)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                  <button onClick={close} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Form No.</th>
                <th className="px-4 py-3 font-medium text-gray-600">From</th>
                <th className="px-4 py-3 font-medium text-gray-600">Lots</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">By</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length===0&&<tr><td colSpan={6} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e)=>{
                const s = STATUS_LABEL[e.status]||{label:e.status,color:"bg-gray-100 text-gray-600"};
                const lots = JSON.parse(e.lotSectionsJson||"[]") as {lotSnapshot:{grade:string};sections:{qty:number;suspenseQty:number}[]}[];
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-emerald-700">F{e.formNo}</td>
                    <td className="px-4 py-3">{e.locationInitial??"—"}</td>
                    <td className="px-4 py-3">
                      {lots.map((l,i)=>{
                        const total=l.sections.reduce((s,sec)=>s+(sec.qty||0),0);
                        return <span key={i} className="inline-block mr-1 text-xs bg-gray-100 rounded px-1">{l.lotSnapshot?.grade} ({total.toFixed(3)})</span>;
                      })}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.actualsFilledBy?.name??e.verifiedBy?.name??"—"}</td>
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      {e.status==="actuals_filled"&&isVerifier&&<button onClick={()=>verify(e.id)} className="text-green-600 hover:underline text-xs">Verify</button>}
                      {(e.status!=="verified"||isVerifier)&&<button onClick={()=>del(e.id)} className="text-red-500 hover:underline text-xs">Delete</button>}
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
