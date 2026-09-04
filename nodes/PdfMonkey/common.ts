import { IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';

const MIME_TYPES = {
	pdf: 'application/pdf',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
};

export async function downloadFile({
	context,
	documentId,
	downloadUrl,
}: {
	context: IExecuteFunctions | IWebhookFunctions;
	documentId: string;
	downloadUrl: string;
}) {
	try {
		return await context.helpers.httpRequest({
			method: 'GET',
			url: downloadUrl,
			encoding: 'arraybuffer',
		});
	} catch (error) {
		// The download URL is presigned, so a failure comes back as an S3 XML error
		// document naming the actual cause (SignatureDoesNotMatch, InvalidAccessKeyId,
		// AccessDenied...). n8n only persists error.message, and `encoding: 'arraybuffer'`
		// means the body is a Buffer, so without this a 403 is indistinguishable from
		// any other 403 in the execution history.
		const body = error.response?.data ?? error.response?.body;
		const details =
			typeof body === 'string'
				? body
				: body instanceof Uint8Array
					? // A Node Buffer at runtime; typed as Uint8Array here since this package
						// carries no @types/node, and Uint8Array.toString() takes no encoding.
						(body as unknown as { toString(encoding: string): string }).toString('utf8')
					: '';

		error.message = `Could not download document ${documentId}: ${error.message}${
			details ? ` — response body: ${details.slice(0, 1000)}` : ''
		}`;

		throw error;
	}
}

export function mimeType(filename: string) {
	const extension = filename.split('.').pop()?.toLowerCase();

	return MIME_TYPES[extension as keyof typeof MIME_TYPES] || 'application/octet-stream';
}
