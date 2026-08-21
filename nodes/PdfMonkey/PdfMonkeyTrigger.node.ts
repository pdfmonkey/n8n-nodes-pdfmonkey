import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	INodeCredentialTestResult,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
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
		properties: [
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				default: '',
				required: true,
				description:
					'The workspace to listen for document generation events in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Template Names or IDs',
				name: 'documentTemplateIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
					loadOptionsDependsOn: ['workspaceId'],
				},
				default: [],
				description:
					'Apply this trigger only for specific templates. Leave empty to apply to all templates in the workspace. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pdfMonkeyApi',
					{
						method: 'GET',
						url: 'https://api.pdfmonkey.io/api/v1/workspace_cards',
						json: true,
					},
				)) as { workspace_cards: Array<{ id: string; identifier: string }> };

				return response.workspace_cards.map((workspace) => ({
					name: workspace.identifier,
					value: workspace.id,
				}));
			},

			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = this.getNodeParameter('workspaceId', '') as string;

				if (!workspaceId) {
					return [];
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pdfMonkeyApi',
					{
						method: 'GET',
						url: 'https://api.pdfmonkey.io/api/v1/document_template_cards',
						qs: {
							page: 'all',
							'q[workspace_id]': workspaceId,
						},
						json: true,
					},
				)) as { document_template_cards: Array<{ id: string; identifier: string }> };

				return response.document_template_cards.map((template) => ({
					name: template.identifier,
					value: template.id,
				}));
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return webhookData.webhookId !== undefined;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not resolve the webhook URL');
				}

				const webhookData = this.getWorkflowStaticData('node');
				const workspaceId = this.getNodeParameter('workspaceId') as string;
				const documentTemplateIds = this.getNodeParameter('documentTemplateIds', []) as string[];

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pdfMonkeyApi',
					{
						method: 'POST',
						url: 'https://api.pdfmonkey.io/api/v1/rest_hooks',
						body: {
							rest_hook: {
								document_template_ids: documentTemplateIds,
								event: 'documents.generation.success',
								platform: 'n8n',
								url: webhookUrl,
								workspace_id: workspaceId,
							},
						},
						json: true,
					},
				)) as { rest_hook: { id: string } };

				webhookData.webhookId = response.rest_hook.id;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return true;
				}

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
						method: 'DELETE',
						url: `https://api.pdfmonkey.io/api/v1/rest_hooks/${webhookData.webhookId}`,
					});
				} catch (error) {
					return false;
				}

				delete webhookData.webhookId;

				return true;
			},
		},
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
