import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, X } from "lucide-react";
import loginBackground from "../assets/login_background.jpg";

type Role = "admin" | "qa_coordinator" | "qa_manager" | "staff";

type LoginFormState = {
  username: string;
  password: string;
};

type AuthResponse = {
  user_id?: string | number;
  id?: string | number;
  username?: string;
  profile_image?: string;
  role?: string;
  role_name?: string;
  department?: string;
  message?: string;
  refresh?: string;
  active_status?: boolean;
  first_login?: boolean;
  last_login_at?: string | null;
};

const ROLE_TO_PATH: Record<Role, string> = {
  admin: "/admin",
  qa_coordinator: "/qa_coordinator",
  qa_manager: "/qa_manager",
  staff: "/staff",
};

const ROLE_ALIAS: Record<string, Role> = {
  admin: "admin",
  qa_manager: "qa_manager",
  "qa manager": "qa_manager",
  qa_coordinator: "qa_coordinator",
  "qa coordinator": "qa_coordinator",
  staff: "staff",
};

const API_PATH = "/api/login/";

function normalizeRole(role?: string | null): Role {
  if (!role) return "staff";
  const normalized = String(role).trim().toLowerCase();
  return ROLE_ALIAS[normalized] ?? "staff";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormState>({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const storedRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { role?: string };
      return normalizeRole(parsed?.role);
    } catch {
      return null;
    }
  }, []);

  const canSubmit = useMemo(() => {
    return form.username.trim().length > 0 && form.password.length > 0;
  }, [form]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post<AuthResponse & { access: string; refresh: string }>(API_PATH, {
        username: form.username.trim(),
        password: form.password,
      });

      const payload = response.data;
      const user = {
        id: payload?.user_id ?? payload?.id,
        username: payload?.username,
        profile_image: payload?.profile_image,
        role: normalizeRole(payload?.role ?? payload?.role_name),
        department: payload?.department,
        active_status: payload?.active_status ?? true,
        token: payload?.access,
        refresh: payload?.refresh,
      };

      localStorage.setItem("authUser", JSON.stringify(user));
      sessionStorage.setItem(
        "loginNotice",
        JSON.stringify({
          username: user.username,
          firstLogin: Boolean(payload?.first_login),
          lastLoginAt: payload?.last_login_at ?? null,
        }),
      );
      navigate(ROLE_TO_PATH[user.role], { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string; detail?: string; non_field_errors?: string[] }
          | Record<string, string[] | string>
          | undefined;

        const firstValue = data ? Object.values(data)[0] : undefined;
        const derivedMessage = Array.isArray(firstValue) ? firstValue[0] : firstValue;
        const message =
          (typeof data?.message === "string" ? data.message : undefined) ||
          (typeof data?.detail === "string" ? data.detail : undefined) ||
          (typeof data?.non_field_errors?.[0] === "string" ? data.non_field_errors[0] : undefined) ||
          (typeof derivedMessage === "string" ? derivedMessage : undefined) ||
          "Login failed. Please try again.";
        setError(message);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotUsername.trim()) {
      setForgotError("Please enter your username.");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const response = await axios.post<{ message?: string }>("/api/password-reset/request/", {
        username: forgotUsername.trim(),
      });
      setForgotSuccess(response.data?.message || "Request sent to admin.");
      setForgotUsername("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setForgotError(data?.message || data?.detail || "Failed to send request.");
      } else {
        setForgotError("Failed to send request.");
      }
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  if (storedRole) {
    return <Navigate to={ROLE_TO_PATH[storedRole]} replace />;
  }

  return (
    <div className="relative min-h-screen w-screen overflow-hidden text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBackground})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-xl shadow-black/10 backdrop-blur">
          <div className="space-y-2">
            <p className="text-center text-sm font-bold text-black">Quality System</p>
            <p className="text-center text-lg font-extrabold tracking-wide text-black">Welcome Back!</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-extrabold tracking-wider text-black/80" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-sm text-black focus:border-violet-700 focus:outline-none"
                  placeholder="e.g. Si Thu Aung"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-extrabold tracking-wider text-black/80" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-12 text-sm text-black focus:border-violet-700 focus:outline-none"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(true);
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="text-sm font-semibold text-gray-500 transition hover:text-violet-900"
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

      {isForgotModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Forgot Password</h2>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Enter your username. If valid, the system will notify admin to reset your password.
            </p>
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <input
                type="text"
                value={forgotUsername}
                onChange={(event) => setForgotUsername(event.target.value)}
                placeholder="Username"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-600"
              />
              {forgotError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {forgotSuccess}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
                >
                  {isForgotSubmitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
