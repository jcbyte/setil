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

export async function fetchApiJson<T = {}>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
	let res: Response;
	try {
		res = await fetch(input, init);
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
