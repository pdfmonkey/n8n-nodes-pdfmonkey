import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { PDFMonkeyResponse } from './interfaces/PDFMonkeyResponse.interface';
import { extractFilename } from './utils/helpers';

export class PDFMonkeyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDFMonkey Trigger',
		name: 'pdfMonkeyTrigger',
		icon: 'file:PDFMonkey.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when PDFMonkey sends a webhook and download the PDF if successful',
		defaults: {
			name: 'PDFMonkey Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'pdfmonkey/webhook',
			},
		],
		properties: [],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const requestBody = this.getBodyData() as PDFMonkeyResponse;

		this.logger.info(
			`📡 Webhook received for PDFMonkey with data: ${JSON.stringify(requestBody, null, 2)}`,
		);

		if (!requestBody.document?.id) {
			throw new NodeOperationError(this.getNode(), 'Webhook did not provide a valid document ID');
		}

		const document = requestBody.document;
		const responseData = {
			message: `Webhook received for document ${document.id}`,
			id: document.id,
			status: document.status,
			download_url: document.download_url,
			document_template_id: document.document_template_id,
			document_template_identifier: document.document_template_identifier,
			created_at: document.created_at,
			updated_at: document.updated_at,
			app_id: document.app_id,
			failure_cause: document.failure_cause,
			meta: document.meta,
			public_share_link: document.public_share_link,
			xml_data: document.xml_data,
			payload: document.payload,
			checksum: document.checksum,
			generation_logs: document.generation_logs,
			preview_url: document.preview_url,
			filename: extractFilename(document),
		};

		// If document is not successful, just return the status
		if (document.status !== 'success') {
			return {
				workflowData: [
					[
						{
							json: responseData,
						},
					],
				],
			};
		}

		// Document is successful, download the PDF if download_url exists
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

		return {
			workflowData: [
				[
					{
						json: responseData,
						binary: {
							data: await this.helpers.prepareBinaryData(pdfBuffer, filename, 'application/pdf'),
						},
					},
				],
			],
		};
	}
}
