import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

// SAANS Data Capture App — single-file React component
// - Uses Tailwind classes for styling
// - Supports: add, edit, delete, import Excel, export Excel, localStorage persistence

const FIELD_LABELS = [
  "Month ……………",
  "Name of the Block",
  "Name of Nodal Officer Incharge of SAANS 2025-26",
  "Whether SAANS 2025-26 was inaugurated at District Level?",
  "Number of Blocks that inaugurated SAANS 2025-26?",
  "No. of ASHAs trained on home visits for SAANS?",
  "No. of ANMS trained on SAANS?",
  "No. of Nursing Officers in PHCs, CHCs, Hospitals trained on SAANS?",
  "No. of Doctors trained on SAANS?",
  "No. of ASHAs that did house-to-house visits of under-five children?",
  "No. of under-five-children assessed by ASHAs for cough/difficulty in breathing/fast breathing?",
  "No. of under-five-children having symptoms and signs assessed by ANM/Staff Nurse/Medical Officer?",
  "No. of under-five-children administered pre-referral antibiotics/ORS/other medicines by ANM/Staff Nurse?",
  "No. of under-five-children referred to health facility by ASHA/ANM?",
  "No. of houses with at least 1 of the risk factors identified?",
  "No. of homes where counseling was done using M4M (Mother4Mother) approach?",
  "No. of under-five-children treated with cough syrup/ORS at community level?",
  "No. of under-five-children treated with Pneumonia treatment at community/PHC level?",
  "No. of under-five-children treated with Severe Pneumonia managed as per protocol?",
  "No. of under-five-children administered medications (antibiotics/ORS/other) as per guidelines?",
  "No. of Skill Station functional against approval",
  "Number of infants given PCV-1 vs number of infants eligible",
  "Number of infants given PCV-Booster vs number of infants eligible",
];

// helper: create machine keys from labels (safe object keys)
const toKey = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const FIELD_KEYS = FIELD_LABELS.map((l) => toKey(l));

export default function SAANSDataApp() {
  const emptyRecord = FIELD_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

  const [form, setForm] = useState({ ...emptyRecord });
  const [records, setRecords] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);

  // load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("saans_records_v1");
    if (raw) {
      try {
        setRecords(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to parse local data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("saans_records_v1", JSON.stringify(records));
  }, [records]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingIndex >= 0) {
      const updated = [...records];
      updated[editingIndex] = form;
      setRecords(updated);
      setEditingIndex(-1);
    } else {
      setRecords((r) => [...r, form]);
    }
    setForm({ ...emptyRecord });
  };

  const handleEdit = (i) => {
    setForm(records[i]);
    setEditingIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (i) => {
    if (!confirm("Delete this record?")) return;
    setRecords((r) => r.filter((_, idx) => idx !== i));
  };

  const downloadExcel = () => {
    if (records.length === 0) {
      alert("No records to export");
      return;
    }
    // prepare rows with Excel-friendly headers exactly as in FIELD_LABELS
    const rows = records.map((rec) => {
      const row = {};
      FIELD_KEYS.forEach((k, idx) => {
        row[FIELD_LABELS[idx]] = rec[k];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SAANS_Data");
    XLSX.writeFile(wb, "SAANS_Data.xlsx");
  };

  const importExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // try to parse with headers — we expect the first row to contain headers matching FIELD_LABELS
      let json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (json.length === 0) {
        alert("No data found in the Excel file.");
        return;
      }
      // map rows: accept either exact header labels OR headers that match keys
      const mapped = json.map((row) => {
        const out = { ...emptyRecord };
        // check each FIELD_LABELS
        FIELD_LABELS.forEach((label, idx) => {
          // prefer exact label
          if (row.hasOwnProperty(label)) out[FIELD_KEYS[idx]] = row[label];
          // else check if key-like header exists
          else if (row.hasOwnProperty(FIELD_KEYS[idx])) out[FIELD_KEYS[idx]] = row[FIELD_KEYS[idx]];
          else {
            // try case-insensitive match
            const matchKey = Object.keys(row).find(
              (h) => h.toLowerCase().trim() === label.toLowerCase().trim()
            );
            if (matchKey) out[FIELD_KEYS[idx]] = row[matchKey];
          }
        });
        return out;
      });
      setRecords((r) => [...r, ...mapped]);
      alert("Imported " + mapped.length + " rows.");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    importExcel(f);
    e.target.value = null;
  };

  const clearAll = () => {
    if (!confirm("Clear all records? This cannot be undone.")) return;
    setRecords([]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-2">SAANS Data Capture App</h1>
      <p className="text-sm text-gray-600">Fields and labels exactly match your Excel file.</p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl shadow-lg bg-white">
        {FIELD_LABELS.map((label, idx) => (
          <div key={idx} className="flex flex-col">
            <label className="text-xs font-medium mb-1">{label}</label>
            <input
              name={FIELD_KEYS[idx]}
              value={form[FIELD_KEYS[idx]]}
              onChange={handleChange}
              className="p-2 border rounded-xl"
            />
          </div>
        ))}

        <div className="col-span-1 md:col-span-2 flex gap-2 mt-2">
          <button type="submit" className="p-3 bg-blue-600 text-white rounded-2xl shadow-md hover:bg-blue-700">
            {editingIndex >= 0 ? "Update Record" : "Save Record"}
          </button>

          <label className="p-3 bg-gray-100 rounded-2xl border cursor-pointer flex items-center">
            <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
            Import Excel
          </label>

          <button type="button" onClick={downloadExcel} className="p-3 bg-green-600 text-white rounded-2xl shadow-md hover:bg-green-700">
            Download Excel
          </button>

          <button type="button" onClick={() => { setForm({ ...emptyRecord }); setEditingIndex(-1); }} className="p-3 bg-yellow-200 rounded-2xl">
            Reset Form
          </button>

          <button type="button" onClick={clearAll} className="p-3 bg-red-500 text-white rounded-2xl ml-auto">
            Clear All
          </button>
        </div>
      </form>

      <div className="mt-6 bg-white p-4 rounded-2xl shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-semibold">Captured Data ({records.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">#</th>
                {FIELD_LABELS.map((l, i) => (
                  <th key={i} className="border p-2 text-left text-xs">{l}</th>
                ))}
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i} className="align-top even:bg-gray-50">
                  <td className="border p-2 text-center">{i + 1}</td>
                  {FIELD_KEYS.map((k, idx) => (
                    <td key={idx} className="border p-2 text-sm">{rec[k]}</td>
                  ))}
                  <td className="border p-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleEdit(i)} className="px-2 py-1 bg-yellow-300 rounded">Edit</button>
                      <button onClick={() => handleDelete(i)} className="px-2 py-1 bg-red-400 text-white rounded">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>Notes:</p>
        <ul className="list-disc ml-6">
          <li>Import expects the Excel file to have headers that match the labels exactly. If your headers use shorter labels, the app will attempt a best-effort mapping.</li>
          <li>Data is stored in your browser localStorage. Use the Download Excel button to export saved rows.</li>
        </ul>
      </div>
    </div>
  );
}