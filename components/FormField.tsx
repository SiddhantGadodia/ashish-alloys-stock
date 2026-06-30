"use client";
import { useEffect, useState, useRef } from "react";

interface Option { value: string }

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

interface DynamicSelectProps {
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function DynamicSelect({ field, value, onChange, placeholder, required, className }: DynamicSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState(value);
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/dropdown?field=${field}`)
      .then((r) => r.json())
      .then((data: Option[]) => setOptions(data.map((d) => d.value)));
  }, [field]);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(inputVal.toLowerCase()));

  async function addOption(val: string) {
    await fetch("/api/dropdown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ field, value: val }) });
    setOptions((prev) => [...prev, val].sort());
    onChange(val);
    setInputVal(val);
    setOpen(false);
    setShowAdd(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={inputVal}
        required={required}
        placeholder={placeholder || `Select ${field}`}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ""}`}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && inputVal && (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              + Add &ldquo;{inputVal}&rdquo;
            </button>
          )}
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setInputVal(o); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              {o}
            </button>
          ))}
          {filtered.length > 0 && inputVal && !filtered.includes(inputVal) && (
            <button
              type="button"
              onClick={() => addOption(inputVal)}
              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
            >
              + Add &ldquo;{inputVal}&rdquo;
            </button>
          )}
        </div>
      )}
      {showAdd && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="New option"
          />
          <button type="button" onClick={() => addOption(inputVal)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-gray-500 px-2 py-1.5 text-sm">Cancel</button>
        </div>
      )}
    </div>
  );
}

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  field?: string;
}

export function MultiSelect({ options, selected, onChange, field }: MultiSelectProps) {
  const [allOptions, setAllOptions] = useState<string[]>(options);
  useEffect(() => { if (field) {
    fetch(`/api/dropdown?field=${field}`)
      .then((r) => r.json())
      .then((data: Option[]) => setAllOptions(data.map((d) => d.value)));
  }}, [field]);

  const opts = field ? allOptions : options;
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => {
        const checked = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(checked ? selected.filter((s) => s !== o) : [...selected, o])}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              checked ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function inputCls() {
  return "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
}
