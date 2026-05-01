"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("If the account exists, a reset link was sent.");
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      } else {
        toast.error(data.error || "Failed to request reset");
      }
    } catch (error) {
      toast.error("Failed to request reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter your email password reset link will be sent to you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {resetUrl && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-sm text-indigo-800 mb-2">Reset link (dev only):</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={resetUrl}
                className="flex-1 text-xs px-3 py-2 bg-white border border-indigo-200 rounded"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetUrl);
                  toast.success("Copied reset link");
                }}
                className="px-3 py-2 text-xs bg-indigo-600 text-white rounded"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/login")}
          className="mt-6 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
