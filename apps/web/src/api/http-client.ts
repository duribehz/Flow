const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const DEV_USER_ID_STORAGE_KEY = "flow.dev-user-id";

function readDevUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEV_USER_ID_STORAGE_KEY);
}

export async function apiClient<T>(path: string, options: RequestInit): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const devUserId = readDevUserId();

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
      ...options.headers,
    },
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json") ? response.json() : response.text();
}
