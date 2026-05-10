import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

export function showSuccessToast(message: string, description?: string) {
  return toast.custom((t) => (
    <div className="w-full max-w-md bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">{message}</p>
          {description && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          ✕
        </button>
      </div>
    </div>
  ));
}

export function showErrorToast(message: string, description?: string) {
  return toast.custom((t) => (
    <div className="w-full max-w-md bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-900 dark:text-red-100">{message}</p>
          {description && (
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          ✕
        </button>
      </div>
    </div>
  ));
}

export function showInfoToast(message: string, description?: string) {
  return toast.custom((t) => (
    <div className="w-full max-w-md bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-blue-900 dark:text-blue-100">{message}</p>
          {description && (
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ✕
        </button>
      </div>
    </div>
  ));
}

export function showWarningToast(message: string, description?: string) {
  return toast.custom((t) => (
    <div className="w-full max-w-md bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900 dark:text-amber-100">{message}</p>
          {description && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{description}</p>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          ✕
        </button>
      </div>
    </div>
  ));
}
