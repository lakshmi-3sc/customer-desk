"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ClientBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  industry: string | null;
}

interface WorkspaceContextType {
  currentWorkspace: ClientBranding | null;
  workspaces: ClientBranding[];
  switchWorkspace: (clientId: string) => void;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [currentWorkspace, setCurrentWorkspace] = useState<ClientBranding | null>(null);
  const [workspaces, setWorkspaces] = useState<ClientBranding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setCurrentWorkspace(null);
      setWorkspaces([]);
      setLoading(false);
      localStorage.removeItem("current-workspace");
      return;
    }

    const loadWorkspaces = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          const availableWorkspaces = data.workspaces || [];
          setWorkspaces(availableWorkspaces);

          const saved = localStorage.getItem("current-workspace");
          const workspace =
            availableWorkspaces.find((w: ClientBranding) => w.id === saved) ??
            availableWorkspaces[0];

          if (workspace) {
            setCurrentWorkspace(workspace);
            localStorage.setItem("current-workspace", workspace.id);
          } else {
            setCurrentWorkspace(null);
            localStorage.removeItem("current-workspace");
          }
        }
      } catch (error) {
        console.error("Failed to load workspaces:", error);
        setCurrentWorkspace(null);
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [status]);

  const switchWorkspace = (clientId: string) => {
    const workspace = workspaces.find((w) => w.id === clientId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem("current-workspace", clientId);
      window.location.href = "/dashboard";
    }
  };

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, switchWorkspace, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
