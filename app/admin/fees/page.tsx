"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, LoadingSpinner, Modal, Input } from "@/app/components/UIComponents";

type TermItem = { _id: string; termNumber: number; isActive: boolean };
type ClassItem = { _id: string; level: string; arm: string };
type FeeItem = { feeType: string; label: string; amountDue: number; amountPaid: number; balance: number; isPaid: boolean; receiptNumber?: string };
type FeeRecord = {
  _id: string;
  studentId: { _id: string; fullName: string; admissionNumber: string };
  fees: FeeItem[];
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
};

const FEE_TYPES = [
  { key: "TUITION", label: "Tuition Fee" },
  { key: "PTA", label: "PTA Levy" },
  { key: "DEVELOPMENT", label: "Development Levy" },
  { key: "WAEC_LEVY", label: "WAEC Registration Levy" },
  { key: "NECO_LEVY", label: "NECO Registration Levy" },
  { key: "SPORTS", label: "Sports Fee" },
  { key: "UNIFORM", label: "Uniform Fee" },
  { key: "BOOKS", label: "Books/Stationery" },
  { key: "ICT", label: "ICT Levy" },
  { key: "BUS", label: "Bus Fee" },
  { key: "OTHER", label: "Other" },
];

export default function AdminFeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [students, setStudents] = useState<{ _id: string; fullName: string; admissionNumber: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [recordForm, setRecordForm] = useState({
    studentId: "",
    fees: FEE_TYPES.map((f) => ({ feeType: f.key, label: f.label, amountDue: "", amountPaid: "" })),
  });
  const [payForm, setPayForm] = useState({ recordId: "", studentId: "", feeType: "", amountPaid: "", receiptNumber: "" });

  const loadRecords = useCallback(async (termId: string, classId: string) => {
    if (!termId) return;
    const token = localStorage.getItem("token");
    const url = `/api/fees?termId=${termId}${classId ? `&classId=${classId}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setRecords(d.records || []); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    Promise.all([
      fetch("/api/terms", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/classes", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/students", { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([tRes, cRes, sRes]) => {
      if (tRes.ok) {
        const d = await tRes.json();
        const termList: TermItem[] = d.terms || [];
        setTerms(termList);
        const active = termList.find((t) => t.isActive);
        const id = active?._id ?? termList[0]?._id ?? "";
        setSelectedTerm(id);
        if (id) loadRecords(id, "");
      }
      if (cRes.ok) { const d = await cRes.json(); setClasses(d.classes || []); }
      if (sRes.ok) { const d = await sRes.json(); setStudents(d.students || []); }
    }).finally(() => setLoading(false));
  }, [router, loadRecords]);

  const handleTermChange = (t: string) => { setSelectedTerm(t); loadRecords(t, selectedClass); };
  const handleClassChange = (c: string) => { setSelectedClass(c); loadRecords(selectedTerm, c); };

  const handleRecordFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerm) { toast.error("Select a term first"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const fees = recordForm.fees
        .filter((f) => f.amountDue !== "")
        .map((f) => ({ feeType: f.feeType, label: f.label, amountDue: Number(f.amountDue), amountPaid: Number(f.amountPaid || 0) }));
      if (!fees.length) { toast.error("Enter at least one fee amount"); return; }

      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId: recordForm.studentId, termId: selectedTerm, fees }),
      });
      if (res.ok) {
        toast.success("Fee record saved!");
        setShowRecordModal(false);
        loadRecords(selectedTerm, selectedClass);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/fees/pay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId: payForm.studentId,
          termId: selectedTerm,
          feeType: payForm.feeType,
          amountPaid: Number(payForm.amountPaid),
          receiptNumber: payForm.receiptNumber,
        }),
      });
      if (res.ok) {
        toast.success("Payment recorded!");
        setShowPayModal(false);
        loadRecords(selectedTerm, selectedClass);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to record payment");
      }
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (record: FeeRecord, feeType: string) => {
    setPayForm({ recordId: record._id, studentId: record.studentId._id, feeType, amountPaid: "", receiptNumber: "" });
    setShowPayModal(true);
  };

  const defaulters = records.filter((r) => r.totalBalance > 0);

  if (loading) return <DashboardLayout role="ADMIN"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Fee Management"
        description="Track student fees, payments, and defaulters"
        action={<Button onClick={() => setShowRecordModal(true)}>+ Record Fees</Button>}
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select value={selectedTerm} onChange={(e) => handleTermChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term{t.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={selectedClass} onChange={(e) => handleClassChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— All Classes —</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.level} {c.arm}</option>)}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-500 uppercase font-medium">Total Students</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{records.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-500 uppercase font-medium">Total Collected</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              ₦{records.reduce((s, r) => s + r.totalPaid, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 shadow-sm p-4">
            <div className="text-xs text-red-500 uppercase font-medium">Outstanding Balance</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              ₦{records.reduce((s, r) => s + r.totalBalance, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Fee Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Fee Records {defaulters.length > 0 && <span className="ml-2 text-xs text-red-500 font-normal">({defaulters.length} defaulters)</span>}
          </h2>
          {records.length === 0 ? (
            <p className="text-gray-400 text-sm">No fee records found. Click &quot;+ Record Fees&quot; to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adm. No</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Due</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r._id} className={r.totalBalance > 0 ? "bg-red-50/30 hover:bg-red-50/60" : "hover:bg-gray-50"}>
                      <td className="px-4 py-2 font-medium">{r.studentId.fullName}</td>
                      <td className="px-4 py-2 text-gray-500">{r.studentId.admissionNumber}</td>
                      <td className="px-4 py-2 text-right">₦{r.totalDue.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-green-600">₦{r.totalPaid.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${r.totalBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                        ₦{r.totalBalance.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${r.totalBalance <= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {r.totalBalance <= 0 ? "Paid" : "Owing"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) openPayModal(r, e.target.value); e.target.value = ""; }}
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-indigo-600 cursor-pointer"
                        >
                          <option value="">Record payment…</option>
                          {r.fees.filter((f) => !f.isPaid).map((f) => (
                            <option key={f.feeType} value={f.feeType}>{f.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Fees Modal */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Record Student Fees">
        <form onSubmit={handleRecordFees} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={recordForm.studentId}
              onChange={(e) => setRecordForm({ ...recordForm, studentId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">— Select Student —</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.admissionNumber})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Fee Amounts (leave blank to skip)</div>
            {recordForm.fees.map((f, i) => (
              <div key={f.feeType} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-40 shrink-0">{f.label}</span>
                <input
                  type="number" placeholder="Due (₦)" min="0"
                  value={f.amountDue}
                  onChange={(e) => {
                    const updated = [...recordForm.fees];
                    updated[i] = { ...updated[i], amountDue: e.target.value };
                    setRecordForm({ ...recordForm, fees: updated });
                  }}
                  className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <input
                  type="number" placeholder="Paid (₦)" min="0"
                  value={f.amountPaid}
                  onChange={(e) => {
                    const updated = [...recordForm.fees];
                    updated[i] = { ...updated[i], amountPaid: e.target.value };
                    setRecordForm({ ...recordForm, fees: updated });
                  }}
                  className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Save Fee Record"}</Button>
            <Button variant="secondary" onClick={() => setShowRecordModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="text-sm text-gray-600">
            Fee Type: <span className="font-semibold">{FEE_TYPES.find((f) => f.key === payForm.feeType)?.label ?? payForm.feeType}</span>
          </div>
          <Input
            label="Amount Paid (₦)"
            type="number"
            value={payForm.amountPaid}
            onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
            placeholder="Enter amount paid"
            required
          />
          <Input
            label="Receipt Number (optional)"
            value={payForm.receiptNumber}
            onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
            placeholder="e.g. RCP-2024-001"
          />
          <div className="flex gap-3">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Record Payment"}</Button>
            <Button variant="secondary" onClick={() => setShowPayModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
