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
  entryType: string;
  locationFrom: string | null;
  instrLotsJson: string | null;
  actLotsJson: string | null;
  instructedBy: { name: string } | null;
  actualsFilledBy: { name: string } | null;
  verifiedBy: { name: string } | null;
  createdAt: string;
}

type LotDetail = { date: string; qty: string; locationTo: string; pieces: string; uidNo: string; subLoc: string; remarks: string; isJw: boolean; jwNo: string };
const emptyDetail = (): LotDetail => ({ date: "", qty: "", locationTo: "", pieces: "", uidNo: "", subLoc: "", remarks: "", isJw: false, jwNo: "" });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  instruction:    { label: "Instruction", color: "bg-gray-100 text-gray-600" },
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified:       { label: "Verified", color: "bg-green-100 text-green-700" },
};

export default function TransferPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;
  const isVerifier = user?.role === "verifier";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<"instruction" | "direct" | "actuals" | null>(null);
  const [step, setStep] = useState(1);
  const [locationFrom, setLocationFrom] = useState("");
  const [selectedLots, setSelectedLots] = useState<FullLot[]>([]);
  const [details, setDetails] = useState<Record<string, LotDetail>>({});
  const [actualsForId, setActualsForId] = useState<string | null>(null);
  const [instrEntry, setInstrEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  function load() { fetch("/api/forms/transfer").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  function openNew(m: "instruction" | "direct") {
    setMode(m); setStep(1); setLocationFrom(""); setSelectedLots([]); setDetails({});
    setActualsForId(null); setInstrEntry(null); setError("");
  }
  function openActuals(e: Entry) {
    setMode("actuals"); setStep(1); setLocationFrom(e.locationFrom || "");
    setSelectedLots([]); setDetails({}); setActualsForId(e.id); setInstrEntry(e); setError("");
  }
  function close() { setMode(null); setActualsForId(null); setInstrEntry(null); }

  function onLotsChange(lots: FullLot[]) {
    setSelectedLots(lots);
    setDetails((prev) => {
      const next: Record<string, LotDetail> = {};
      lots.forEach((l) => { next[l.id] = prev[l.id] ?? emptyDetail(); });
      return next;
    });
  }
  function setDetail(lotId: string, k: keyof LotDetail, v: string | boolean) {
    setDetails((prev) => ({ ...prev, [lotId]: { ...prev[lotId], [k]: v } }));
  }

  function goStep2() { if (!locationFrom) { setError("Select location first"); return; } setError(""); setStep(2); }
  function goStep3() { if (selectedLots.length === 0) { setError("Select at least one lot"); return; } setError(""); setStep(3); }

  async function submit() {
    for (const lot of selectedLots) {
      const d = details[lot.id];
      if (!d.date || !d.qty || !d.locationTo) { setError(`Fill date, qty and destination for all lots`); return; }
      if (parseFloat(d.qty) > lot.quantity + 0.001) { setError(`Qty for ${lot.grade} ${lot.size} exceeds available ${lot.quantity.toFixed(3)}`); return; }
      if (lot.pieces != null && d.pieces && parseInt(d.pieces) > lot.pieces) { setError(`Pieces for ${lot.grade} ${lot.size} exceeds lot pieces ${lot.pieces}`); return; }
    }
    const lotsJson = selectedLots.map((lot) => {
      const d = details[lot.id];
      return {
        lotId: lot.id,
        lotSnapshot: { grade: lot.grade, size: lot.size, supplyCondition: lot.supplyCondition, make: lot.make, description: lot.description, uidNo: lot.uidNo, subLoc: lot.subLoc, pieces: lot.pieces, quantity: lot.quantity },
        detail: { date: d.date, qty: parseFloat(d.qty), locationTo: d.locationTo, pieces: d.pieces ? parseInt(d.pieces) : undefined, uidNo: d.uidNo || undefined, subLoc: d.subLoc || undefined, remarks: d.remarks || undefined, jwNo: (mode !== "instruction" && d.isJw) ? d.jwNo.trim() : undefined },
      };
    });
    setSaving(true); setError("");
    let res: Response;
    // Validate JW fields for actuals/direct modes
    if (mode !== "instruction") {
      for (const lot of selectedLots) {
        const d = details[lot.id];
        if (d.isJw && !d.jwNo.trim()) { setError(`JW No. is required when JW is checked (${lot.grade} ${lot.size})`); setSaving(false); return; }
      }
    }
    if (actualsForId) {
      res = await fetch(`/api/forms/transfer/${actualsForId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "actuals", locationFrom, lotsJson }) });
    } else {
      res = await fetch("/api/forms/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: mode === "instruction" ? "instruction" : "direct_actuals", locationFrom, lotsJson }) });
    }
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
    close(); load();
  }

  async function verify(id: string) {
    if (!confirm("Verify? This will update stock permanently.")) return;
    const res = await fetch(`/api/forms/transfer/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "verify" }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/transfer/${id}`, { method: "DELETE" });
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
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 1</p>
            <h1 className="text-2xl font-bold">Internal Transfer</h1>
          </div>
          {!mode && (
            <div className="flex gap-2">
              <button onClick={() => openNew("instruction")} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">+ New Instruction</button>
              <button onClick={() => openNew("direct")} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Fill Actuals Directly</button>
            </div>
          )}
        </div>

        {mode && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-5">
              {[1,2,3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step===s?"bg-blue-600 text-white":step>s?"bg-green-500 text-white":"bg-gray-200 text-gray-500"}`}>{step>s?"✓":s}</div>
                  <span className={`text-sm ${step===s?"text-blue-700 font-semibold":"text-gray-400"}`}>{s===1?"Location":s===2?"Select Lots":"Fill Details"}</span>
                  {s<3&&<span className="text-gray-300 ml-1">›</span>}
                </div>
              ))}
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {mode==="actuals"?"Fill Actuals":mode==="instruction"?"New Instruction":"Direct Actuals"}
              </span>
            </div>

            {/* Instruction reference when filling actuals */}
            {mode==="actuals" && instrEntry?.instrLotsJson && (
              <details className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3" open={false}>
                <summary className="text-xs font-semibold text-blue-700 uppercase tracking-wide cursor-pointer">Instruction Reference ▾</summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-blue-600">From: <span className="font-semibold">{instrEntry.locationFrom}</span></p>
                  {(JSON.parse(instrEntry.instrLotsJson) as { lotSnapshot: FullLot; detail: LotDetail }[]).map((l, i) => (
                    <div key={i} className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                      <div className="bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 border-b border-blue-100">Lot {i+1} — Source Details</div>
                      <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                        {([["Grade", l.lotSnapshot.grade],["Size", l.lotSnapshot.size],["Supply Cond.", l.lotSnapshot.supplyCondition],["Make", l.lotSnapshot.make],["Description", l.lotSnapshot.description],["UID No.", l.lotSnapshot.uidNo??"—"],["Sub Loc", l.lotSnapshot.subLoc??"—"],["Avail. Qty", String(l.lotSnapshot.quantity)],["Pieces", l.lotSnapshot.pieces!=null?String(l.lotSnapshot.pieces):"—"]] as [string,string][]).map(([k,v])=>(
                          <div key={k}><span className="text-gray-400 block">{k}</span><span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                      <div className="border-t border-blue-100 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs bg-blue-50/40">
                        <div className="col-span-full text-blue-700 font-semibold text-xs mb-1">Instruction Details</div>
                        {([["Qty", String(l.detail.qty)],["Location To", l.detail.locationTo],["UID No.", l.detail.uidNo??"—"],["Sub Loc", l.detail.subLoc??"—"],["Pieces", l.detail.pieces!=null?String(l.detail.pieces):"—"],["Remarks", l.detail.remarks??"—"]] as [string,string][]).map(([k,v])=>(
                          <div key={k}><span className="text-gray-400 block">{k}</span><span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {step===1 && (
              <div className="space-y-4 max-w-sm">
                <h2 className="text-base font-semibold">Step 1 — Select Source Location</h2>
                <Field label="Location From" required>
                  <DynamicSelect field="location" value={locationFrom} onChange={setLocationFrom} required />
                </Field>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep2} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">Next →</button>
                  <button onClick={close} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}

            {step===2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 2 — Select Lots <span className="text-gray-400 font-normal text-sm">at {locationFrom}</span></h2>
                <LotPicker location={locationFrom} selected={selectedLots} onChange={onLotsChange} />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep3} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">Next →</button>
                  <button onClick={() => setStep(1)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                </div>
              </div>
            )}

            {step===3 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold">Step 3 — Fill Details Per Lot</h2>
                {selectedLots.map((lot) => {
                  const d = details[lot.id] ?? emptyDetail();
                  return (
                    <div key={lot.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                        {([["Grade",lot.grade],["Size",lot.size],["Supply Cond.",lot.supplyCondition],["Make",lot.make],["Description",lot.description],["UID No.",lot.uidNo??"—"],["Sub Loc",lot.subLoc??"—"],["Avail. Qty",lot.quantity.toFixed(3)]] as [string,string][]).map(([k,v])=>(
                          <div key={k}><span className="text-gray-400 text-xs">{k}</span><p className="font-medium">{v}</p></div>
                        ))}
                        {lot.pieces!=null&&<div><span className="text-gray-400 text-xs">Pieces</span><p className="font-medium">{lot.pieces}</p></div>}
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Date" required><input type="date" required value={d.date} onChange={(e)=>setDetail(lot.id,"date",e.target.value)} className={inputCls()} /></Field>
                        <Field label={`Qty (max ${lot.quantity.toFixed(3)})`} required><input type="number" step="0.001" min="0" max={lot.quantity} required value={d.qty} onChange={(e)=>setDetail(lot.id,"qty",e.target.value)} className={inputCls()} /></Field>
                        <Field label="Location To" required><DynamicSelect field="location" value={d.locationTo} onChange={(v)=>setDetail(lot.id,"locationTo",v)} required /></Field>
                        {lot.pieces!=null&&<Field label={`Pieces (max ${lot.pieces})`}><input type="number" min="0" max={lot.pieces} value={d.pieces} onChange={(e)=>setDetail(lot.id,"pieces",e.target.value)} className={inputCls()} /></Field>}
                        <Field label="UID No."><input type="text" value={d.uidNo} onChange={(e)=>setDetail(lot.id,"uidNo",e.target.value)} className={inputCls()} /></Field>
                        <Field label="Sub Loc"><input type="text" value={d.subLoc} onChange={(e)=>setDetail(lot.id,"subLoc",e.target.value)} className={inputCls()} /></Field>
                        <Field label="Remarks"><input type="text" value={d.remarks} onChange={(e)=>setDetail(lot.id,"remarks",e.target.value)} className={inputCls()} /></Field>
                        {(mode==="actuals"||mode==="direct")&&(
                          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4 pt-1">
                            <label className="flex items-center gap-2 text-sm font-medium text-indigo-700 cursor-pointer select-none">
                              <input type="checkbox" checked={d.isJw} onChange={(e)=>setDetail(lot.id,"isJw",e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                              JW
                            </label>
                            {d.isJw&&(
                              <Field label="JW No." required>
                                <input type="text" required value={d.jwNo} onChange={(e)=>setDetail(lot.id,"jwNo",e.target.value)} className={inputCls()+" w-48"} placeholder="Job Work No." />
                              </Field>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={submit} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                    {saving?"Saving…":mode==="actuals"?"Submit Actuals":mode==="instruction"?"Create Instruction":"Submit Actuals"}
                  </button>
                  <button onClick={()=>setStep(2)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                  <button onClick={close} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Form No.</th>
                <th className="px-4 py-3 font-medium text-gray-600">From</th>
                <th className="px-4 py-3 font-medium text-gray-600">Lots</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">By</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length===0&&<tr><td colSpan={7} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e) => {
                const s = STATUS_LABEL[e.status]||{label:e.status,color:"bg-gray-100 text-gray-600"};
                const lots = JSON.parse(e.actLotsJson||e.instrLotsJson||"[]") as {lotSnapshot:{grade:string;size:string};detail:{qty:number}}[];
                const totalQty = lots.reduce((sum,l)=>sum+(l.detail?.qty||0),0);
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-amber-700">I{e.formNo}</td>
                    <td className="px-4 py-3">{e.locationFrom??"—"}</td>
                    <td className="px-4 py-3">
                      {lots.map((l,i)=><span key={i} className="inline-block mr-1 text-xs bg-gray-100 rounded px-1">{l.lotSnapshot?.grade} {l.lotSnapshot?.size}</span>)}
                      {lots.length>0&&<span className="text-gray-400 text-xs ml-1">({totalQty.toFixed(3)})</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.entryType==="direct"?"Direct":"Instruction"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.instructedBy?.name||e.actualsFilledBy?.name||"—"}</td>
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      {e.status==="instruction"&&!mode&&<button onClick={()=>openActuals(e)} className="text-amber-600 hover:underline text-xs">Fill Actuals</button>}
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
