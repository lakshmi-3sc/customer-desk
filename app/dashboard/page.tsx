"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import InternalDashboard from "./internal/page";
import ClientDashboard from "./client/page";

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

  // Check user role to determine which dashboard to show
  const userRole = session?.user?.role as string | undefined;

  // 3SC team roles: THREESC_ADMIN, THREESC_LEAD, THREESC_AGENT
  // Client roles: CLIENT_ADMIN, CLIENT_USER
  const is3SCTeam =
    userRole &&
    ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(userRole);

  if (is3SCTeam) {
    return <InternalDashboard />;
  } else {
    return <ClientDashboard />;
  }
}
