"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, CheckCircle } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms & Privacy");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success(`Welcome back, ${data.user.name}!`);

        // Redirect based on role with fallback
        switch (data.user.role) {
          case "ADMIN":
            router.push("/admin/dashboard");
            break;
          case "TEACHER":
            router.push("/teacher/dashboard");
            break;
          case "PARENT":
            router.push("/parent/dashboard");
            break;
          default:
            toast.error("Invalid user role. Please contact administrator.");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            break;
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">RS</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">ReSchool</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started Now</h1>
            <p className="text-gray-600">Enter your credentials to access your account</p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Apple</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="your.email@school.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="min 8 chars"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{" "}
                <button type="button" className="text-indigo-600 hover:text-indigo-700">
                  Terms & Privacy
                </button>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Have an account?{" "}
            <button
              onClick={() => router.push("/")}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </button>
          </p>

          {/* Copyright */}
          <p className="mt-8 text-center text-xs text-gray-400">
            2026 ReSchool. All right Reserved
          </p>
        </div>
      </div>

      {/* Right Side - Dashboard Preview */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4">
            The simplest way to manage<br />your school
          </h2>
          <p className="text-indigo-100 text-lg">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="relative z-10 bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Dashboard</h3>
                <p className="text-xs text-gray-500">Jan 21, 2025 - Jan 28, 2025</p>
              </div>
            </div>
            <button className="text-sm text-indigo-600 font-medium">Add member</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">450</p>
              <p className="text-xs text-green-600">↑ +12% this month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900">25</p>
              <p className="text-xs text-green-600">↑ +8% this month</p>
            </div>
          </div>

          {/* Performance Table */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Class Performance</h4>
            <div className="space-y-2">
              {[
                { class: "JSS 1A", students: 45, avg: "85.2%", color: "bg-indigo-500" },
                { class: "JSS 1B", students: 42, avg: "82.8%", color: "bg-purple-500" },
                { class: "JSS 2A", students: 48, avg: "88.5%", color: "bg-pink-500" },
                { class: "SSS 1A", students: 38, avg: "79.3%", color: "bg-blue-500" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
                    <span className="font-medium text-gray-700">{item.class}</span>
                  </div>
                  <div className="text-gray-600 w-16">{item.students} students</div>
                  <div className="font-semibold text-gray-900 w-12 text-right">{item.avg}</div>
                  <div className="w-24 ml-3">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`${item.color} h-1.5 rounded-full`} style={{ width: item.avg }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="relative z-10 flex items-center justify-center gap-8 mt-8">
          <div className="text-white/60 text-sm font-medium">Trusted by schools nationwide</div>
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
