"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Field, DynamicSelect, inputCls } from "@/components/FormField";
import LotPicker, { FullLot } from "@/components/LotPicker";

interface Entry {
  id: string;
  status: string;
  entryType: string;
  locationInitial: string | null;
  lotSectionsJson: string | null;
  actLotsJson: string | null;
  createdBy: { name: string };
  actualsFilledBy: { name: string } | null;
  verifiedBy: { name: string } | null;
  createdAt: string;
}

// Instruction section fields
type InstrSection = { date: string; qty: string; rmSize: string; conversionSizeTolerance: string; length: string; colourCode: string; machines: string; additionalInstruction: string; supplyConditionFinal: string };
const emptyInstr = (): InstrSection => ({ date: "", qty: "", rmSize: "", conversionSizeTolerance: "", length: "", colourCode: "", machines: "", additionalInstruction: "", supplyConditionFinal: "" });

// Actuals section fields
type ActSection = { date: string; machine: string; sizeFinal: string; supplyConditionFinal: string; qty: string; lengthFinal: string; remarks: string };
const emptyAct = (): ActSection => ({ date: "", machine: "", sizeFinal: "", supplyConditionFinal: "", qty: "", lengthFinal: "", remarks: "" });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  instruction:    { label: "Instruction", color: "bg-gray-100 text-gray-600" },
  actuals_filled: { label: "Actuals Filled", color: "bg-amber-100 text-amber-700" },
  verified:       { label: "Verified", color: "bg-green-100 text-green-700" },
};

