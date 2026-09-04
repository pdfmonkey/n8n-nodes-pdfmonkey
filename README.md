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
  - Supports custom metadata and filename customization
  - Optional auto-polling for document completion (controlled by "Wait For Completion" option)
  - Polls every 2 seconds while waiting, and gives up after 5 minutes
  - Downloads the PDF automatically if generation is successful and auto-polling is enabled
  - Fails the item if PDFMonkey reports a generation failure, reporting the `failure_cause`
- **Get Document**: Get document details and check its generation status
- **Download File**: Download a generated PDF or image document and save it as a binary file
- **Delete Document**: Delete a previously generated PDF document from PDFMonkey

### PDFMonkey Trigger Node

The PDFMonkey Trigger node listens for webhooks from PDFMonkey and processes them:

- **Webhook Receiver**: Triggers when PDFMonkey finishes generating a document, whether it succeeded or failed. Check the `status` field to tell them apart
- **Automatic File Download**: Automatically downloads the PDF or image when the document generation is successful; failed documents come through with their `failure_cause` and no binary data
- **Intelligent Filename Handling**: Extracts the filename from metadata
- **Complete Response Data**: Returns all document properties from the PDFMonkey API in the JSON output

#### Testing the Trigger

Select a workspace (and optionally one or more templates), then click **Listen for test event**. n8n
registers a temporary REST hook with PDFMonkey; generate a document from one of the selected templates
and the payload will appear in the output panel.

To build the rest of your workflow without generating a document, click **set mock data** in the output
panel and paste the payload below. It matches what PDFMonkey actually sends
([webhook documentation](https://pdfmonkey.io/docs/generating-documents/webhooks/)):

```json
[
  {
    "id": "a5e86d72-f5b7-43d4-a04e-8b7e08e6741c",
    "app_id": "d6b4e8f2-7a3c-4d1e-9f5b-2c8a1d3e6f90",
    "created_at": "2050-03-13T12:34:56.181+02:00",
    "document_template_id": "2903f5b4-623b-4e10-b2e3-dc7e2e67ea39",
    "document_template_identifier": "My Invoice Template",
    "download_url": "https://pdfmonkey.s3.eu-west-1.amazonaws.com/...",
    "failure_cause": null,
    "filename": "2050-03-14 Peter Parker.pdf",
    "meta": {
      "_filename": "2050-03-14 Peter Parker.pdf",
      "clientRef": "spidey-616"
    },
    "output_type": "pdf",
    "preview_url": "https://preview.pdfmonkey.io/pdf/web/viewer.html?file=...",
    "public_share_link": null,
    "status": "success",
    "updated_at": "2050-03-13T12:34:59.412+02:00"
  }
]
```

The webhook carries a DocumentCard, so `payload`, `generation_logs` and `checksum` are not included.
`download_url` is a signed link valid for one hour. On a real successful event the node also attaches the
downloaded file as binary data, which mock data cannot reproduce.

## Credentials

To use the PDFMonkey nodes, you need to have a PDFMonkey account and API key.

1. Sign up for PDFMonkey at [https://www.pdfmonkey.io/](https://www.pdfmonkey.io/)
2. In your PDFMonkey dashboard, navigate to the API section
3. Copy your API key
4. In n8n, create new credentials of type 'PDFMonkey API' and paste your API key

## Compatibility

This node has been tested with n8n version 1.0.0 and later.

## Usage

### Flexible Payload Input

The Generate Document operation supports two methods for providing template data:

1. **JSON Format**:

   - Enter your entire payload as a JSON object
   - Ideal for complex data structures or when copying from another source
   - Example:
     ```json
     {
     	"invoiceNumber": "INV-2023-001",
     	"customerName": "Acme Inc.",
     	"items": [
     		{ "name": "Widget", "quantity": 5, "price": 10.99 },
     		{ "name": "Gadget", "quantity": 2, "price": 24.99 }
     	],
     	"total": 104.93
     }
     ```

2. **Key-Value Pairs**:
   - Add fields individually with key-value pairs
   - More visual and easier to manage for simple templates
   - Supports complex data structures:
     - JSON objects/arrays: Values starting with `{` or `[` are automatically parsed as JSON
     - Arrays from other nodes: The node automatically handles n8n's special array format `[Array: [...]]`
     - Direct objects: When passing data from other nodes that return objects, they are used directly

### Enhanced Object Handling

The node intelligently processes different value types in key-value pairs:

- **Direct Objects**: Objects passed directly from other nodes are preserved intact
- **JSON Strings**: Strings that look like JSON (starting with `{` or `[`) are parsed automatically
- **Special Array Format**: The n8n array format `[Array: [...]]` is detected and parsed
- **Regular Values**: Simple strings, numbers, and booleans are handled appropriately

This makes it easy to pass complex data from other nodes to PDFMonkey without manual conversion.

#### Example: Processing Arrays from n8n

When you map data from other nodes (like Function or HTTP Request nodes), arrays often come in this special format:

```
[Array: [{"name":"Mouse","quantity":3,"price":88.92},{"name":"Headphones","quantity":5,"price":14.99},{"name":"Keyboard","quantity":3,"price":48.28}]]
```

The PDFMonkey node will automatically detect this format, extract the array content, and properly parse it as a JSON array. This is especially useful for templating tables or lists in your PDFs where you need to pass complex structured data.

### Generate Document with Auto-Polling

The Generate Document operation includes a "Wait For Completion" option that controls whether the node waits for the document to finish generating before continuing the workflow:

1. When **enabled** (default):

   - The node checks the document status every 2 seconds until it reaches a final state (success or failure)
   - If successful, it automatically downloads the PDF or image and returns it as a binary file
   - If PDFMonkey reports a failure, the item fails with the `failure_cause` it returned. Enable
     n8n's "Continue On Fail" on the node if you would rather keep the workflow running
   - If the document is still generating after 5 minutes, the node stops waiting and fails the item.
     The document keeps generating on PDFMonkey's side, so you can still fetch it later with
     Get Document or Download File
   - Progress is logged with status updates during polling

2. When **disabled**:
   - The node returns immediately after creating the document
   - The response includes the document ID and initial pending status
   - You can later use the Get Document or Download File operations to check status and retrieve the document

This feature is especially useful for smaller documents that generate quickly, providing a simpler workflow without needing separate Get Document and Download File steps. For larger documents that take longer to generate, in particular anything that might run past the 5-minute wait, disable this option and use a separate Get Document or Download File operation later, or trigger the follow-up work from the PDFMonkey Trigger node instead.

### Custom Filenames

You can set a custom filename for your generated PDF or image using the dedicated `Custom Filename` field in the Generate Document operation

If the field is left empty, the node will use the default generated filename.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [PDFMonkey API Documentation](https://docs.pdfmonkey.io/)
