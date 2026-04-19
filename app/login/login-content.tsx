"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AlertCircle, Loader2, Ticket, Shield, Zap, BarChart3 } from "lucide-react";

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for error parameter in URL
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "CredentialsSignin") {
        setError("Invalid email or password");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    // Get role from session
    console.log("Login successful, fetching session...");
    const session = await fetch("/api/auth/session").then((r) => r.json());
    console.log("Session data:", session);

    // Redirect to unified dashboard - role-based view will be handled there
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#F4F5F7] dark:bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0747A6] dark:bg-slate-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 right-10 w-80 h-80 rounded-full bg-white/5" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-sm font-black text-[#0052CC]">3S</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">3SC Connect</p>
              <p className="text-blue-200/70 text-xs leading-tight">Customer Portal</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Support that<br />moves with you
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed">
              Track issues, collaborate with your team, and resolve tickets faster
              — all in one place.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: Ticket, label: "Issue Tracking", desc: "Create and monitor support tickets" },
              { icon: Zap, label: "AI Insights", desc: "Automated suggestions and escalations" },
              { icon: BarChart3, label: "Real-time KPIs", desc: "Live performance metrics dashboard" },
              { icon: Shield, label: "Role-based Access", desc: "Separate views for clients & team" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{label}</p>
                  <p className="text-blue-200/70 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/50 text-xs">
          © 2026 3SC Connect. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Theme switcher */}
        <div className="absolute top-6 right-6">
          <ThemeSwitcher />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-[#0052CC] rounded-xl flex items-center justify-center">
              <span className="text-xs font-black text-white">3S</span>
            </div>
            <span className="text-slate-900 dark:text-white font-bold text-lg">3SC Connect</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Sign in to your portal account
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 p-3 mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-[#0052CC] focus-visible:border-[#0052CC]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                  Password
                </Label>
                <a href="#" className="text-xs text-[#0052CC] dark:text-blue-400 hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-[#0052CC] focus-visible:border-[#0052CC]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold mt-2 rounded-md shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-8">
            Having trouble? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
