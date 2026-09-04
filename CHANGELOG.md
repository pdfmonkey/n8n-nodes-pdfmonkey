# CHANGELOG

## 0.5.0 (2026-09-04)

- (Feature) Registering and removing the PDFMonkey REST hook automatically in the Trigger node: pick a workspace and, optionally, specific templates on the node instead of wiring the webhook by hand in PDFMonkey
- (Feature) Triggering on failed generations as well as successful ones, so a failed document no longer leaves the workflow silent. Failed documents arrive with their `failure_cause` and no binary data; check the `status` field to tell them apart
- (Breaking) Failing the item in Generate Document when PDFMonkey reports a generation failure, instead of returning an item with no file and letting the workflow carry on down the success path. Enable "Continue On Fail" on the node to keep the previous behavior
- (Breaking) Giving up after 5 minutes when "Wait For Completion" is enabled, instead of waiting indefinitely. The document keeps generating on PDFMonkey's side, so it can still be retrieved with Get Document or Download File
- (Fix) Removing a busy-wait in the "Wait For Completion" polling loop that kept a CPU core pegged for the whole wait
- (Fix) Reporting the real cause when a status check fails mid-wait, instead of `Cannot read properties of undefined (reading 'status')`
- (Improvement) Naming the document in download failures, alongside the storage error already reported
- (Chore) Removing emojis and redundant entries from the node logs, including a debug line that wrote the document payload and meta into the n8n logs

### Upgrading from 0.4.x

Existing **PDFMonkey Trigger** nodes need a Workspace selected before the workflow
can be activated again: the node now registers its own REST hook and the field is
required. The webhook path is unchanged (`pdfmonkey/webhook`), so any hook you
registered by hand in PDFMonkey keeps delivering to the same URL. Remove it once
the node registers its own, or the workflow will run twice per document.
