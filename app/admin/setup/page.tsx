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
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600 inline-block"></div>
          <p className="text-gray-500 text-sm mt-3">Loading setup wizard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ADMIN">
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-gray-900">First-Time School Setup</h1>
          <p className="text-gray-600 mt-2">Complete this once to configure your school, academic sessions, classes, subjects, and admission numbering.</p>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">1</div>
            <h2 className="text-lg font-semibold text-gray-900">School Information</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
            <input
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              placeholder="e.g. Royal Education Academy"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
            <input
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              placeholder="School address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">2–3</div>
            <h2 className="text-lg font-semibold text-gray-900">Academic Session & Terms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Year</label>
              <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm" value={sessionYear} onChange={(e) => setSessionYear(e.target.value)} placeholder="2025/2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm" type="date" value={sessionStartDate} onChange={(e) => setSessionStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm" type="date" value={sessionEndDate} onChange={(e) => setSessionEndDate(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">4</div>
            <h2 className="text-lg font-semibold text-gray-900">Class Levels</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {DEFAULT_CLASS_TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                className={`px-3.5 py-2.5 rounded-lg border font-medium text-sm transition-all ${classValues.includes(name) ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:shadow-sm"}`}
                onClick={() => toggleItem(classValues, setClassValues, name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">5</div>
            <h2 className="text-lg font-semibold text-gray-900">Class Arms / Sections</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arms (comma-separated)</label>
            <input
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              placeholder="e.g. A, B, C or Gold, Silver, Diamond"
              value={armsInput}
              onChange={(e) => setArmsInput(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1.5">Separate multiple arms with commas</p>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">6</div>
            <h2 className="text-lg font-semibold text-gray-900">Academic Subjects</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {DEFAULT_SUBJECT_TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                className={`px-3.5 py-2.5 rounded-lg border font-medium text-sm transition-all ${subjectValues.includes(name) ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:shadow-sm"}`}
                onClick={() => toggleItem(subjectValues, setSubjectValues, name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">7</div>
            <h2 className="text-lg font-semibold text-gray-900">Admission Number Format</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
              <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. ROYAL" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year Format</label>
              <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm bg-white" value={yearFormat} onChange={(e) => setYearFormat(e.target.value as "YYYY" | "YY")}>
                <option value="YYYY">YYYY (4 digits)</option>
                <option value="YY">YY (2 digits)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number Length</label>
              <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm" type="number" min={2} max={6} value={numberLength} onChange={(e) => setNumberLength(Number(e.target.value || 3))} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Example: ROYAL/2025/001</p>
        </section>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCompleteSetup}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {submitting ? "Completing Setup..." : "Complete Setup & Initialize"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
