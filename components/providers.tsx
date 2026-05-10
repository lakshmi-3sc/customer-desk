"use client";

import { SessionProvider } from "next-auth/react";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WorkspaceProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          expand={true}
          closeButton
        />
      </WorkspaceProvider>
    </SessionProvider>
  );
}