export default function ProductionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { id: string; role: string } | undefined;
  const isVerifier = user?.role === "verifier";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<"instruction" | "direct" | "actuals" | null>(null);
  const [step, setStep] = useState(1);
  const [locationInitial, setLocationInitial] = useState("");
  const [selectedLots, setSelectedLots] = useState<FullLot[]>([]);
  const [instrSections, setInstrSections] = useState<Record<string, InstrSection[]>>({});
  const [actSections, setActSections] = useState<Record<string, ActSection[]>>({});
  const [actualsForId, setActualsForId] = useState<string | null>(null);
  const [instrEntry, setInstrEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  function load() { fetch("/api/forms/production").then((r) => r.json()).then(setEntries); }
  useEffect(() => { if (status === "authenticated") load(); }, [status]);

  function openNew(m: "instruction" | "direct") {
    setMode(m); setStep(1); setLocationInitial(""); setSelectedLots([]); setInstrSections({}); setActSections({});
    setActualsForId(null); setInstrEntry(null); setError("");
  }
  function openActuals(e: Entry) {
    setMode("actuals"); setStep(1); setLocationInitial(e.locationInitial || "");
    setSelectedLots([]); setActSections({}); setActualsForId(e.id); setInstrEntry(e); setError("");
  }
  function close() { setMode(null); setActualsForId(null); setInstrEntry(null); }

  function onLotsChange(lots: FullLot[]) {
    setSelectedLots(lots);
    if (mode === "instruction") {
      setInstrSections((prev) => {
        const next: Record<string, InstrSection[]> = {};
        lots.forEach((l) => { next[l.id] = prev[l.id] ?? [emptyInstr()]; });
        return next;
      });
    } else {
      setActSections((prev) => {
        const next: Record<string, ActSection[]> = {};
        lots.forEach((l) => { next[l.id] = prev[l.id] ?? [emptyAct()]; });
        return next;
      });
    }
  }

  function setInstrField(lotId: string, idx: number, k: keyof InstrSection, v: string) {
    setInstrSections((prev) => { const secs = [...(prev[lotId] ?? [])]; secs[idx] = { ...secs[idx], [k]: v }; return { ...prev, [lotId]: secs }; });
  }
  function setActField(lotId: string, idx: number, k: keyof ActSection, v: string) {
    setActSections((prev) => { const secs = [...(prev[lotId] ?? [])]; secs[idx] = { ...secs[idx], [k]: v }; return { ...prev, [lotId]: secs }; });
  }
  function addInstrSection(lotId: string) { setInstrSections((prev) => ({ ...prev, [lotId]: [...(prev[lotId] ?? []), emptyInstr()] })); }
  function removeInstrSection(lotId: string, idx: number) { setInstrSections((prev) => { const secs = (prev[lotId] ?? []).filter((_, i) => i !== idx); return { ...prev, [lotId]: secs.length ? secs : [emptyInstr()] }; }); }
  function addActSection(lotId: string) { setActSections((prev) => ({ ...prev, [lotId]: [...(prev[lotId] ?? []), emptyAct()] })); }
  function removeActSection(lotId: string, idx: number) { setActSections((prev) => { const secs = (prev[lotId] ?? []).filter((_, i) => i !== idx); return { ...prev, [lotId]: secs.length ? secs : [emptyAct()] }; }); }

  function goStep2() { if (!locationInitial) { setError("Select location first"); return; } setError(""); setStep(2); }
  function goStep3() { if (selectedLots.length === 0) { setError("Select at least one lot"); return; } setError(""); setStep(3); }

  async function submit() {
    const isActuals = mode === "actuals" || mode === "direct";

    if (isActuals) {
      for (const lot of selectedLots) {
        const secs = actSections[lot.id] ?? [];
        const total = secs.reduce((s, sec) => s + (parseFloat(sec.qty) || 0), 0);
        if (total > lot.quantity + 0.001) { setError(`Total qty for ${lot.grade} ${lot.size} (${total.toFixed(3)}) exceeds available ${lot.quantity.toFixed(3)}`); return; }
        for (const sec of secs) { if (!sec.date || !sec.qty) { setError("Fill date and qty for all sections"); return; } }
      }
      const lotSections = selectedLots.map((lot) => ({
        lotId: lot.id,
        lotSnapshot: { grade: lot.grade, size: lot.size, supplyCondition: lot.supplyCondition, make: lot.make, description: lot.description, location: lot.location, subLoc: lot.subLoc, quantity: lot.quantity },
        sections: (actSections[lot.id] ?? []).map((s) => ({ ...s, qty: parseFloat(s.qty) || 0, lengthFinal: parseFloat(s.lengthFinal) || 0 })),
      }));
      setSaving(true); setError("");
      let res: Response;
      if (actualsForId) {
        res = await fetch(`/api/forms/production/${actualsForId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "actuals", locationInitial, lotSections }) });
      } else {
        res = await fetch("/api/forms/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "direct_actuals", locationInitial, lotSections }) });
      }
      setSaving(false);
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
      close(); load();
    } else {
      // instruction
      for (const lot of selectedLots) {
        const secs = instrSections[lot.id] ?? [];
        const total = secs.reduce((s, sec) => s + (parseFloat(sec.qty) || 0), 0);
        if (total > lot.quantity + 0.001) { setError(`Total qty for ${lot.grade} ${lot.size} (${total.toFixed(3)}) exceeds available ${lot.quantity.toFixed(3)}`); return; }
        for (const sec of secs) { if (!sec.date || !sec.qty) { setError("Fill date and qty for all sections"); return; } }
      }
      const lotSections = selectedLots.map((lot) => ({
        lotId: lot.id,
        lotSnapshot: { grade: lot.grade, uidNo: lot.uidNo, jwNo: lot.jwNo, make: lot.make, description: lot.description, quantity: lot.quantity },
        sections: (instrSections[lot.id] ?? []).map((s) => ({ ...s, qty: parseFloat(s.qty) || 0, length: parseFloat(s.length) || 0 })),
      }));
      setSaving(true); setError("");
      const res = await fetch("/api/forms/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "instruction", locationInitial, lotSections }) });
      setSaving(false);
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
      close(); load();
    }
  }

  async function verify(id: string) {
    if (!confirm("Verify? This will record production permanently.")) return;
    const res = await fetch(`/api/forms/production/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "verify" }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/forms/production/${id}`, { method: "DELETE" });
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
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Form 2</p>
            <h1 className="text-2xl font-bold">Production Planning</h1>
          </div>
          {!mode && (
            <div className="flex gap-2">
              <button onClick={() => openNew("instruction")} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">+ New Instruction</button>
              <button onClick={() => openNew("direct")} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 transition">Fill Actuals Directly</button>
            </div>
          )}
        </div>

        {mode && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              {[1,2,3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step===s?"bg-green-600 text-white":step>s?"bg-green-500 text-white":"bg-gray-200 text-gray-500"}`}>{step>s?"✓":s}</div>
                  <span className={`text-sm ${step===s?"text-green-700 font-semibold":"text-gray-400"}`}>{s===1?"Location":s===2?"Select Lots":mode==="instruction"?"Fill Instruction":"Fill Actuals"}</span>
                  {s<3&&<span className="text-gray-300 ml-1">›</span>}
                </div>
              ))}
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {mode==="actuals"?"Fill Actuals":mode==="instruction"?"New Instruction":"Direct Actuals"}
              </span>
            </div>

            {/* Instruction reference when filling actuals */}
            {mode==="actuals" && instrEntry?.lotSectionsJson && (
              <details className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3" open={false}>
                <summary className="text-xs font-semibold text-green-700 uppercase tracking-wide cursor-pointer">Instruction Reference ▾</summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-green-600">Location: <span className="font-semibold">{instrEntry.locationInitial}</span></p>
                  {(JSON.parse(instrEntry.lotSectionsJson) as { lotSnapshot: { grade: string; uidNo?: string; jwNo?: string; make: string; description: string; quantity: number }; sections: InstrSection[] }[]).map((l, i) => (
                    <div key={i} className="bg-white rounded-xl border border-green-100 overflow-hidden">
                      <div className="bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 border-b border-green-100">Lot {i+1}</div>
                      <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                        {([["Grade",l.lotSnapshot.grade],["Make",l.lotSnapshot.make],["Description",l.lotSnapshot.description],["UID No.",l.lotSnapshot.uidNo??"—"],["JW No.",l.lotSnapshot.jwNo??"—"],["Avail. Qty",String(l.lotSnapshot.quantity)]] as [string,string][]).map(([k,v])=>(
                          <div key={k}><span className="text-gray-400 block">{k}</span><span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                      {l.sections.map((sec, si) => (
                        <div key={si} className="border-t border-green-100 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs bg-green-50/30">
                          <div className="col-span-full text-green-700 font-semibold text-xs mb-1">Section {si+1}</div>
                          {([["Date",sec.date],["Qty",String(sec.qty)],["RM Size",sec.rmSize||"—"],["Conv. Size/Tol.",sec.conversionSizeTolerance||"—"],["Length",sec.length||"—"],["Supply Cond. Final",sec.supplyConditionFinal||"—"],["Colour Code",sec.colourCode||"—"],["Machines",sec.machines||"—"],["Instructions",sec.additionalInstruction||"—"]] as [string,string][]).map(([k,v])=>(
                            <div key={k}><span className="text-gray-400 block">{k}</span><span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {step===1 && (
              <div className="space-y-4 max-w-sm">
                <h2 className="text-base font-semibold">Step 1 — Select Location</h2>
                <Field label="Location" required><DynamicSelect field="location" value={locationInitial} onChange={setLocationInitial} required /></Field>
                {error&&<p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep2} className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">Next →</button>
                  <button onClick={close} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                </div>
              </div>
            )}

            {step===2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold">Step 2 — Select Lots <span className="text-gray-400 font-normal text-sm">at {locationInitial}</span></h2>
                <LotPicker location={locationInitial} selected={selectedLots} onChange={onLotsChange} />
                {error&&<p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={goStep3} className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition">Next →</button>
                  <button onClick={()=>setStep(1)} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
                </div>
              </div>
            )}

            {step===3 && mode==="instruction" && (
              <InstrStep lots={selectedLots} sections={instrSections} setField={setInstrField} addSection={addInstrSection} removeSection={removeInstrSection} error={error} saving={saving} onSubmit={submit} onBack={()=>setStep(2)} onCancel={close} />
            )}

            {step===3 && (mode==="direct"||mode==="actuals") && (
              <ActStep lots={selectedLots} sections={actSections} setField={setActField} addSection={addActSection} removeSection={removeActSection} error={error} saving={saving} onSubmit={submit} onBack={()=>setStep(2)} onCancel={close} mode={mode} />
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Lots</th>
                <th className="px-4 py-3 font-medium text-gray-600">By</th>
                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length===0&&<tr><td colSpan={7} className="text-center text-gray-400 py-10">No entries yet.</td></tr>}
              {entries.map((e) => {
                const s = STATUS_LABEL[e.status] || { label: e.status, color: "bg-gray-100 text-gray-600" };
                const lotsJson = e.actLotsJson || e.lotSectionsJson || "[]";
                const lots = JSON.parse(lotsJson) as { lotSnapshot: { grade: string }; sections: { qty: number }[] }[];
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{e.locationInitial??"—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.entryType==="direct"?"Direct":"Instruction"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      {lots.map((l,i)=><span key={i} className="inline-block mr-1 text-xs bg-gray-100 rounded px-1">{l.lotSnapshot?.grade} ({l.sections.reduce((s,sec)=>s+(sec.qty||0),0).toFixed(3)})</span>)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.actualsFilledBy?.name||e.createdBy?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(e.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      {e.status==="instruction"&&!mode&&<button onClick={()=>openActuals(e)} className="text-teal-600 hover:underline text-xs">Fill Actuals</button>}
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

// ── Instruction Step 3 ───────────────────────────────────────────────────────

function InstrStep({ lots, sections, setField, addSection, removeSection, error, saving, onSubmit, onBack, onCancel }: {
  lots: FullLot[]; sections: Record<string, InstrSection[]>;
  setField: (lotId: string, idx: number, k: keyof InstrSection, v: string) => void;
  addSection: (lotId: string) => void; removeSection: (lotId: string, idx: number) => void;
  error: string; saving: boolean; onSubmit: () => void; onBack: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 3 — Fill Instruction Sections</h2>
      {lots.map((lot) => {
        const secs = sections[lot.id] ?? [{ date:"",qty:"",rmSize:"",conversionSizeTolerance:"",length:"",colourCode:"",machines:"",additionalInstruction:"",supplyConditionFinal:"" }];
        const totalUsed = secs.reduce((s,sec)=>s+(parseFloat(sec.qty)||0),0);
        const remaining = lot.quantity - totalUsed;
        return (
          <div key={lot.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex flex-wrap gap-4 text-sm items-center justify-between">
              <div className="flex flex-wrap gap-4">
                {([["Grade",lot.grade],["Make",lot.make],["Description",lot.description],["UID No.",lot.uidNo??"—"]] as [string,string][]).map(([k,v])=>(
                  <div key={k}><span className="text-gray-400 text-xs">{k}</span><p className="font-medium">{v}</p></div>
                ))}
                {lot.jwNo&&<div><span className="text-gray-400 text-xs">JW No.</span><p className="font-semibold text-indigo-700">{lot.jwNo}</p></div>}
                <div><span className="text-gray-400 text-xs">Avail. Qty</span><p className="font-semibold text-green-700">{lot.quantity.toFixed(3)}</p></div>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded-full ${remaining < -0.001 ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>Remaining: {remaining.toFixed(3)}</div>
            </div>
            <div className="divide-y divide-gray-100">
              {secs.map((sec,idx)=>(
                <div key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section {idx+1}</span>
                    {secs.length>1&&<button onClick={()=>removeSection(lot.id,idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Date" required><input type="date" value={sec.date} onChange={(e)=>setField(lot.id,idx,"date",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Qty" required><input type="number" step="0.001" min="0" value={sec.qty} onChange={(e)=>setField(lot.id,idx,"qty",e.target.value)} className={inputCls()} /></Field>
                    <Field label="RM Size"><input type="text" value={sec.rmSize} onChange={(e)=>setField(lot.id,idx,"rmSize",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Conv. Size / Tolerance"><input type="text" value={sec.conversionSizeTolerance} onChange={(e)=>setField(lot.id,idx,"conversionSizeTolerance",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Length"><input type="number" step="0.001" value={sec.length} onChange={(e)=>setField(lot.id,idx,"length",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Supply Condition Final"><DynamicSelect field="supplyCondition" value={sec.supplyConditionFinal} onChange={(v)=>setField(lot.id,idx,"supplyConditionFinal",v)} /></Field>
                    <Field label="Colour Code"><DynamicSelect field="colourCode" value={sec.colourCode} onChange={(v)=>setField(lot.id,idx,"colourCode",v)} /></Field>
                    <Field label="Machine"><DynamicSelect field="machine" value={sec.machines} onChange={(v)=>setField(lot.id,idx,"machines",v)} /></Field>
                    <Field label="Additional Instructions"><input type="text" value={sec.additionalInstruction} onChange={(e)=>setField(lot.id,idx,"additionalInstruction",e.target.value)} className={inputCls()} /></Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4"><button onClick={()=>addSection(lot.id)} className="text-green-600 hover:text-green-700 text-sm font-semibold">+ Add Section</button></div>
          </div>
        );
      })}
      {error&&<p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onSubmit} disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">{saving?"Saving…":"Submit Instruction"}</button>
        <button onClick={onBack} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
        <button onClick={onCancel} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
      </div>
    </div>
  );
}

// ── Actuals Step 3 ───────────────────────────────────────────────────────────

function ActStep({ lots, sections, setField, addSection, removeSection, error, saving, onSubmit, onBack, onCancel, mode }: {
  lots: FullLot[]; sections: Record<string, ActSection[]>;
  setField: (lotId: string, idx: number, k: keyof ActSection, v: string) => void;
  addSection: (lotId: string) => void; removeSection: (lotId: string, idx: number) => void;
  error: string; saving: boolean; onSubmit: () => void; onBack: () => void; onCancel: () => void;
  mode: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 3 — Fill Actuals Sections</h2>
      {lots.map((lot) => {
        const secs = sections[lot.id] ?? [{ date:"",machine:"",sizeFinal:"",supplyConditionFinal:"",qty:"",lengthFinal:"",remarks:"" }];
        const totalUsed = secs.reduce((s,sec)=>s+(parseFloat(sec.qty)||0),0);
        const remaining = lot.quantity - totalUsed;
        return (
          <div key={lot.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex flex-wrap gap-4 text-sm items-center justify-between">
              <div className="flex flex-wrap gap-4">
                {([["Grade",lot.grade],["Size",lot.size],["Supply Cond.",lot.supplyCondition],["Make",lot.make],["Description",lot.description],["Location",lot.location],["Sub Loc",lot.subLoc??"—"],["UID No.",lot.uidNo??"—"]] as [string,string][]).map(([k,v])=>(
                  <div key={k}><span className="text-gray-400 text-xs">{k}</span><p className="font-medium">{v}</p></div>
                ))}
                {lot.jwNo&&<div><span className="text-gray-400 text-xs">JW No.</span><p className="font-semibold text-indigo-700">{lot.jwNo}</p></div>}
                <div><span className="text-gray-400 text-xs">Avail. Qty</span><p className="font-semibold text-green-700">{lot.quantity.toFixed(3)}</p></div>
              </div>
              <div className={`text-xs font-semibold px-2 py-1 rounded-full ${remaining < -0.001 ? "bg-red-100 text-red-700" : "bg-green-50 text-green-700"}`}>Remaining: {remaining.toFixed(3)}</div>
            </div>
            <div className="divide-y divide-gray-100">
              {secs.map((sec,idx)=>(
                <div key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section {idx+1}</span>
                    {secs.length>1&&<button onClick={()=>removeSection(lot.id,idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Date" required><input type="date" value={sec.date} onChange={(e)=>setField(lot.id,idx,"date",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Machine"><DynamicSelect field="machine" value={sec.machine} onChange={(v)=>setField(lot.id,idx,"machine",v)} /></Field>
                    <Field label="Final Size"><input type="text" value={sec.sizeFinal} onChange={(e)=>setField(lot.id,idx,"sizeFinal",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Supply Condition Final"><DynamicSelect field="supplyCondition" value={sec.supplyConditionFinal} onChange={(v)=>setField(lot.id,idx,"supplyConditionFinal",v)} /></Field>
                    <Field label={`Qty (max ${lot.quantity.toFixed(3)})`} required><input type="number" step="0.001" min="0" max={lot.quantity} value={sec.qty} onChange={(e)=>setField(lot.id,idx,"qty",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Final Length"><input type="number" step="0.001" value={sec.lengthFinal} onChange={(e)=>setField(lot.id,idx,"lengthFinal",e.target.value)} className={inputCls()} /></Field>
                    <Field label="Remarks"><input type="text" value={sec.remarks} onChange={(e)=>setField(lot.id,idx,"remarks",e.target.value)} className={inputCls()} /></Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4"><button onClick={()=>addSection(lot.id)} className="text-teal-600 hover:text-teal-700 text-sm font-semibold">+ Add Section</button></div>
          </div>
        );
      })}
      {error&&<p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onSubmit} disabled={saving} className="bg-teal-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition">{saving?"Saving…":"Submit Actuals"}</button>
        <button onClick={onBack} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">← Back</button>
        <button onClick={onCancel} className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
      </div>
    </div>
  );
}
