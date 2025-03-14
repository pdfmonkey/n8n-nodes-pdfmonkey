import { IDataObject } from 'n8n-workflow';

export interface PDFMonkeyDocument extends IDataObject {
	id: string;
	status: string;
	download_url: string | null;
	document_template_id: string;
	document_template_identifier: string;
	created_at: string;
	updated_at: string;
	app_id: string;
	failure_cause: string | null;
	meta: IDataObject | string | null;
	public_share_link: string | null;
	xml_data: string | null;
	payload: string;
	checksum: string;
	generation_logs: string[];
	preview_url: string;
}
