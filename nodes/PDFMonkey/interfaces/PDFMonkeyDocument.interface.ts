import { IDataObject } from 'n8n-workflow';

type OutputType = 'image' | 'pdf';
type DocumentStatus = 'draft' | 'pending' | 'generating' | 'success' | 'failure';

export interface IPDFMonkeyDocument extends IDataObject {
	id: string;
	app_id: string;
	checksum: string;
	created_at: string;
	document_template_id: string;
	download_url: string | null;
	failure_cause: string | null;
	filename: string | null;
	generation_logs: {
		type: string;
		message: string;
		timestamp: string;
	}[];
	meta: string | null;
	output_type: OutputType;
	payload: string | null;
	preview_url: string;
	public_share_link: string | null;
	status: DocumentStatus;
	updated_at: string;
	xml_data: string | null;
}

export interface IPDFMonkeyDocumentCard extends IDataObject {
	app_id: string;
	created_at: string;
	document_template_identifier: string;
	document_template_id: string;
	download_url: string | null;
	failure_cause: string | null;
	filename: string | null;
	meta: string;
	output_type: OutputType;
	preview_url: string;
	public_share_link: string | null;
	status: DocumentStatus;
	updated_at: string;
}
