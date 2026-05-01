"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  GraduationCap, 
  Users, 
  BarChart3, 
  Bell, 
  CheckCircle, 
  ArrowRight,
  School,
  BookOpen,
  Shield,
  Zap,
  Star
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    domainSlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    phone: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePayment = async () => {
    if (!formData.schoolName || !formData.adminEmail || !formData.adminPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    toast.info("Processing payment...");
    
    setTimeout(async () => {
      try {
        const response = await fetch("/api/schools/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName: formData.schoolName,
            adminName: formData.adminName,
            email: formData.adminEmail,
            password: formData.adminPassword,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.token && data?.user) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
          }
          toast.success("Payment successful! Your school account has been created.");
          setTimeout(() => {
            router.push("/admin/setup");
          }, 1500);
        } else {
          const error = await response.json();
          toast.error(`Registration failed: ${error.error}`);
        }
      } catch (error) {
        toast.error("Connection error. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-lg font-bold text-white">RS</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">ReSchool</span>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors shadow-sm"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" fill="currentColor" />
              Trusted by 100+ Nigerian Schools
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Modern School<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">
                Management System
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10">
              Complete solution for Nigerian primary and secondary schools. Manage students, teachers,
              scores, and generate reports effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowPayment(true)}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200 text-lg"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-1">100+</div>
              <div className="text-gray-600 text-sm">Active Schools</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-1">50K+</div>
              <div className="text-gray-600 text-sm">Students Managed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-1">2K+</div>
              <div className="text-gray-600 text-sm">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-1">99.9%</div>
              <div className="text-gray-600 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything Your School Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive features designed specifically for Nigerian schools
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-8 bg-linear-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Teacher Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Assign class teachers and subject teachers with granular permissions. Track attendance and performance.
              </p>
            </div>

            <div className="group p-8 bg-linear-to-br from-purple-50 to-white rounded-2xl border border-purple-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Score Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Track classwork, homework, tests, and exams with automatic calculation and grade generation.
              </p>
            </div>

            <div className="group p-8 bg-linear-to-br from-pink-50 to-white rounded-2xl border border-pink-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Parent Portal</h3>
              <p className="text-gray-600 leading-relaxed">
                Parents can view their ward's performance, attendance, and announcements in real-time.
              </p>
            </div>

            <div className="group p-8 bg-linear-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Announcements</h3>
              <p className="text-gray-600 leading-relaxed">
                Send targeted announcements to teachers, parents, or specific classes instantly.
              </p>
            </div>

            <div className="group p-8 bg-linear-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Subject Linking</h3>
              <p className="text-gray-600 leading-relaxed">
                Link subjects to classes and assign teachers with full control over curriculum management.
              </p>
            </div>

            <div className="group p-8 bg-linear-to-br from-amber-50 to-white rounded-2xl border border-amber-100 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <School className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Multi-Term Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Manage multiple academic years and terms with seamless promotion and historical records.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Why Choose Us */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Schools Choose ReSchool
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built by Nigerians, for Nigerian schools
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Lightning Fast</h3>
              <p className="text-gray-600">
                Optimized for speed with instant page loads and real-time updates.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Secure & Reliable</h3>
              <p className="text-gray-600">
                Bank-level security with 99.9% uptime guarantee for your data.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Easy to Use</h3>
              <p className="text-gray-600">
                Intuitive interface that requires minimal training for staff.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Registration */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className={`bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-500 ${showPayment ? 'p-0' : 'p-12'}`}>
            {!showPayment ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-6">
                  <CheckCircle className="w-4 h-4" />
                  Simple, Transparent Pricing
                </div>
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Get Started Today
                </h3>
                <div className="mb-8">
                  <div className="text-6xl font-bold text-indigo-600 mb-2">₦50,000</div>
                  <div className="text-xl text-gray-600">per term</div>
                  <div className="text-gray-500 mt-2">Unlimited users • All features included</div>
                </div>

                <div className="space-y-3 mb-10 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">Unlimited teachers and students</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">Real-time notifications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">Complete report generation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">Parent portal access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">24/7 customer support</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full max-w-md mx-auto bg-indigo-600 text-white py-5 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Register Your School
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="p-8 md:p-12">
                <div className="mb-8">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                  <h4 className="text-3xl font-bold text-gray-900">School Registration</h4>
                  <p className="text-gray-600 mt-2">Complete the form below to create your account</p>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Divine Grace Secondary School"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Principal Adebayo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="adminEmail"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="admin@school.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="080XXXXXXXX"
                    />
                  </div>

                  <div className="bg-linear-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                      Payment Summary
                    </h5>
                    <div className="flex justify-between mb-2 text-gray-700">
                      <span>Subscription (1 Term)</span>
                      <span className="font-semibold">₦50,000</span>
                    </div>
                    <div className="flex justify-between font-bold text-xl text-gray-900 border-t border-indigo-200 pt-3 mt-3">
                      <span>Total</span>
                      <span>₦50,000</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isProcessing || !formData.schoolName || !formData.adminEmail || !formData.adminPassword}
                    className="w-full bg-linear-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay ₦50,000 & Create Account</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold">RS</span>
              </div>
              <span className="text-xl font-bold">ReSchool</span>
            </div>
            <div className="text-gray-400">
              &copy; 2026 ReSchool. Built for Nigerian Schools with ❤️
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
