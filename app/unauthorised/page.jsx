import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F5F7] dark:bg-slate-950">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-2.99L13.73 4a2 2 0 00-3.46 0L3.27 16A2 2 0 005.07 19z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Access Denied
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          You don&apos;t have permission to view this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center px-5 py-2.5 bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm font-semibold rounded-md transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
