"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ParentDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/api/auth/login");
        return;
      }

      try {
        // Decode JWT token to check role
        const payload = JSON.parse(atob(token.split(".")[1]));
        
        if (payload.role !== "PARENT") {
          router.push("/api/auth/login");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Invalid token:", error);
        router.push("/api/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Parent Dashboard</h1>
      <p className="mt-2">
        Monitor your child's academic progress in real time.
      </p>
      <p className="mt-4 text-green-700">
        AI guidance now available for subject & career decisions.
      </p>
    </div>
  );
}
