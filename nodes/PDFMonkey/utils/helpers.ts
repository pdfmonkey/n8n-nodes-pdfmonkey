import { PDFMonkeyDocument } from '../interfaces/PDFMonkeyDocument.interface';

/**
 * Extracts the filename from a PDFMonkey document's metadata
 * Looks for _filename property in the meta object
 *
 * @param document The PDFMonkey document
 * @returns The extracted filename or default 'document.pdf'
 */
export function extractFilename(document: PDFMonkeyDocument): string {
	let filename = 'document.pdf';

	// Check if download_url is null or undefined
	if (!document.download_url) {
		return filename;
	}

	// Check for filename in meta
	if (document.meta) {
		// If meta is a string, try to parse it
		if (typeof document.meta === 'string') {
			try {
				const metaObj = JSON.parse(document.meta);
				if (metaObj._filename && typeof metaObj._filename === 'string') {
					filename = metaObj._filename;
					return filename;
				}
			} catch (err) {
				// If parsing fails, continue with default filename
			}
		}
		// If meta is an object, check for _filename property
		else if (typeof document.meta === 'object' && document.meta !== null) {
			const metaObj = document.meta;
			if (metaObj._filename && typeof metaObj._filename === 'string') {
				filename = metaObj._filename;
				return filename;
			}
		}
	}

	return filename;
}
