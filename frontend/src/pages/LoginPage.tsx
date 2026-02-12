import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import loginBackground from "../assets/login_background.jpg";

type Role = "admin" | "qa-coordinator" | "qa-manager" | "staff";

type LoginFormState = {
  username: string;
  password: string;
};

type AuthResponse = {
  user_id?: string;
  username?: string;
  profile_image?: string;
  role?: string;
  message?: string;
};

const ROLE_TO_PATH: Record<Role, string> = {
  admin: "/admin",
  "qa-coordinator": "/qa-coordinator",
  "qa-manager": "/qa-manager",
  staff: "/staff",
};

const ROLE_ALIAS: Record<string, Role> = {
  admin: "admin",
  "qa manager": "qa-manager",
  "qa coordinator": "qa-coordinator",
  staff: "staff",
};

const API_PATH = "api/login/";

function normalizeRole(role?: string | null): Role {
  if (!role) {
    return "staff";
  }

  const normalized = String(role).trim().toLowerCase();
  return ROLE_ALIAS[normalized] ?? "staff";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormState>({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return form.username.trim().length > 0 && form.password.length > 0;
  }, [form]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post<AuthResponse>(API_PATH, {
        username: form.username.trim(),
        password: form.password,
      });

      const payload = response.data;

      const user = {
        id: payload?.user_id,
        username: payload?.username,
        profileimg: payload?.profile_image,
        role: normalizeRole(payload?.role),
      };

      localStorage.setItem("authUser", JSON.stringify(user));
      navigate(ROLE_TO_PATH[user.role], { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string; detail?: string; non_field_errors?: string[] }
          | Record<string, string[] | string>
          | undefined;

        const message =
          data?.message ||
          data?.detail ||
          data?.non_field_errors?.[0] ||
          (data ? Object.values(data)[0]?.[0] : undefined) ||
          "Login failed. Please try again.";

        setError(message);
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white">
      <img
        src={loginBackground}
        alt="Login Background"
        className="absolute inset-0 h-full w-full object-cover p-5"
      />
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-xl shadow-black/10 backdrop-blur">
          <div className="space-y-2">
            <p className="text-sm text-center text-black font-bold">Quality System</p>
            <p className="text-lg font-extrabold text-center tracking-wide text-black/100">
              Welcome Back!
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-extrabold tracking-wider text-black/80" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 10a6 6 0 0 1 12 0"
                  />
                </svg>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-black placeholder:text-gray/30 focus:border-violet-700 focus:outline-none"
                  placeholder="e.g. Si Thu Aung"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-extrabold tracking-wider text-black/80" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V8a4.5 4.5 0 1 0-9 0v2.5m11 0H5.5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5Z"
                  />
                </svg>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-black placeholder:text-gray/30 focus:border-violet-700 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-semibold text-opacity-60 text-gray-500 transition hover:text-violet-900"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm tracking-wide text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400"
            >
              {isSubmitting ? "Logging In..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
