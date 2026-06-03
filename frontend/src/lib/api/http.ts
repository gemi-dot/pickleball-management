export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

function assertApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local (for example: http://127.0.0.1:8000/api).",
    );
  }

  return apiBaseUrl.replace(/\/+$/, "");
}

function toQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

function normalizeErrorMessage(payload: unknown, fallbackStatus: number): string {
  if (!payload) {
    return `Request failed with status ${fallbackStatus}`;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => String(item)).join("; ");
  }

  if (typeof payload !== "object") {
    return `Request failed with status ${fallbackStatus}`;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.detail === "string") {
    return record.detail;
  }

  const fieldErrors = Object.entries(record)
    .map(([field, value]) => {
      if (Array.isArray(value)) {
        return `${field}: ${value.map((entry) => String(entry)).join(", ")}`;
      }
      if (typeof value === "string") {
        return `${field}: ${value}`;
      }
      return `${field}: ${JSON.stringify(value)}`;
    })
    .join("; ");

  return fieldErrors || `Request failed with status ${fallbackStatus}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers, signal } = options;
  const baseUrl = assertApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}${toQueryString(query)}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: "no-store",
  });

  const hasJson = response.headers.get("content-type")?.includes("application/json");
  const payload = hasJson ? await response.json() : null;

  if (!response.ok) {
    const message = normalizeErrorMessage(payload, response.status);

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function requestWithoutBody(
  path: string,
  options: Omit<RequestOptions, "body"> = {},
): Promise<void> {
  await request<unknown>(path, options);
}
