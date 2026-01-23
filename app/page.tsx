"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        const response = await fetch("/api/schools/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.schoolName,
            email: formData.adminEmail,
            password: formData.adminPassword,
          }),
        });

        if (response.ok) {
          alert("Payment successful! School account created. Please login with your admin credentials.");
          router.push("/login");
        } else {
          const error = await response.json();
          alert(`Registration failed: ${error.error}`);
        }
      } catch (error) {
        alert("An error occurred during registration");
      } finally {
        setIsProcessing(false);
      }
    }, 2000); // Simulate 2-second payment processing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">ReSchool</h1>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4">
            Modern School Management System
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete solution for Nigerian primary and secondary schools. Manage students, teachers,
            scores, and generate reports effortlessly.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-indigo-600 text-4xl mb-4">👨‍🏫</div>
            <h3 className="text-xl font-bold mb-2">Teacher Management</h3>
            <p className="text-gray-600">Assign class teachers and subject teachers with proper permissions</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-indigo-600 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Score Management</h3>
            <p className="text-gray-600">Track classwork, homework, tests, and exams with auto-calculation</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-indigo-600 text-4xl mb-4">👪</div>
            <h3 className="text-xl font-bold mb-2">Parent Portal</h3>
            <p className="text-gray-600">Parents can view their ward's performance in real-time</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Get Started Today</h3>
            <p className="text-gray-600">₦50,000 per term - Unlimited users</p>
          </div>

          {!showPayment ? (
            <button
              onClick={() => setShowPayment(true)}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
            >
              Register Your School
            </button>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xl font-bold mb-4">School Registration</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Divine Grace Secondary School"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Slug (for login URL)
                </label>
                <input
                  type="text"
                  name="domainSlug"
                  value={formData.domainSlug}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., divine-grace"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your login URL: reschool.com/{formData.domainSlug || "your-school"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Principal Adebayo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="admin@school.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="080XXXXXXXX"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold mb-2">Payment Summary</h5>
                <div className="flex justify-between mb-2">
                  <span>Subscription (1 Term)</span>
                  <span>₦50,000</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>₦50,000</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || !formData.schoolName || !formData.adminEmail || !formData.adminPassword}
                className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing Payment..." : "Pay ₦50,000 & Create Account"}
              </button>

              <button
                onClick={() => setShowPayment(false)}
                className="w-full text-gray-600 py-2 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white mt-16 py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>&copy; 2026 ReSchool. Built for Nigerian Schools.</p>
        </div>
      </footer>
    </div>
  );
}
