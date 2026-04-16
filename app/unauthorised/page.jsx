import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
      <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
      <p className="text-gray-400 mb-8">
        You do not have permission to view this page.
      </p>
      <Link
        href="/login"
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Login
      </Link>
    </div>
  );
}
