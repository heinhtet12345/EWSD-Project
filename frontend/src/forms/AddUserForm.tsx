import axios from "axios";
import { useMemo, useState, type FormEvent } from "react";

type AddUserPayload = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role_name: string;
  department_name: string;
};

type AddUserFormProps = {
  roles: string[];
  departments: string[];
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: AddUserPayload) => Promise<void>;
};

const normalizeRole = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");

export default function AddUserForm({ roles, departments, isSubmitting = false, onCancel, onSubmit }: AddUserFormProps) {
  const [form, setForm] = useState<AddUserPayload>({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    role_name: "",
    department_name: "",
  });
  const [error, setError] = useState("");
  const availableRoles = useMemo(() => roles.filter((role) => normalizeRole(role) !== "admin"), [roles]);

  const requiresDepartment = useMemo(() => {
    const role = normalizeRole(form.role_name);
    return role === "qa_coordinator" || role === "staff";
  }, [form.role_name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.username.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email cannot be empty.");
      return;
    }
    if (!form.role_name.trim()) {
      setError("Role is required.");
      return;
    }
    if (normalizeRole(form.role_name) === "admin") {
      setError("Admin accounts cannot be created from this form.");
      return;
    }
    if (requiresDepartment && !form.department_name.trim()) {
      setError("Department is required for QA Coordinator and Staff.");
      return;
    }

    try {
      await onSubmit({
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role_name: form.role_name.trim(),
        department_name: form.department_name.trim(),
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to create user.");
        return;
      }
      setError("Failed to create user.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Add User</h2>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</label>
          <input
            value={form.first_name}
            onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
            placeholder="First name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</label>
          <input
            value={form.last_name}
            onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
            placeholder="Last name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username *</label>
          <input
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
            placeholder="Unique login username"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role *</label>
          <select
            value={form.role_name}
            onChange={(event) => {
              const selectedRole = event.target.value;
              const requiresDept = ["qa_coordinator", "staff"].includes(normalizeRole(selectedRole));
              setForm((prev) => ({
                ...prev,
                role_name: selectedRole,
                department_name: requiresDept ? prev.department_name : "",
              }));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
          >
            <option value="">Select role</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Department {requiresDepartment ? "*" : "(Optional)"}
          </label>
          <select
            value={form.department_name}
            onChange={(event) => setForm((prev) => ({ ...prev, department_name: event.target.value }))}
            disabled={!requiresDepartment}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
