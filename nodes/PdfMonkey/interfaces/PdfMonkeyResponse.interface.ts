import { IDataObject } from 'n8n-workflow';
import { IPdfMonkeyDocument, IPdfMonkeyDocumentCard } from './PdfMonkeyDocument.interface';

export interface IPdfMonkeyDocumentResponse extends IDataObject {
	document: IPdfMonkeyDocument;
}

export interface IPdfMonkeyDocumentCardResponse extends IDataObject {
	document_card: IPdfMonkeyDocumentCard;
}

export interface IPdfMonkeyWebhookContent extends IDataObject {
	document: IPdfMonkeyDocumentCard;
}
