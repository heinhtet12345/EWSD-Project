import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import axios from "axios";
import { Camera, Edit3, Eye, EyeOff, KeyRound, Mail, MapPin, Phone, Save, Shield, User, X } from "lucide-react";

type ProfileData = {
  user_id: number;
  username: string;
  name: string;
  email: string;
  role_name: string;
  department_name: string;
  dob: string | null;
  address: string;
  phone: string;
  hire_date: string | null;
  active_status: boolean;
  profile_image: string | null;
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    dob: "",
    phone: "",
    address: "",
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

  const resolvedPreviewImage = useMemo(() => previewImage || profile?.profile_image || null, [previewImage, profile]);

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
    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getProfile();
        const data = response.data;
        setProfile(data);
        setForm({
          name: normalizeField(data.name),
          email: normalizeField(data.email),
          dob: normalizeField(data.dob),
          phone: normalizeField(data.phone),
          address: normalizeField(data.address),
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
      name: normalizeField(profile.name),
      email: normalizeField(profile.email),
      dob: normalizeField(profile.dob),
      phone: normalizeField(profile.phone),
      address: normalizeField(profile.address),
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
      payload.append("name", form.name.trim());
      payload.append("email", form.email.trim());
      payload.append("dob", form.dob || "");
      payload.append("phone", form.phone.trim());
      payload.append("address", form.address.trim());
      if (selectedImage) {
        payload.append("profile_image", selectedImage);
      }

      const response = await updateProfile(payload);

      const updated = response.data;
      setProfile(updated);
      setForm({
        name: normalizeField(updated.name),
        email: normalizeField(updated.email),
        dob: normalizeField(updated.dob),
        phone: normalizeField(updated.phone),
        address: normalizeField(updated.address),
      });
      setIsEditing(false);
      setSelectedImage(null);
      setPreviewImage(null);
      setSuccess("Profile updated successfully.");

      try {
        const raw = localStorage.getItem("authUser");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem(
            "authUser",
            JSON.stringify({
              ...parsed,
              name: updated.name,
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

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must include at least one uppercase letter.");
      return;
    }

    if (!/\d/.test(newPassword)) {
      setPasswordError("Password must include at least one number.");
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
            <div className="flex flex-col items-center text-center ">
              {resolvedPreviewImage ? (
                <img src={resolvedPreviewImage} alt={profile.name || profile.username} className="h-28 w-28 rounded-full object-cover ring-4 ring-slate-100" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-4 ring-slate-50">
                  <User className="h-10 w-10" />
                </div>
              )}

              <h2 className="mt-4 text-lg font-semibold text-slate-900">{profile.name || profile.username}</h2>
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                <input
                  name="name"
                  value={form.name}
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

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    name="address"
                    rows={3}
                    value={form.address}
                    onChange={handleFieldChange}
                    disabled={!isEditing}
                    className="w-full resize-none rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 disabled:bg-slate-50"
                    style={{ resize: "none" }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3">
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

          <form onSubmit={handleChangePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                <KeyRound className="h-5 w-5" />
                Reset Password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a strong password. Minimum 8 characters, with at least 1 uppercase letter and 1 number.
                14 to 15 characters is strongly recommended.
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
    </section>
  );
}
