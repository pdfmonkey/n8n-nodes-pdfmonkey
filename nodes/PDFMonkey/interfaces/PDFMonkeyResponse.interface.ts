import { IDataObject } from 'n8n-workflow';
import { IPDFMonkeyDocument, IPDFMonkeyDocumentCard } from './PDFMonkeyDocument.interface';

export interface IPDFMonkeyDocumentResponse extends IDataObject {
	document: IPDFMonkeyDocument;
}

export interface IPDFMonkeyDocumentCardResponse extends IDataObject {
	document_card: IPDFMonkeyDocumentCard;
}
