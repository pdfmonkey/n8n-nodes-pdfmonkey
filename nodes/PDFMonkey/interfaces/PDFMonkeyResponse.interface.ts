import { IDataObject } from 'n8n-workflow';
import { PDFMonkeyDocument } from './PDFMonkeyDocument.interface';

export interface PDFMonkeyResponse extends IDataObject {
	document: PDFMonkeyDocument;
}
