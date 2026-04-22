import axios from "axios";

type StoredAuthUser = {
  token?: string;
  refresh?: string;
  [key: string]: unknown;
};

type RetriableAxiosConfig = {
  _retry?: boolean;
  url?: string;
  headers?: Record<string, string>;
};

let refreshRequest: Promise<string | null> | null = null;

function getStoredAuthUser(): StoredAuthUser | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

function persistAccessToken(nextAccessToken: string) {
  try {
    const current = getStoredAuthUser();
    if (!current) return;
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        ...current,
        token: nextAccessToken,
      }),
    );
    window.dispatchEvent(new Event("auth-changed"));
  } catch {
    // ignore storage update failures
  }
}

function clearAuthAndRedirect() {
  try {
    localStorage.removeItem("authUser");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("auth-changed"));
  window.location.replace("/");
}

async function refreshAccessToken(): Promise<string | null> {
  const storedUser = getStoredAuthUser();
  const refreshToken = storedUser?.refresh;
  if (!refreshToken) {
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = axios
      .post<{ access?: string }>("/api/token/refresh/", {
        refresh: refreshToken,
      })
      .then((response) => {
        const nextAccessToken = response.data?.access;
        if (!nextAccessToken) {
          return null;
        }
        persistAccessToken(nextAccessToken);
        return nextAccessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export function setupAxiosAuthInterceptors() {
  axios.interceptors.request.use(
    (config) => {
      try {
        const storedUser = getStoredAuthUser();
        const token = storedUser?.token;
        if (token) {
          const nextHeaders = {
            ...((config.headers ?? {}) as Record<string, string>),
            Authorization: `Bearer ${token}`,
          };
          config.headers = nextHeaders as typeof config.headers;
        }
      } catch {
        // ignore invalid localStorage contents
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalConfig = error?.config as RetriableAxiosConfig | undefined;
      const requestUrl = String(originalConfig?.url || "");
      const isRefreshRequest = requestUrl.includes("/api/token/refresh/");

      if (error?.response?.status === 401 && originalConfig && !originalConfig._retry && !isRefreshRequest) {
        originalConfig._retry = true;

        const nextAccessToken = await refreshAccessToken();
        if (nextAccessToken) {
          originalConfig.headers = originalConfig.headers ?? {};
          originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`;
          return axios(originalConfig);
        }
      }

      if (error?.response?.status === 401) {
        clearAuthAndRedirect();
      }

      return Promise.reject(error);
    },
  );
}
