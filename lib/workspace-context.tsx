"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [currentWorkspace, setCurrentWorkspace] = useState<ClientBranding | null>(null);
  const [workspaces, setWorkspaces] = useState<ClientBranding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.workspaces || []);

          const saved = localStorage.getItem("current-workspace");
          const workspace = saved
            ? data.workspaces.find((w: ClientBranding) => w.id === saved)
            : data.workspaces[0];

          if (workspace) {
            setCurrentWorkspace(workspace);
            localStorage.setItem("current-workspace", workspace.id);
          }
        }
      } catch (error) {
        console.error("Failed to load workspaces:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

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
