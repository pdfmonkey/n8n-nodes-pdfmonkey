# CHANGELOG

## 1.0.0 (2026-09-04)

- (Breaking) Registering and removing the PDFMonkey REST hook automatically in the Trigger node: pick a workspace and, optionally, specific templates on the node instead of wiring the webhook by hand in PDFMonkey. Existing triggers will not activate until a Workspace is selected, and the hook you registered by hand has to be deleted or every document is delivered twice
- (Breaking) Triggering on failed generations as well as successful ones, so a failed document no longer leaves the workflow silent. Failed documents arrive with their `failure_cause` and no binary data, so branch on the `status` field before any step that expects a file
- (Breaking) Failing the item in Generate Document when PDFMonkey reports a generation failure, instead of returning an item with no file and letting the workflow carry on down the success path. Enable "Continue On Fail" on the node to keep the previous behavior
- (Breaking) Giving up after 5 minutes when "Wait For Completion" is enabled, instead of waiting indefinitely. The document keeps generating on PDFMonkey's side, so it can still be retrieved with Get Document or Download File
- (Fix) Removing a busy-wait in the "Wait For Completion" polling loop that kept a CPU core pegged for the whole wait
- (Fix) Reporting the real cause when a status check fails mid-wait, instead of `Cannot read properties of undefined (reading 'status')`
- (Improvement) Naming the document in download failures, alongside the storage error already reported
- (Chore) Removing emojis and redundant entries from the node logs, including a debug line that wrote the document payload and meta into the n8n logs

### Upgrading from 0.4.x

This release changes the behavior of existing nodes, which is why it is a major version. Updating the package does not migrate saved workflows, so read this before updating an n8n instance with live PDFMonkey workflows.

**Every existing PDFMonkey Trigger needs a Workspace selected before its workflow can be activated again.** The node registers its own REST hook now and the field is required, so a trigger saved on 0.4.x arrives with an empty workspace and activation fails until someone opens the workflow and picks one.

**Delete the REST hook you registered by hand in PDFMonkey.** The webhook path is unchanged (`pdfmonkey/webhook`), so your existing hook keeps delivering to the same URL. Once the node registers its own, both fire and the workflow runs twice per document.

**Triggers now fire on failed generations too.** A workflow that assumed every trigger meant a successful document will start receiving failures, which carry a `failure_cause` and no binary data. Branch on the `status` field before any step that expects a file.

**Workflows relying on a failed generation flowing through Generate Document will now stop instead.** Enable "Continue On Fail" on the node to keep the previous behavior.

**Generations that take more than 5 minutes now fail the item** rather than waiting indefinitely. Turn "Wait For Completion" off and retrieve the document with Get Document or Download File, or use the Trigger node instead.
