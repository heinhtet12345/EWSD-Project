import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Camera, Edit3, Eye, EyeOff, KeyRound, Laptop, Mail, MapPin, Phone, Save, Shield, Smartphone, Trash2, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useThemeMode from "../hooks/useThemeMode";

type ProfileData = {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  role_name: string;
  department_name: string;
  dob: string | null;
  address_line_1: string;
  township: string;
  city: string;
  postal_code: string;
  phone: string;
  hire_date: string | null;
  active_status: boolean;
  profile_image: string | null;
};

type LoginSession = {
  session_id: string;
  device_type: string;
  browser: string;
  operating_system: string;
  ip_address: string | null;
  created_at: string;
  last_used_at: string;
  revoked_at: string | null;
  is_active: boolean;
  is_current: boolean;
};

const PROFILE_ENDPOINTS = ["/api/profile/me/", "/api/profile/me"] as const;

const getAuthConfig = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { token?: string };
    if (!parsed?.token) return undefined;
    return { headers: { Authorization: `Bearer ${parsed.token}` } };
  } catch {
    return undefined;
  }
};

const normalizeField = (value: string | null | undefined) => value ?? "";

const isValidProfile = (value: unknown): value is ProfileData => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.username === "string";
};

const getProfile = async () => {
  for (const endpoint of PROFILE_ENDPOINTS) {
    try {
      const response = await axios.get<ProfileData>(endpoint, getAuthConfig());
      if (isValidProfile(response.data)) {
        return response;
      }
      throw new Error("Invalid profile response.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Profile endpoint not found.");
};

const updateProfile = async (payload: FormData) => {
  for (const endpoint of PROFILE_ENDPOINTS) {
    try {
      const response = await axios.patch<ProfileData>(endpoint, payload, {
        ...getAuthConfig(),
        headers: {
          ...(getAuthConfig()?.headers || {}),
          "Content-Type": "multipart/form-data",
        },
      });
      if (isValidProfile(response.data)) {
        return response;
      }
      throw new Error("Invalid profile response.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Profile endpoint not found.");
};

export default function UserProfilePage() {
  const navigate = useNavigate();
  const isDarkMode = useThemeMode();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    dob: "",
    phone: "",
    address_line_1: "",
    township: "",
    city: "",
    postal_code: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [sessionActionTarget, setSessionActionTarget] = useState<"all" | string | null>(null);
  const [isManagingSessions, setIsManagingSessions] = useState(false);

  const resolvedPreviewImage = useMemo(() => previewImage || profile?.profile_image || null, [previewImage, profile]);
  const displayName = useMemo(() => {
    if (!profile) return "";
    const fullName = `${normalizeField(profile.first_name)} ${normalizeField(profile.last_name)}`.trim();
    return fullName || normalizeField(profile.name) || profile.username;
  }, [profile]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (!passwordSuccess) return;
    const timeoutId = window.setTimeout(() => setPasswordSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [passwordSuccess]);

  useEffect(() => {
    if (!passwordError) return;
    const timeoutId = window.setTimeout(() => setPasswordError(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [passwordError]);

  useEffect(() => {
    if (!sessionError) return;
    const timeoutId = window.setTimeout(() => setSessionError(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [sessionError]);

  useEffect(() => {
    if (!sessionSuccess) return;
    const timeoutId = window.setTimeout(() => setSessionSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [sessionSuccess]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getProfile();
        const data = response.data;
        setProfile(data);
        setForm({
          first_name: normalizeField(data.first_name),
          last_name: normalizeField(data.last_name),
          email: normalizeField(data.email),
          dob: normalizeField(data.dob),
          phone: normalizeField(data.phone),
          address_line_1: normalizeField(data.address_line_1),
          township: normalizeField(data.township),
          city: normalizeField(data.city),
          postal_code: normalizeField(data.postal_code),
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(
            (err.response?.data as { message?: string; detail?: string })?.message ||
              (err.response?.data as { detail?: string })?.detail ||
              err.response?.statusText ||
              "Failed to load profile.",
          );
        } else if (err instanceof Error && err.message === "Profile endpoint not found.") {
          setError("Profile API endpoint not found. Restart backend server and try again.");
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getCurrentSessionId = () => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { session_id?: string };
      return String(parsed?.session_id || "");
    } catch {
      return "";
    }
  };

  const clearAuthAndRedirect = () => {
    try {
      localStorage.removeItem("authUser");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/", { replace: true });
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    setSessionError("");
    try {
      const response = await axios.get<{ results?: LoginSession[] }>("/api/profile/sessions/", {
        ...getAuthConfig(),
        params: { current_session_id: getCurrentSessionId() || undefined },
      });
      setSessions(Array.isArray(response.data?.results) ? response.data.results : []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setSessionError(data?.message || data?.detail || "Failed to load sessions.");
      } else {
        setSessionError("Failed to load sessions.");
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    void fetchSessions();
  }, []);

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedImage(file);
    if (!file) {
      setPreviewImage(null);
      return;
    }
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    setIsEditing(false);
    setSelectedImage(null);
    setPreviewImage(null);
    setSuccess("");
    setError("");
    setForm({
      first_name: normalizeField(profile.first_name),
      last_name: normalizeField(profile.last_name),
      email: normalizeField(profile.email),
      dob: normalizeField(profile.dob),
      phone: normalizeField(profile.phone),
      address_line_1: normalizeField(profile.address_line_1),
      township: normalizeField(profile.township),
      city: normalizeField(profile.city),
      postal_code: normalizeField(profile.postal_code),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      payload.append("first_name", form.first_name.trim());
      payload.append("last_name", form.last_name.trim());
      payload.append("email", form.email.trim());
      payload.append("dob", form.dob || "");
      payload.append("phone", form.phone.trim());
      payload.append("address_line_1", form.address_line_1.trim());
      payload.append("township", form.township.trim());
      payload.append("city", form.city.trim());
      payload.append("postal_code", form.postal_code.trim());
      if (selectedImage) {
        payload.append("profile_image", selectedImage);
      }

      const response = await updateProfile(payload);

      const updated = response.data;
      setProfile(updated);
      setForm({
        first_name: normalizeField(updated.first_name),
        last_name: normalizeField(updated.last_name),
        email: normalizeField(updated.email),
        dob: normalizeField(updated.dob),
        phone: normalizeField(updated.phone),
        address_line_1: normalizeField(updated.address_line_1),
        township: normalizeField(updated.township),
        city: normalizeField(updated.city),
        postal_code: normalizeField(updated.postal_code),
      });
      setIsEditing(false);
      setSelectedImage(null);
      setPreviewImage(null);
      setSuccess("Profile updated successfully.");

      const updatedDisplayName = `${normalizeField(updated.first_name)} ${normalizeField(updated.last_name)}`.trim() || updated.username;
      try {
        const raw = localStorage.getItem("authUser");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem(
            "authUser",
            JSON.stringify({
              ...parsed,
              first_name: updated.first_name,
              last_name: updated.last_name,
              name: updatedDisplayName,
              username: updated.username,
              profile_image: updated.profile_image,
            }),
          );
          window.dispatchEvent(new Event("auth-changed"));
        }
      } catch {
        // Ignore localStorage update failure.
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, unknown> | undefined;
        const firstError = data ? Object.values(data)[0] : undefined;
        const message =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.detail === "string" && data.detail) ||
          (Array.isArray(firstError) && typeof firstError[0] === "string" ? firstError[0] : undefined) ||
          err.response?.statusText ||
          "Failed to update profile.";
        setError(message);
      } else if (err instanceof Error && err.message === "Profile endpoint not found.") {
        setError("Profile API endpoint not found. Restart backend server and try again.");
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill old password, new password, and confirm password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.includes(" ")) {
      setPasswordError("Password must not contain spaces.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 12) {
      setPasswordError("Password length must be between 8 and 12 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must include at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError("Password must include at least one lowercase letter.");
      return;
    }

    if (!/\d/.test(newPassword)) {
      setPasswordError("Password must include at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError("Password must include at least one special character.");
      return;
    }

    const knownBad = ["password", "123456", "12345678", "qwerty", "abc123", "password123"];
    if (knownBad.includes(newPassword.toLowerCase())) {
      setPasswordError("This password is too common. Please choose a stronger one.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await axios.post(
        "/api/profile/change-password/",
        {
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        getAuthConfig(),
      );

      setPasswordSuccess((response.data as { message?: string })?.message || "Password changed successfully.");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setPasswordError(data?.message || data?.detail || err.response?.statusText || "Failed to change password.");
      } else {
        setPasswordError("Failed to change password.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSessionAction = async (target: "all" | string) => {
    if (!sessionPassword.trim()) {
      setSessionError("Please enter your password to manage sessions.");
      return;
    }

    setIsManagingSessions(true);
    setSessionError("");
    setSessionSuccess("");
    try {
      const currentSessionId = getCurrentSessionId();
      const response =
        target === "all"
          ? await axios.post(
              "/api/profile/sessions/revoke-all/",
              {
                password: sessionPassword,
                revoke_all: true,
                current_session_id: currentSessionId || undefined,
              },
              getAuthConfig(),
            )
          : await axios.post(
              `/api/profile/sessions/${target}/revoke/`,
              {
                password: sessionPassword,
                current_session_id: currentSessionId || undefined,
              },
              getAuthConfig(),
            );

      const data = response.data as {
        message?: string;
        current_session_revoked?: boolean;
      };

      setSessionSuccess(data.message || "Session updated successfully.");
      setSessionPassword("");
      setSessionActionTarget(null);

      if (data.current_session_revoked) {
        clearAuthAndRedirect();
        return;
      }

      await fetchSessions();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setSessionError(data?.message || data?.detail || "Failed to update sessions.");
      } else {
        setSessionError("Failed to update sessions.");
      }
    } finally {
      setIsManagingSessions(false);
    }
  };

  const formatSessionTime = (value: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const getSessionIcon = (deviceType: string) => {
    const normalized = deviceType.toLowerCase();
    if (normalized.includes("mobile") || normalized.includes("tablet")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500">Review and update your account details.</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading profile...</p>
      ) : profile ? (
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              {resolvedPreviewImage ? (
                <img src={resolvedPreviewImage} alt={displayName || profile.username} className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-4 ring-slate-50">
                  <User className="h-10 w-10" />
                </div>
              )}

              <h2 className="mt-4 text-lg font-semibold text-slate-900">{displayName || profile.username}</h2>
              <p className="text-sm text-slate-500">{profile.role_name || "No role"}</p>
              <p className="text-xs text-slate-400">
                @{profile.username} • {profile.department_name || "No department"}
              </p>

              {isEditing && (
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Camera className="h-4 w-4" />
                  Change photo
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date of Birth</label>
                <input
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address Line 1</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="address_line_1"
                    value={form.address_line_1}
                    onChange={handleFieldChange}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Township</label>
                <input
                  name="township"
                  value={form.township}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Postal Code</label>
                <input
                  name="postal_code"
                  value={form.postal_code}
                  onChange={handleFieldChange}
                  disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleFieldChange}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Shield className="h-4 w-4" />
                  {profile.role_name || "No role"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{profile.department_name || "No department"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hire Date</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{profile.hire_date || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {[
                    profile.address_line_1,
                    profile.township,
                    profile.city,
                    profile.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Laptop className="h-5 w-5" />
                  Session Management
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review devices signed in with this account and remove a session or all sessions when needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchSessions()}
                disabled={isLoadingSessions}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingSessions ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {sessionError && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {sessionError}
              </div>
            )}
            {sessionSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {sessionSuccess}
              </div>
            )}

            <div className="space-y-3">
              {isLoadingSessions ? (
                <p className="text-sm text-slate-500">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No active sessions found.
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            {getSessionIcon(session.device_type)}
                            {[session.browser || "Unknown Browser", session.operating_system || "Unknown OS"]
                              .filter(Boolean)
                              .join(" on ")}
                          </span>
                          {session.is_current && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              Current session
                            </span>
                          )}
                          {!session.is_active && (
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="grid gap-1 text-sm text-slate-600">
                          <p>Device type: {session.device_type || "Unknown"}</p>
                          <p>IP address: {session.ip_address || "Unavailable"}</p>
                          <p>Signed in: {formatSessionTime(session.created_at)}</p>
                          <p>Last used: {formatSessionTime(session.last_used_at)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!session.is_active || isManagingSessions}
                        onClick={() => {
                          setSessionActionTarget(session.session_id);
                          setSessionPassword("");
                          setSessionSuccess("");
                          setSessionError("");
                        }}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isDarkMode
                            ? "border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                            : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove session
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">
                  Removing all sessions will also sign out this browser if it is included.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSessionActionTarget("all");
                    setSessionPassword("");
                    setSessionSuccess("");
                    setSessionError("");
                  }}
                  disabled={isManagingSessions}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDarkMode
                      ? "border border-rose-400/30 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Remove All Sessions
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleChangePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <KeyRound className="h-5 w-5" />
                Change Password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use 8-12 characters with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character. Spaces are not allowed.
              </p>
            </div>

            {passwordError && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {passwordSuccess}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Old Password</label>
                <div className="relative">
                  <input
                    name="oldPassword"
                    type={showOldPassword ? "text" : "password"}
                    value={passwordForm.oldPassword}
                    onChange={handlePasswordFieldChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</label>
                <div className="relative">
                  <input
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm New Password</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Profile not found.
        </div>
      )}
      {sessionActionTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {sessionActionTarget === "all" ? "Remove All Sessions" : "Remove Session"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {sessionActionTarget === "all"
                  ? "Enter your password to remove all active sessions for this account."
                  : "Enter your password to remove this session."}
              </p>
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={sessionPassword}
                  onChange={(event) => setSessionPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSessionActionTarget(null);
                    setSessionPassword("");
                  }}
                  disabled={isManagingSessions}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSessionAction(sessionActionTarget)}
                  disabled={isManagingSessions}
                  className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                    sessionActionTarget === "all"
                      ? isDarkMode
                        ? "border border-rose-400/30 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-rose-600 text-white hover:bg-rose-700"
                  }`}
                >
                  {isManagingSessions
                    ? sessionActionTarget === "all"
                      ? "Removing..."
                      : "Confirming..."
                    : sessionActionTarget === "all"
                      ? "Confirm Remove All"
                      : "Confirm Remove"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
