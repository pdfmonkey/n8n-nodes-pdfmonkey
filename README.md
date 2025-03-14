![PDFMonkey for n8n](./images/n8n-nodes-pdfmonkey.webp)

# n8n-nodes-pdfmonkey

This is an n8n community node. It lets you use PDFMonkey in your n8n workflows.

[PDFMonkey](https://www.pdfmonkey.io/) is a service that allows you to generate PDFs from HTML templates with dynamic data.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### PDFMonkey Node

The PDFMonkey node provides the following operations:

- **Generate Document**: Create a new PDF document using a template and dynamic data
  - Supports custom metadata including filename customization via the `_filename` property
  - Optional auto-polling for document completion (controlled by "Wait For Completion" option)
  - Uses a simple 2-second interval between status checks when polling
  - Downloads the PDF automatically if generation is successful and auto-polling is enabled
- **Get Document**: Get document details and check its generation status
- **Download PDF**: Download a generated PDF document and save it as a binary file
- **Delete Document**: Delete a previously generated PDF document from PDFMonkey

### PDFMonkey Trigger Node

The PDFMonkey Trigger node listens for webhooks from PDFMonkey and processes them:

- **Webhook Receiver**: Triggers when PDFMonkey sends a webhook notification
- **Automatic PDF Download**: Automatically downloads the PDF when the document generation is successful
- **Intelligent Filename Handling**: Extracts the filename from metadata
- **Complete Response Data**: Returns all document properties from the PDFMonkey API in the JSON output

## Credentials

To use the PDFMonkey nodes, you need to have a PDFMonkey account and API key.

1. Sign up for PDFMonkey at [https://www.pdfmonkey.io/](https://www.pdfmonkey.io/)
2. In your PDFMonkey dashboard, navigate to the API section
3. Copy your API key
4. In n8n, create new credentials of type 'PDFMonkey API' and paste your API key

## Compatibility

This node has been tested with n8n version 1.0.0 and later.

## Usage

### Generate Document with Auto-Polling

The Generate Document operation includes a "Wait For Completion" option that controls whether the node waits for the document to finish generating before continuing the workflow:

1. When **enabled** (default):
   - The node checks the document status every 2 seconds until it reaches a final state (success or failure)
   - If successful, it automatically downloads the PDF and returns it as a binary file
   - Simple, straightforward polling mechanism with minimal overhead
   - Progress is logged with status updates during polling

2. When **disabled**:
   - The node returns immediately after creating the document
   - The response includes the document ID and initial pending status
   - You can later use the Get Document or Download PDF operations to check status and retrieve the document

This feature is especially useful for smaller documents that generate quickly, providing a simpler workflow without needing separate Get Document and Download PDF steps. For larger documents that take longer to generate, you may want to disable this option and use a separate Get Document or Download PDF operation later.

### Custom Filenames

You can set a custom filename for your generated PDFs using the Meta field in the Generate Document operation:

1. In the Meta (JSON) field, include the `_filename` property:
```json
{
  "_filename": "invoice-2023-001.pdf"
}
```

2. When downloading the PDF (either via the Download PDF operation or through the trigger node), this filename will be used instead of the default "document.pdf".

3. **Note**: The `_filename` property in the metadata is the only way to set a custom filename for your PDFs, as the system will exclusively use this property to determine the filename when downloading documents.

4. You can also include other metadata that will be stored with the document and can be retrieved later.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [PDFMonkey API Documentation](https://docs.pdfmonkey.io/)
