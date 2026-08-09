type ApiErrorBody = {
	success?: false;
	error?: string;
};

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(status ? `(${status}) ${message}` : message);
		this.name = "ApiError";
	}
}

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";

export async function fetchApiJson<T = {}>(url: string, init?: RequestInit): Promise<T> {
	const resolvedUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;

	let res: Response;
	try {
		res = await fetch(resolvedUrl, init);
	} catch (error) {
		throw new ApiError(error instanceof Error ? error.message : "Network request failed");
	}

	const contentType = res.headers.get("content-type");
	const isJson = contentType?.includes("application/json");
	if (!isJson) throw new ApiError("The server did not return JSON", res.status);

	let body: any;
	try {
		body = await res.json();
	} catch {
		throw new ApiError(`The server returned invalid JSON response`, res.status);
	}

	if (!res.ok) {
		const apiBody = body as ApiErrorBody;
		const message = apiBody?.error || `Request failed with status ${res.status}`;
		throw new ApiError(message, res.status);
	}

	return body as T;
}
