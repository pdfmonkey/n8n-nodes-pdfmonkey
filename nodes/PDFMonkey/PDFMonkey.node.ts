import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { PDFMonkeyResponse } from './interfaces/PDFMonkeyResponse.interface';
import { extractFilename } from './utils/helpers';

export class PDFMonkey implements INodeType {
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
				options: [
					{
						name: 'Generate Document',
						value: 'generateDocument',
						description: 'Create a new PDF using a template',
					},
					{
						name: 'Get Document',
						value: 'getDocument',
						description: 'Get document details and status',
					},
					{
						name: 'Download PDF',
						value: 'downloadPdf',
						description: 'Download a generated PDF',
					},
					{
						name: 'Delete Document',
						value: 'deleteDocument',
						description: 'Delete a generated PDF document',
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
				description: 'The ID of the PDFMonkey template to use for generating the PDF',
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
					},
				},
			},
			{
				displayName: 'Meta (JSON)',
				name: 'meta',
				type: 'json',
				default: '{}',
				required: false,
				description: 'Additional metadata for the document (e.g., custom filename with "_filename" property)',
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
				description: 'Whether to wait for document generation to complete and download the PDF automatically',
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
						operation: ['getDocument', 'downloadPdf', 'deleteDocument'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('pdfMonkeyApi');

		if (!credentials || !credentials.apiKey) {
			throw new NodeOperationError(this.getNode(), 'No API Key provided for PDFMonkey');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'generateDocument') {
					const documentTemplateId = this.getNodeParameter('documentTemplateId', i) as string;
					const payload = this.getNodeParameter('payload', i) as object;
					const meta = this.getNodeParameter('meta', i) as object;
					const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;
					const status = 'pending';

					// Initial document creation
					let response = (await this.helpers.request({
						method: 'POST',
						url: 'https://api.pdfmonkey.io/api/v1/documents',
						headers: {
							Authorization: `Bearer ${credentials.apiKey}`,
							'Content-Type': 'application/json',
						},
						body: {
							document_template_id: documentTemplateId,
							payload,
							meta,
							status,
						},
						json: true,
					})) as PDFMonkeyResponse;

					this.logger.info(
						`✅ PDFMonkey: Document creation started, documentId: ${response.document.id}`,
					);

					// If waitForCompletion is false, just return the initial response
					if (!waitForCompletion) {
						this.logger.info(
							`📫 PDFMonkey: Skipping status check and download. Returning document ID: ${response.document.id}`
						);
						returnData.push({ json: response });
						continue;
					}

					// Simple polling approach - keep checking status until success or failed
					const documentId = response.document.id;
					let document = response.document;
					
					this.logger.info(`⏳ PDFMonkey: Waiting for document ${documentId} to complete...`);
					
					// Loop until we reach success or failure status
					while (document.status !== 'success' && document.status !== 'failure') {
						// Wait 2 seconds before next check
						const waitUntil = Date.now() + 2000;
						while (Date.now() < waitUntil) {
							// Empty loop to create delay
						}
						
						response = await this.helpers.request({
							method: 'GET',
							url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
							headers: { Authorization: `Bearer ${credentials.apiKey}` },
							json: true,
						}).catch(() => { /* ignore errors during wait */ }) as PDFMonkeyResponse;
					
						document = response.document;
						this.logger.info(`📊 PDFMonkey: Document ${documentId} status: ${document.status}`);
					}

					// If we've reached success status, download the PDF
					if (document.status === 'success' && document.download_url) {
						this.logger.info(`📄 PDFMonkey: Document ${documentId} is ready for download`);
						
						const pdfBuffer = await this.helpers.request({
							method: 'GET',
							url: document.download_url as string,
							encoding: null,
						});

						// Get the best filename from document data
						const filename = extractFilename(document);

						this.logger.info(
							`📥 PDFMonkey: PDF file from document (${documentId}) downloaded with success! Filename: ${filename}`
						);

						returnData.push({
							json: response,
							binary: {
								data: await this.helpers.prepareBinaryData(pdfBuffer, filename, 'application/pdf'),
							},
						});
					} else if (document.status === 'failure') {
						// If generation failed, log the error and return the response
						this.logger.error(
							`❌ PDFMonkey: Document generation failed for ${documentId}: ${document.failure_cause || 'Unknown error'}`
						);
						returnData.push({ json: response });
					}
				} else if (operation === 'getDocument') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					const response = (await this.helpers.request({
						method: 'GET',
						url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
						headers: {
							Authorization: `Bearer ${credentials.apiKey}`,
						},
						json: true,
					})) as PDFMonkeyResponse;

					const document = response.document;
					this.logger.info(`📄 PDFMonkey: Status of Document (${document.id}): ${document.status}`);

					returnData.push({ json: response });
				} else if (operation === 'downloadPdf') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					const response = (await this.helpers.request({
						method: 'GET',
						url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
						headers: {
							Authorization: `Bearer ${credentials.apiKey}`,
						},
						json: true,
					})) as PDFMonkeyResponse;

					const document = response.document;

					// If document is not successful, just return the status
					if (document.status !== 'success') {
						this.logger.warn(
							`⚠️ PDFMonkey: Document ${document.id} is not ready for download. Status: ${document.status}`,
						);
						returnData.push({
							json: {
								message: `Document is not ready for download`,
								documentId: document.id,
								status: document.status,
							},
						});
						continue;
					}

					// Document is successful, download the PDF
					this.logger.info(`📄 PDFMonkey: Document ${document.id} is ready for download`);

					const pdfBuffer = await this.helpers.request({
						method: 'GET',
						url: document.download_url as string,
						encoding: null,
					});

					// Get the best filename from document data
					const filename = extractFilename(document);

					this.logger.info(
						`📥 PDFMonkey: PDF file from document (${document.id}) downloaded with success! Filename: ${filename}`,
					);

					returnData.push({
						json: {
							message: `PDF downloaded successfully`,
							documentId: document.id,
							status: document.status,
							filename: filename,
						},
						binary: {
							data: await this.helpers.prepareBinaryData(pdfBuffer, filename, 'application/pdf'),
						},
					});
				} else if (operation === 'deleteDocument') {
					const documentId = this.getNodeParameter('documentId', i) as string;

					try {
						await this.helpers.request({
							method: 'DELETE',
							url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
							headers: {
								Authorization: `Bearer ${credentials.apiKey}`,
							},
						});

						this.logger.info(`🗑️ PDFMonkey: Document ${documentId} deleted successfully`);

						returnData.push({
							json: {
								success: true,
								message: `Document deleted successfully`,
								documentId,
							},
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
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
