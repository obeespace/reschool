"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { PageHeader, Button, Modal, Select } from "@/app/components/UIComponents";

interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  studentAdmissionNumber: string;
  admissionYear: number;
  graduationYear: number;
  classLevel: string;
  certificateNumber: string;
  issuedDate: number | null;
  signatureApprovalStatus: "PENDING" | "APPROVED" | "SIGNED";
  eligibility?: { eligible: boolean; reason: string };
}

type StatusFilter = "" | "PENDING" | "APPROVED" | "SIGNED";

export default function AdminCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [pendingList, setPendingList] = useState<Certificate[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signModal, setSignModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const fetchCertificates = useCallback(
    async (status?: StatusFilter) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        setLoading(true);
        const url = status ? `/api/certificates/manage?status=${status}` : "/api/certificates/manage";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          toast.error("Failed to load certificates");
          return;
        }
        const data = await res.json();
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
      } catch {
        toast.error("Error loading certificates");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const fetchPending = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/certificates/sign", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingList(Array.isArray(data.pending) ? data.pending : []);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
    fetchPending();
  }, [fetchCertificates, fetchPending]);

  const handleFilterChange = (val: string) => {
    const s = val as StatusFilter;
    setStatusFilter(s);
    fetchCertificates(s || undefined);
  };

  const openSignModal = (cert: Certificate) => {
    setSelectedCert(cert);
    setSignModal(true);
  };

  const handleSign = async (newStatus: "APPROVED" | "SIGNED") => {
    if (!selectedCert) return;
    try {
      setSigning(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/certificates/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certificateId: selectedCert.id, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update certificate");
        return;
      }
      toast.success(`Certificate ${newStatus.toLowerCase()} successfully`);
      setSignModal(false);
      setSelectedCert(null);
      fetchCertificates(statusFilter || undefined);
      fetchPending();
    } catch {
      toast.error("Error updating certificate");
    } finally {
      setSigning(false);
    }
  };

  const handleReprint = async (certId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/certificates/reprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certificateId: certId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Reprint failed");
        return;
      }
      toast.success("Reprint request submitted");
    } catch {
      toast.error("Error requesting reprint");
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SIGNED: "bg-green-100 text-green-700",
      APPROVED: "bg-blue-100 text-blue-700",
      PENDING: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  const totalSigned = certificates.filter((c) => c.signatureApprovalStatus === "SIGNED").length;
  const totalApproved = certificates.filter((c) => c.signatureApprovalStatus === "APPROVED").length;
  const totalPending = certificates.filter((c) => c.signatureApprovalStatus === "PENDING").length;

  return (
    <DashboardLayout role="ADMIN">
      <PageHeader
        title="Certificate Management"
        description="Review, approve, and sign graduation certificates"
        action={
          <Button variant="secondary" onClick={() => { fetchCertificates(statusFilter || undefined); fetchPending(); }}>
            Refresh
          </Button>
        }
      />

      <div className="px-4 sm:px-6 pb-6 pt-4 sm:pt-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Certificates", value: certificates.length, color: "text-gray-900" },
          { label: "Signed", value: totalSigned, color: "text-green-600" },
          { label: "Approved", value: totalApproved, color: "text-blue-600" },
          { label: "Pending", value: totalPending, color: "text-yellow-600" },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Pending sign queue */}
      {pendingList.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold mb-1">
            {pendingList.length} certificate{pendingList.length > 1 ? "s" : ""} awaiting your approval
          </p>
          <p className="text-yellow-600 text-sm">Use the Sign action below or filter by PENDING.</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-full sm:w-56">
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            options={[
              { value: "", label: "All Statuses" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "SIGNED", label: "Signed" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading certificates…</div>
      ) : certificates.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-700">
                <tr>
                  {["Cert No.", "Student", "Admission No.", "Class", "Grad Year", "Status", "Eligibility", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{cert.certificateNumber}</td>
                    <td className="px-4 py-3 font-medium">{cert.studentName}</td>
                    <td className="px-4 py-3 text-gray-600">{cert.studentAdmissionNumber}</td>
                    <td className="px-4 py-3">{cert.classLevel}</td>
                    <td className="px-4 py-3">{cert.graduationYear}</td>
                    <td className="px-4 py-3">{statusBadge(cert.signatureApprovalStatus)}</td>
                    <td className="px-4 py-3">
                      <span className={cert.eligibility?.eligible ? "text-green-600" : "text-red-500"}>
                        {cert.eligibility?.eligible ? "✓ Eligible" : cert.eligibility?.reason ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {cert.signatureApprovalStatus !== "SIGNED" && (
                          <Button variant="primary" onClick={() => openSignModal(cert)}>
                            {cert.signatureApprovalStatus === "PENDING" ? "Approve" : "Sign"}
                          </Button>
                        )}
                        {cert.signatureApprovalStatus === "SIGNED" && (
                          <Button variant="secondary" onClick={() => handleReprint(cert.id)}>
                            Reprint
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 py-8 text-center bg-white rounded-xl border border-gray-200">
          No certificates found{statusFilter ? ` with status "${statusFilter}"` : ""}.
        </div>
      )}

      {/* Sign / Approve Modal */}
      {selectedCert && (
        <Modal
          isOpen={signModal}
          onClose={() => { setSignModal(false); setSelectedCert(null); }}
          title="Update Certificate Status"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="font-medium">Student:</span> {selectedCert.studentName}</p>
              <p><span className="font-medium">Cert No:</span> {selectedCert.certificateNumber}</p>
              <p><span className="font-medium">Class:</span> {selectedCert.classLevel}</p>
              <p><span className="font-medium">Current Status:</span> {selectedCert.signatureApprovalStatus}</p>
              {selectedCert.eligibility && (
                <p>
                  <span className="font-medium">Eligibility:</span>{" "}
                  <span className={selectedCert.eligibility.eligible ? "text-green-600" : "text-red-500"}>
                    {selectedCert.eligibility.eligible ? "Eligible" : selectedCert.eligibility.reason}
                  </span>
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setSignModal(false); setSelectedCert(null); }}>
                Cancel
              </Button>
              {selectedCert.signatureApprovalStatus === "PENDING" && (
                <Button variant="primary" onClick={() => handleSign("APPROVED")} disabled={signing}>
                  {signing ? "Approving…" : "Approve"}
                </Button>
              )}
              {(selectedCert.signatureApprovalStatus === "PENDING" ||
                selectedCert.signatureApprovalStatus === "APPROVED") && (
                <Button variant="primary" onClick={() => handleSign("SIGNED")} disabled={signing}>
                  {signing ? "Signing…" : "Sign Certificate"}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
      </div>
    </DashboardLayout>
  );
}
