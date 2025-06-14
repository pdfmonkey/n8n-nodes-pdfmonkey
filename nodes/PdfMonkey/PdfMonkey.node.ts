import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeCredentialTestResult,
	IPairedItemData,
} from 'n8n-workflow';
import {
	IPdfMonkeyDocument,
	IPdfMonkeyDocumentCard,
} from './interfaces/PdfMonkeyDocument.interface';
import {
	IPdfMonkeyDocumentCardResponse,
	IPdfMonkeyDocumentResponse,
} from './interfaces/PdfMonkeyResponse.interface';
import { downloadFile, mimeType } from './common';

export class PdfMonkey implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDFMonkey',
		name: 'pdfMonkey',
		icon: 'file:PDFMonkey.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate PDFs using PDFMonkey API',
		defaults: {
			name: 'PDFMonkey',
		},
		credentials: [
			{
				name: 'pdfMonkeyApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Actions',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Document',
						value: 'generateDocument',
						description: 'Create a new PDF using a template',
						action: 'Create a new PDF using a template',
					},
					{
						name: 'Get Document',
						value: 'getDocument',
						description: 'Get document details and status',
						action: 'Get document details and status',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						description: 'Download a generated PDF or Image',
						action: 'Download a generated PDF or image',
					},
					{
						name: 'Delete Document',
						value: 'deleteDocument',
						description: 'Delete an existing PDF document',
						action: 'Delete an existing PDF document',
					},
				],
				default: 'generateDocument',
				description: 'Choose what you want to do with PDFMonkey',
			},
			{
				displayName: 'Document Template ID',
				name: 'documentTemplateId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the PDFMonkey template to use to generate the PDF',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
					},
				},
			},
			{
				displayName: 'Payload Input',
				name: 'payloadInputMethod',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Enter payload as JSON',
					},
					{
						name: 'Key-Value Pairs',
						value: 'keyValuePairs',
						description: 'Enter payload as key-value pairs',
					},
				],
				default: 'json',
				description: 'Method to enter the payload data',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
					},
				},
			},
			{
				displayName: 'Payload (JSON)',
				name: 'payload',
				type: 'json',
				default: '{}',
				required: true,
				description: 'The dynamic data for the PDF generation in JSON format',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
						payloadInputMethod: ['json'],
					},
				},
			},
			{
				displayName: 'Payload',
				name: 'payloadKeyValues',
				placeholder: 'Add Payload Fields',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'The dynamic data for the PDF generation as key-value pairs',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
						payloadInputMethod: ['keyValuePairs'],
					},
				},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Field name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Field value (supports JSON arrays/objects if starting with [ or {)',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Filename',
				name: 'filename',
				type: 'string',
				default: '',
				description:
					'You can specify a custom filename for generated documents. A random value will be used if left empty.',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
					},
				},
			},
			{
				displayName: 'Meta (JSON)',
				name: 'meta',
				type: 'json',
				default: '{}',
				description: 'Additional metadata for the document',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
					},
				},
			},
			{
				displayName: 'Wait For Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description:
					'Whether to wait for document generation to complete and download the PDF or image automatically',
				displayOptions: {
					show: {
						operation: ['generateDocument'],
					},
				},
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the generated document',
				displayOptions: {
					show: {
						operation: ['getDocument', 'downloadFile', 'deleteDocument'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Loop through input items
		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const pairedItem: IPairedItemData = { item: i };

				if (operation === 'generateDocument') {
					const documentTemplateId = this.getNodeParameter('documentTemplateId', i) as string;
					const payloadInputMethod = this.getNodeParameter('payloadInputMethod', i) as string;

					// Process payload based on input method
					let finalPayload;
					if (payloadInputMethod === 'json') {
						// JSON input - use as is
						finalPayload = this.getNodeParameter('payload', i) as object;
					} else {
						// Key-value pairs input - convert to JSON object
						const keyValuePairs = this.getNodeParameter('payloadKeyValues.values', i, []) as Array<{
							key: string;
							value: string;
						}>;

						// Convert key-value pairs to a JSON object
						finalPayload = keyValuePairs.reduce(
							(obj, item) => {
								// Handle different value types properly
								if (item.value === null || item.value === undefined) {
									// Handle null/undefined
									obj[item.key] = null;
									return obj;
								}

								// If it's already an array or object, use it directly
								if (typeof item.value === 'object') {
									obj[item.key] = item.value;
									return obj;
								}

								// Convert to string for further processing if it's not an object
								const valueAsString = String(item.value);

								// Special case for [Array: [...]] format
								if (valueAsString.startsWith('[Array:')) {
									try {
										// Extract the array content using string replacement
										const arrayContent = valueAsString
											.replace(/^\[Array:\s*/, '')
											.replace(/\]\s*$/, '');
										// Now parse the extracted array content
										const parsedValue = JSON.parse(arrayContent) as any;
										obj[item.key] = parsedValue;
									} catch (e) {
										// If parsing fails, use as regular string
										obj[item.key] = valueAsString;
									}
								}
								// Check if the value is a JSON string (array or object)
								else if (valueAsString.startsWith('{') || valueAsString.startsWith('[')) {
									try {
										// Attempt to parse as JSON
										const parsedValue = JSON.parse(valueAsString);
										obj[item.key] = parsedValue;
									} catch (e) {
										// If parsing fails, use as regular string
										obj[item.key] = valueAsString;
									}
								} else {
									// Regular string value
									obj[item.key] = valueAsString;
								}

								return obj;
							},
							{} as Record<string, any>,
						);
					}

					const metaString = this.getNodeParameter('meta', i) as string;
					const meta = metaString ? JSON.parse(metaString) : {};

					const filename = this.getNodeParameter('filename', i) as string;

					if (!meta._filename && typeof filename === 'string' && filename.length > 0) {
						meta._filename = filename;
					}

					const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
					const status = 'pending';

					let response: IPdfMonkeyDocumentResponse | IPdfMonkeyDocumentCardResponse;

					// Initial document creation
					response = (await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
						method: 'POST',
						url: 'https://api.pdfmonkey.io/api/v1/documents',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							document_template_id: documentTemplateId,
							payload: finalPayload,
							meta,
							status,
						},
						json: true,
					})) as IPdfMonkeyDocumentResponse;

					this.logger.debug(
						`✅ PDFMonkey: Document creation started, documentId: ${response.document.id}`,
					);

					// If waitForCompletion is false, just return the initial response
					if (!waitForCompletion) {
						this.logger.debug(
							`📫 PDFMonkey: Skipping status check and download. Returning document ID: ${response.document.id}`,
						);
						returnData.push({ json: response, pairedItem });
						continue;
					}

					// Simple polling approach - keep checking status until success or failed
					let documentOrCard: IPdfMonkeyDocument | IPdfMonkeyDocumentCard = response.document;
					const documentId = documentOrCard.id;

					this.logger.debug(`⏳ PDFMonkey: Waiting for document ${documentId} to complete...`);

					// Loop until we reach success or failure status
					while (documentOrCard.status !== 'success' && documentOrCard.status !== 'failure') {
						// Wait 2 seconds before next check
						const waitUntil = Date.now() + 2000;
						while (Date.now() < waitUntil) {
							// Yield to event loop every 200ms to avoid blocking
							if (Date.now() % 200 < 10) {
								await new Promise<void>((resolve) => resolve());
							}
						}

						response = (await this.helpers.httpRequestWithAuthentication
							.call(this, 'pdfMonkeyApi', {
								method: 'GET',
								url: `https://api.pdfmonkey.io/api/v1/document_cards/${documentId}`,
								json: true,
							})
							.catch(() => {
								/* ignore errors during wait */
							})) as IPdfMonkeyDocumentCardResponse;

						documentOrCard = response.document_card;
						this.logger.debug(
							`📊 PDFMonkey: Document ${documentId} status: ${documentOrCard.status}`,
						);
					}

					// If we've reached success status, download the PDF or image
					if (documentOrCard.status === 'success') {
						this.logger.debug(`📄 PDFMonkey: Document ${documentId} is ready for download`);

						const pdfBuffer = await downloadFile({
							context: this,
							downloadUrl: documentOrCard.download_url!,
						});
						const filename = documentOrCard.filename as string;

						this.logger.debug(
							`📥 PDFMonkey: PDF file from document (${documentId}) downloaded with success! Filename: ${filename}`,
						);

						returnData.push({
							json: response,
							binary: {
								data: await this.helpers.prepareBinaryData(pdfBuffer, filename, mimeType(filename)),
							},
							pairedItem,
						});
					} else if (documentOrCard.status === 'failure') {
						// If generation failed, log the error and return the response
						this.logger.error(
							`❌ PDFMonkey: Document generation failed for ${documentId}: ${documentOrCard.failure_cause || 'Unknown error'}`,
						);
						returnData.push({ json: response, pairedItem });
					}
				} else if (operation === 'getDocument') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'pdfMonkeyApi',
						{
							method: 'GET',
							url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
							json: true,
						},
					)) as IPdfMonkeyDocumentResponse;

					const document = response.document;
					this.logger.debug(
						`📄 PDFMonkey: Status of Document (${document.id}): ${document.status}`,
					);

					returnData.push({ json: response, pairedItem });
				} else if (operation === 'downloadFile') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'pdfMonkeyApi',
						{
							method: 'GET',
							url: `https://api.pdfmonkey.io/api/v1/document_cards/${documentId}`,
							json: true,
						},
					)) as IPdfMonkeyDocumentCardResponse;

					const documentCard = response.document_card;

					// If document is not successful, just return the status
					if (documentCard.status !== 'success') {
						this.logger.warn(
							`⚠️ PDFMonkey: Document ${documentCard.id} is not ready for download. Status: ${documentCard.status}`,
						);
						returnData.push({
							json: {
								message: `Document is not ready for download`,
								documentId: documentCard.id,
								status: documentCard.status,
							},
							pairedItem,
						});
						continue;
					}

					// Document is successful, download the PDF or image
					this.logger.debug(`📄 PDFMonkey: Document ${documentCard.id} is ready for download`);

					const pdfBuffer = await downloadFile({
						context: this,
						downloadUrl: documentCard.download_url!,
					});

					const filename = documentCard.filename as string;

					this.logger.debug(
						`📥 PDFMonkey: PDF file from document (${documentCard.id}) downloaded with success! Filename: ${filename}`,
					);

					returnData.push({
						json: {
							message: `File downloaded successfully`,
							documentId: documentCard.id,
							status: documentCard.status,
							filename: filename,
						},
						binary: {
							data: await this.helpers.prepareBinaryData(pdfBuffer, filename, mimeType(filename)),
						},
						pairedItem,
					});
				} else if (operation === 'deleteDocument') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
							method: 'DELETE',
							url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
						});

						this.logger.debug(`🗑️ PDFMonkey: Document ${documentId} deleted successfully`);

						returnData.push({
							json: {
								success: true,
								message: `Document deleted successfully`,
								documentId,
							},
							pairedItem,
						});
					} catch (error) {
						this.logger.error(
							`❌ PDFMonkey: Failed to delete document ${documentId}: ${error.message}`,
						);
						throw new NodeOperationError(
							this.getNode(),
							`Failed to delete document: ${error.message}`,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	async test(this: IExecuteFunctions): Promise<INodeCredentialTestResult> {
		try {
			await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
				method: 'GET',
				url: 'https://api.pdfmonkey.io/api/v1/document_templates',
			});
			return {
				status: 'OK',
				message: 'Connection successful!',
			};
		} catch (error) {
			return {
				status: 'Error',
				message: `Connection failed: ${error.message}`,
			};
		}
	}
}
