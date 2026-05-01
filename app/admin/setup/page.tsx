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
  const [terms, setTerms] = useState<Array<{ number: 1 | 2 | 3; name: string; startDate: string; endDate: string }>>([
    { number: 1, name: "First Term", startDate: "", endDate: "" },
    { number: 2, name: "Second Term", startDate: "", endDate: "" },
    { number: 3, name: "Third Term", startDate: "", endDate: "" },
  ]);
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

    // Auto-generate Nigerian standard 3-term calendar
    const term1Start = `${y}-09-01`;
    const term1End = `${y}-12-31`;
    const term2Start = `${y + 1}-01-01`;
    const term2End = `${y + 1}-03-31`;
    const term3Start = `${y + 1}-04-01`;
    const term3End = `${y + 1}-07-31`;

    setSessionStartDate(term1Start);
    setSessionEndDate(term3End);

    setTerms([
      { number: 1, name: "First Term", startDate: term1Start, endDate: term1End },
      { number: 2, name: "Second Term", startDate: term2Start, endDate: term2End },
      { number: 3, name: "Third Term", startDate: term3Start, endDate: term3End },
    ]);

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/setup", {
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

        const data = await res.json();
        if (data.isSetupComplete) {
          // Setup already done, go to dashboard
          router.push("/admin/dashboard");
          return;
        }
      } catch (error) {
        // If error checking status, still allow setup page to load
        console.error("Could not verify setup status:", error);
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

    // Validate all terms have dates
    if (terms.some((t) => !t.startDate || !t.endDate)) {
      toast.error("Please set dates for all three terms");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        schoolName: schoolName.trim(),
        address: address.trim() || undefined,
        sessionYear,
        sessionStartDate: new Date(sessionStartDate),
        sessionEndDate: new Date(sessionEndDate),
        terms: terms.map((t) => ({
          termNumber: t.number,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        })),
        classLevels: classValues,
        classArms: armValues,
        subjects: subjectValues,
        admissionNumberFormat: {
          prefix: prefix.trim(),
          yearFormat,
          numberLength,
        },
      };

      const res = await fetch("/api/setup", {
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

      toast.success("Setup completed successfully! Welcome to your dashboard.");
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

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">2–3</div>
            <h2 className="text-lg font-semibold text-gray-900">Academic Session & Terms Calendar</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
            <p className="text-sm text-gray-600"><strong>Session Year:</strong> {sessionYear}</p>
            <p className="text-xs text-gray-500 mt-1">Nigerian schools run 3 terms: September–December, January–March, April–July</p>
          </div>

          <div className="space-y-4">
            {terms.map((term, idx) => (
              <div key={term.number} className="bg-gradient-to-br from-indigo-50 to-indigo-25 rounded-lg border border-indigo-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs">
                    {term.number}
                  </div>
                  <h3 className="font-semibold text-gray-900">{term.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                      value={term.startDate}
                      onChange={(e) => {
                        const newTerms = [...terms];
                        newTerms[idx].startDate = e.target.value;
                        setTerms(newTerms);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                      value={term.endDate}
                      onChange={(e) => {
                        const newTerms = [...terms];
                        newTerms[idx].endDate = e.target.value;
                        setTerms(newTerms);
                      }}
                    />
                  </div>
                </div>
                {term.startDate && term.endDate && (
                  <p className="text-xs text-gray-600 mt-2">
                    📅 Duration: {Math.ceil((new Date(term.endDate).getTime() - new Date(term.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                )}
              </div>
            ))}
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
