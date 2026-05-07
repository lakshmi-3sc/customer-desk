"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Critical error</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              The application encountered a critical error. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0052CC] rounded-lg hover:bg-[#0043A8] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
