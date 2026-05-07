"use client";

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Banknote, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/app/components/Sidebar";
import {
  PageHeader, StatCard, DataTable, Button, Modal, Input, Select, LoadingSpinner,
} from "@/app/components/UIComponents";

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
  const [payForm, setPayForm] = useState({ studentId: "", feeType: "", amountPaid: "", receiptNumber: "" });

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
        const id = (termList.find((t) => t.isActive) ?? termList[0])?._id ?? "";
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
      if (res.ok) { toast.success("Fee record saved!"); setShowRecordModal(false); loadRecords(selectedTerm, selectedClass); }
      else { const d = await res.json(); toast.error(d.error || "Failed to save"); }
    } finally { setSaving(false); }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/fees/pay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId: payForm.studentId, termId: selectedTerm, feeType: payForm.feeType, amountPaid: Number(payForm.amountPaid), receiptNumber: payForm.receiptNumber }),
      });
      if (res.ok) { toast.success("Payment recorded!"); setShowPayModal(false); loadRecords(selectedTerm, selectedClass); }
      else { const d = await res.json(); toast.error(d.error || "Failed to record payment"); }
    } finally { setSaving(false); }
  };

  const openPayModal = (record: FeeRecord, feeType: string) => {
    setPayForm({ studentId: record.studentId._id, feeType, amountPaid: "", receiptNumber: "" });
    setShowPayModal(true);
  };

  const termOptions = terms.map((t) => ({
    value: t._id,
    label: `${t.termNumber === 1 ? "First" : t.termNumber === 2 ? "Second" : "Third"} Term${t.isActive ? " (Active)" : ""}`,
  }));
  const classOptions = [{ value: "", label: "All Classes" }, ...classes.map((c) => ({ value: c._id, label: `${c.level} ${c.arm}` }))];
  const studentOptions = [{ value: "", label: "Select student…" }, ...students.map((s) => ({ value: s._id, label: `${s.fullName} (${s.admissionNumber})` }))];

  const defaulterCount = records.filter((r) => r.totalBalance > 0).length;
  const totalCollected = records.reduce((s, r) => s + r.totalPaid, 0);
  const totalOutstanding = records.reduce((s, r) => s + r.totalBalance, 0);

  const tableRows = records.map((r) => ({
    name: r.studentId.fullName,
    admNo: r.studentId.admissionNumber,
    due: r.totalDue,
    paid: r.totalPaid,
    balance: r.totalBalance,
    status: r.totalBalance <= 0 ? "Paid" : "Owing",
    _record: r,
  }));

  const columns = [
    { header: "Student", accessor: "name" },
    { header: "Adm. No", accessor: "admNo" },
    {
      header: "Total Due", accessor: "due",
      render: (v: number) => <span className="font-medium">₦{v.toLocaleString()}</span>,
    },
    {
      header: "Paid", accessor: "paid",
      render: (v: number) => <span className="text-green-600 font-medium">₦{v.toLocaleString()}</span>,
    },
    {
      header: "Balance", accessor: "balance",
      render: (v: number) => (
        <span className={`font-semibold ${v > 0 ? "text-red-600" : "text-green-600"}`}>₦{v.toLocaleString()}</span>
      ),
    },
    {
      header: "Status", accessor: "status",
      render: (v: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v === "Paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {v}
        </span>
      ),
    },
    {
      header: "Actions", accessor: "_record",
      render: (record: FeeRecord) => (
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) openPayModal(record, e.target.value); e.target.value = ""; }}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-indigo-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors hover:border-indigo-300"
        >
          <option value="">Record payment…</option>
          {record.fees.filter((f) => !f.isPaid).map((f) => (
            <option key={f.feeType} value={f.feeType}>{f.label}</option>
          ))}
        </select>
      ),
    },
  ];

  if (loading) return <DashboardLayout role="ADMIN"><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Fee Management"
        description="Track student fees, payments, and defaulters"
        action={<Button onClick={() => setShowRecordModal(true)}>+ Record Fees</Button>}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex gap-5 flex-wrap items-end">
          <div className="flex-1 min-w-45">
            <Select label="Term" value={selectedTerm} onChange={(e) => handleTermChange(e.target.value)} options={termOptions} />
          </div>
          <div className="flex-1 min-w-45">
            <Select label="Class" value={selectedClass} onChange={(e) => handleClassChange(e.target.value)} options={classOptions} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Students" value={records.length} icon={Users} color="indigo" />
          <StatCard title="Total Collected" value={`₦${totalCollected.toLocaleString()}`} icon={Banknote} color="green" />
          <StatCard title="Outstanding Balance" value={`₦${totalOutstanding.toLocaleString()}`} icon={AlertTriangle} color="red" />
        </div>

        {/* Fee Records Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Fee Records</h2>
            {defaulterCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                {defaulterCount} defaulter{defaulterCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {records.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Banknote className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-gray-500 text-sm">No fee records yet. Click <strong>+ Record Fees</strong> to get started.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={tableRows} />
          )}
        </div>
      </div>

      {/* Record Fees Modal */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Record Student Fees">
        <form onSubmit={handleRecordFees} className="space-y-5">
          <Select
            label="Student"
            value={recordForm.studentId}
            onChange={(e) => setRecordForm({ ...recordForm, studentId: e.target.value })}
            options={studentOptions}
            required
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Fee Amounts <span className="text-gray-400 font-normal">(leave blank to skip)</span></p>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase">Fee Type</span>
                <span className="text-xs font-medium text-gray-500 uppercase">Amount Due (₦)</span>
                <span className="text-xs font-medium text-gray-500 uppercase">Amount Paid (₦)</span>
              </div>
              {recordForm.fees.map((f, i) => (
                <div key={f.feeType} className="grid grid-cols-3 items-center px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <span className="text-sm text-gray-700">{f.label}</span>
                  <input
                    type="number" placeholder="0" min="0"
                    value={f.amountDue}
                    onChange={(e) => {
                      const updated = [...recordForm.fees];
                      updated[i] = { ...updated[i], amountDue: e.target.value };
                      setRecordForm({ ...recordForm, fees: updated });
                    }}
                    className="w-full max-w-30 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <input
                    type="number" placeholder="0" min="0"
                    value={f.amountPaid}
                    onChange={(e) => {
                      const updated = [...recordForm.fees];
                      updated[i] = { ...updated[i], amountPaid: e.target.value };
                      setRecordForm({ ...recordForm, fees: updated });
                    }}
                    className="w-full max-w-30 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Save Fee Record"}</Button>
            <Button variant="secondary" onClick={() => setShowRecordModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-700">
            Fee Type: <span className="font-semibold">{FEE_TYPES.find((f) => f.key === payForm.feeType)?.label ?? payForm.feeType}</span>
          </div>
          <Input label="Amount Paid (₦)" type="number" value={payForm.amountPaid}
            onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
            placeholder="Enter amount paid" required />
          <Input label="Receipt Number (optional)" value={payForm.receiptNumber}
            onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
            placeholder="e.g. RCP-2024-001" />
          <div className="flex gap-3 pt-1">
            <Button type="submit" fullWidth disabled={saving}>{saving ? "Saving…" : "Record Payment"}</Button>
            <Button variant="secondary" onClick={() => setShowPayModal(false)} fullWidth>Cancel</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
