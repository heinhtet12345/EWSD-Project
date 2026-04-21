import { Link } from "react-router-dom";
import { Compass, Home, SearchX } from "lucide-react";
import useThemeMode from "../../hooks/useThemeMode";

export default function NotFound() {

  const isDarkMode = useThemeMode();

  // Getting the URL to route back to Dashboard All Idea Tab (According to Roles)
  function getIdeaRedirectPath() {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return "/staff/all-ideas";

      const parsed = JSON.parse(raw);

      // For Excetional cases (Default to Staff)
      const role = (parsed.role || "staff").toLowerCase();

      let path = "/staff/all-ideas";

      if (role === "admin") {
        path = "/admin/all-ideas";
      } else if (role === "qa_manager") {
        path = "/qa_manager/all-ideas";
      } else if (role === "qa_coordinator") {
        path = "/qa_coordinator/all-ideas";
      }

      return path;
    } catch {
      return "/staff/all-ideas";
    }
}

const browseIdeasRedirectPath = getIdeaRedirectPath();


  return (
    <section
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 ${
        isDarkMode
          ? "bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_24%)]"
            : "bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.1),transparent_24%)]"
        }`}
      />

      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-[2rem] border p-8 text-center shadow-xl sm:p-10 ${
          isDarkMode
            ? "border-slate-800 bg-slate-950/82 text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.55)]"
            : "border-slate-200 bg-white/92 text-slate-900 shadow-[0_20px_60px_rgba(148,163,184,0.22)]"
        }`}
      >
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${
            isDarkMode ? "bg-sky-500/10 text-sky-300" : "bg-sky-100 text-sky-700"
          }`}
        >
          <SearchX className="h-10 w-10" />
        </div>

        <p
          className={`mt-6 text-xs font-semibold uppercase tracking-[0.32em] ${
            isDarkMode ? "text-sky-300" : "text-sky-700"
          }`}
        >
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
        <p className={`mx-auto mt-4 max-w-xl text-sm leading-7 sm:text-base ${
          isDarkMode ? "text-slate-300" : "text-slate-600"
        }`}>
          The page you tried to open does not exist!
          Please avoid using Manual URL entry to access the pages. Instead use the tab links from Dashboard's Sidebar.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
              isDarkMode
                ? "bg-sky-500 text-slate-950 hover:bg-sky-400 focus:ring-sky-300"
                : "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-300"
            }`}
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <Link
            to={browseIdeasRedirectPath}
            className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
              isDarkMode
                ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800 focus:ring-slate-500"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300"
            }`}
          >
            <Compass className="h-4 w-4" />
            Browse Ideas
          </Link>
        </div>

        <div
          className={`mt-8 rounded-3xl border px-4 py-4 text-sm ${
            isDarkMode
              ? "border-slate-800 bg-slate-900/80 text-slate-400"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          Tip: check the URL for a typo, or use the sidebar to return to a valid section.
        </div>
      </div>
    </section>
  );
}
