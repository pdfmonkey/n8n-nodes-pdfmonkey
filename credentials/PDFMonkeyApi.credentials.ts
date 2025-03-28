import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class PDFMonkeyApi implements ICredentialType {
	name = 'pdfMonkeyApi';
	displayName = 'PDFMonkey API';
	documentationUrl = 'https://www.pdfmonkey.io/docs/api/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
