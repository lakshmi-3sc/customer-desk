"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import InternalDashboard from "./internal/page";
import ClientDashboard from "./client/page";
import UserDashboard from "./user/page";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  const userRole = session?.user?.role as string | undefined;
  const is3SCTeam = userRole && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  if (userRole === "THREESC_ADMIN") {
    router.replace("/admin");
    return null;
  }
  if (userRole === "THREESC_LEAD") {
    router.replace("/dashboard/lead");
    return null;
  }
  if (userRole === "THREESC_AGENT") {
    router.replace("/dashboard/agent");
    return null;
  }
  if (is3SCTeam) return <InternalDashboard />;
  if (userRole === "CLIENT_USER") return <UserDashboard />;
  return <ClientDashboard />;
}
