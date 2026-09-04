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
		eventTriggerDescription: 'Waiting for a document to be generated in PDFMonkey',
		defaults: {
			name: 'PDFMonkey Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'This trigger fires whenever PDFMonkey finishes generating a document. To get sample data while building, click <b>Listen for test event</b>, then generate a document from one of the selected templates in PDFMonkey — the payload will show up here. Once you activate the workflow, it will run automatically on every successful generation.',
				active:
					'This trigger fires whenever PDFMonkey finishes generating a document. Since the workflow is active, it runs automatically on every successful generation. To test it while building, click <b>Listen for test event</b> and generate a document in PDFMonkey.',
			},
			activationHint:
				'Once you activate this workflow, it will run on every document successfully generated from the selected template(s).',
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

				this.logger.debug(
					`PDFMonkey: Loaded ${response.workspace_cards.length} workspace(s) for the trigger`,
				);

				return response.workspace_cards.map((workspace) => ({
					name: workspace.identifier,
					value: workspace.id,
				}));
			},

			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = this.getNodeParameter('workspaceId', '') as string;

				if (!workspaceId) {
					this.logger.debug('PDFMonkey: No workspace selected yet, skipping template loading');
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

				this.logger.debug(
					`PDFMonkey: Loaded ${response.document_template_cards.length} template(s) for workspace ${workspaceId}`,
				);

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
				const exists = webhookData.webhookId !== undefined;

				this.logger.debug(
					exists
						? `PDFMonkey: REST hook ${webhookData.webhookId} is already registered`
						: 'PDFMonkey: No REST hook registered yet',
				);

				return exists;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not resolve the webhook URL');
				}

				const webhookData = this.getWorkflowStaticData('node');
				const workspaceId = this.getNodeParameter('workspaceId') as string;
				const documentTemplateIds = this.getNodeParameter('documentTemplateIds', []) as string[];

				this.logger.info(
					`PDFMonkey: Registering a REST hook on ${webhookUrl} for workspace ${workspaceId} and ${
						documentTemplateIds.length > 0
							? `template(s) ${documentTemplateIds.join(', ')}`
							: 'all templates'
					}`,
				);

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

				this.logger.info(
					`PDFMonkey: REST hook ${response.rest_hook.id} registered with success`,
				);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					this.logger.debug('PDFMonkey: No REST hook to unregister');
					return true;
				}

				this.logger.info(`PDFMonkey: Unregistering REST hook ${webhookData.webhookId}`);

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'pdfMonkeyApi', {
						method: 'DELETE',
						url: `https://api.pdfmonkey.io/api/v1/rest_hooks/${webhookData.webhookId}`,
					});
				} catch (error) {
					this.logger.error(
						`PDFMonkey: Failed to unregister REST hook ${webhookData.webhookId}: ${error.message}`,
					);
					return false;
				}

				delete webhookData.webhookId;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const response = this.getBodyData() as IPdfMonkeyWebhookContent;

		const documentCard = response.document;

		if (!documentCard?.id) {
			throw new NodeOperationError(this.getNode(), 'Webhook did not provide a valid document ID');
		}

		this.logger.info(
			`PDFMonkey: Document ${documentCard.id} (${documentCard.document_template_identifier}) reported as "${documentCard.status}"`,
		);

		const responseData = {
			message: `Webhook received for document ${documentCard.id}`,
			...documentCard,
		};

		// If document is not successful, just return the response data
		if (documentCard.status !== 'success') {
			this.logger.warn(
				`PDFMonkey: Document ${documentCard.id} was not generated successfully, skipping download${
					documentCard.failure_cause ? ` (cause: ${documentCard.failure_cause})` : ''
				}`,
			);

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
		const pdfBuffer = await downloadFile({
			context: this,
			downloadUrl: documentCard.download_url!,
		});

		const filename = documentCard.filename!;

		this.logger.debug(
			`PDFMonkey: PDF file from document (${documentCard.id}) downloaded with success! Filename: ${filename}`,
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
