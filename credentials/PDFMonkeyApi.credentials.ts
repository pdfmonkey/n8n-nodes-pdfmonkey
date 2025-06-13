import {
	ICredentialType,
	INodeProperties,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class PDFMonkeyApi implements ICredentialType {
	name = 'pdfMonkeyApi';
	displayName = 'PDFMonkey API';
	documentationUrl = 'https://www.pdfmonkey.io/docs/api/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.apiKey}`,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pdfmonkey.io',
			url: '/api/v1/current_user',
			method: 'GET',
		},
	};
}
