import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-600/20 text-amber-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Password Reset</h2>
        <p className="text-sm text-zinc-400">
          To maintain strict enterprise security, password resets must be issued by your school or
          platform administrator.
        </p>
        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Return to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
