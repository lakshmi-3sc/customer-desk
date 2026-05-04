"use client";

import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import { ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces, switchWorkspace, loading } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (loading || !currentWorkspace || workspaces.length <= 1) {
    return null;
  }

  return (
    <div className="px-2 pb-2 border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentWorkspace.logoUrl ? (
            <img
              src={currentWorkspace.logoUrl}
              alt={currentWorkspace.name}
              className="w-5 h-5 rounded object-cover flex-shrink-0"
            />
          ) : (
            <Building2 className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="truncate text-xs">{currentWorkspace.name}</span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 flex-shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-1 bg-white/5 rounded-md p-1">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => {
                switchWorkspace(workspace.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                currentWorkspace.id === workspace.id
                  ? "bg-white/20 text-white"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              {workspace.logoUrl ? (
                <img
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  className="w-4 h-4 rounded object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              <span className="truncate text-xs">{workspace.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
