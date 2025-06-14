import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeCredentialTestResult,
	IExecuteFunctions,
} from 'n8n-workflow';
import { IPdfMonkeyWebhookContent } from './interfaces/PdfMonkeyResponse.interface';
import { downloadFile, mimeType } from './common';

export class PdfMonkeyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDFMonkey Trigger',
		name: 'pdfMonkeyTrigger',
		icon: 'file:PDFMonkey.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Triggers when PdfMonkey sends a webhook and downloads the PDF or image if successful',
		defaults: {
			name: 'PDFMonkey Trigger',
		},
		credentials: [
			{
				name: 'pdfMonkeyApi',
				required: true,
			},
		],
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
		const response = this.getBodyData() as IPdfMonkeyWebhookContent;

		this.logger.debug(
			`📡 Webhook received for PDFMonkey with data: ${JSON.stringify(response, null, 2)}`,
		);

		const documentCard = response.document;

		if (!documentCard?.id) {
			throw new NodeOperationError(this.getNode(), 'Webhook did not provide a valid document ID');
		}

		const responseData = {
			message: `Webhook received for document ${documentCard.id}`,
			...documentCard,
		};

		// If document is not successful, just return the response data
		if (documentCard.status !== 'success') {
			return {
				workflowData: [
					[
						{
							json: responseData,
							pairedItem: { item: 0 },
						},
					],
				],
			};
		}

		// Document is successful, download the PDF or image if download_url exists
		this.logger.debug(`📄 PDFMonkey: Document ${documentCard.id} is ready for download`);

		const pdfBuffer = await downloadFile({
			context: this,
			downloadUrl: documentCard.download_url!,
		});

		const filename = documentCard.filename!;

		this.logger.debug(
			`📥 PDFMonkey: PDF file from document (${documentCard.id}) downloaded with success! Filename: ${filename}`,
		);

		return {
			workflowData: [
				[
					{
						json: responseData,
						binary: {
							data: await this.helpers.prepareBinaryData(pdfBuffer, filename, mimeType(filename)),
						},
						pairedItem: { item: 0 },
					},
				],
			],
		};
	}

	async test(this: IExecuteFunctions): Promise<INodeCredentialTestResult> {
		try {
			await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
				method: 'GET',
				url: 'https://api.pdfmonkey.io/api/v1/document_cards',
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
