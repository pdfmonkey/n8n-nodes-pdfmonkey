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
	downloadUrl,
}: {
	context: IExecuteFunctions | IWebhookFunctions;
	downloadUrl: string;
}) {
	return await context.helpers.httpRequest({
		method: 'GET',
		url: downloadUrl,
		encoding: 'arraybuffer',
	});
}

export function mimeType(filename: string) {
	const extension = filename.split('.').pop()?.toLowerCase();

	return MIME_TYPES[extension as keyof typeof MIME_TYPES] || 'application/octet-stream';
}
