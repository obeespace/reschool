"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/Sidebar";
import { DEFAULT_CLASS_TEMPLATES, DEFAULT_SUBJECT_TEMPLATES } from "@/app/lib/setupTemplates";

type SetupStatusResponse = {
  isComplete: boolean;
  status: {
    hasSession: boolean;
    hasCurrentTerm: boolean;
    hasClasses: boolean;
    hasArms: boolean;
    hasSubjects: boolean;
    hasAdmissionSettings: boolean;
  };
  nextStep: number;
};

export default function AdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [sessionYear, setSessionYear] = useState("");
  const [sessionStartDate, setSessionStartDate] = useState("");
  const [sessionEndDate, setSessionEndDate] = useState("");
  const [armsInput, setArmsInput] = useState("A, B, C");
  const [classValues, setClassValues] = useState<string[]>([...DEFAULT_CLASS_TEMPLATES]);
  const [subjectValues, setSubjectValues] = useState<string[]>([...DEFAULT_SUBJECT_TEMPLATES]);
  const [prefix, setPrefix] = useState("SCH");
  const [yearFormat, setYearFormat] = useState<"YYYY" | "YY">("YYYY");
  const [numberLength, setNumberLength] = useState(3);

  const armValues = useMemo(
    () => armsInput.split(",").map((v) => v.trim()).filter(Boolean),
    [armsInput]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    setSessionYear(`${y}/${y + 1}`);
    setSessionStartDate(`${y}-09-01`);
    setSessionEndDate(`${y + 1}-07-31`);

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/admin/setup/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error("Failed to load setup status");
        }

        const data: SetupStatusResponse = await res.json();
        if (data.isComplete) {
          router.push("/admin/dashboard");
          return;
        }
      } catch (error) {
        toast.error("Could not verify setup status");
      } finally {
        setLoading(false);
      }
    };

    void checkStatus();
  }, [router]);

  const toggleItem = (items: string[], setItems: (next: string[]) => void, value: string) => {
    const exists = items.includes(value);
    if (exists) {
      setItems(items.filter((item) => item !== value));
      return;
    }
    setItems([...items, value]);
  };

  const handleCompleteSetup = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!schoolName.trim() || classValues.length === 0 || subjectValues.length === 0 || armValues.length === 0) {
      toast.error("Please complete all required setup fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        school: {
          name: schoolName.trim(),
          address: address.trim() || undefined,
        },
        session: {
          year: sessionYear,
          startDate: new Date(`${sessionStartDate}T00:00:00.000Z`).toISOString(),
          endDate: new Date(`${sessionEndDate}T00:00:00.000Z`).toISOString(),
        },
        classes: classValues,
        arms: armValues,
        subjects: subjectValues,
        admissionSettings: {
          prefix: prefix.trim(),
          yearFormat,
          numberLength,
        },
        autoCreateSections: true,
      };

      const res = await fetch("/api/admin/setup/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Setup failed");
      }

      toast.success("Setup completed successfully");
      router.push("/admin/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Setup failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="ADMIN">
        <div className="p-6">Loading setup wizard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">First-Time School Setup</h1>
          <p className="text-sm text-gray-600 mt-1">Complete this once to configure sessions, classes, arms, subjects, and admission numbering.</p>
        </div>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 1 - School Info</h2>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="School name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </section>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 2 & 3 - Session and Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded px-3 py-2" value={sessionYear} onChange={(e) => setSessionYear(e.target.value)} placeholder="2025/2026" />
            <input className="border rounded px-3 py-2" type="date" value={sessionStartDate} onChange={(e) => setSessionStartDate(e.target.value)} />
            <input className="border rounded px-3 py-2" type="date" value={sessionEndDate} onChange={(e) => setSessionEndDate(e.target.value)} />
          </div>
        </section>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 4 - Classes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEFAULT_CLASS_TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                className={`px-3 py-2 rounded border text-sm ${classValues.includes(name) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700"}`}
                onClick={() => toggleItem(classValues, setClassValues, name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 5 - Class Arms</h2>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="A, B, C or Gold, Silver, Diamond"
            value={armsInput}
            onChange={(e) => setArmsInput(e.target.value)}
          />
        </section>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 6 - Subjects</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DEFAULT_SUBJECT_TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                className={`px-3 py-2 rounded border text-sm ${subjectValues.includes(name) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700"}`}
                onClick={() => toggleItem(subjectValues, setSubjectValues, name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Step 7 - Admission Number Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded px-3 py-2" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix e.g. ROYAL" />
            <select className="border rounded px-3 py-2" value={yearFormat} onChange={(e) => setYearFormat(e.target.value as "YYYY" | "YY")}>
              <option value="YYYY">YYYY</option>
              <option value="YY">YY</option>
            </select>
            <input className="border rounded px-3 py-2" type="number" min={2} max={6} value={numberLength} onChange={(e) => setNumberLength(Number(e.target.value || 3))} />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCompleteSetup}
            disabled={submitting}
            className="bg-indigo-600 text-white px-5 py-2 rounded disabled:opacity-50"
          >
            {submitting ? "Saving setup..." : "Complete Setup"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
