const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { n8n } = require('../../package.json');

const modules = [
	['nodes', 'PdfMonkey.node.js', 'PdfMonkey', 'pdfMonkey', 'execute'],
	['nodes', 'PdfMonkeyTrigger.node.js', 'PdfMonkeyTrigger', 'pdfMonkeyTrigger', 'webhook'],
	['credentials', 'PdfMonkeyApi.credentials.js', 'PdfMonkeyApi', 'pdfMonkeyApi'],
];

for (const [type, filename, exportName, name, method] of modules) {
	test(`Loads and instantiates ${exportName} from the package manifest`, () => {
		const entries = n8n[type].filter((entry) => path.basename(entry) === filename);
		assert.equal(entries.length, 1, `${filename} must be registered exactly once`);
		const Module = require(path.resolve(__dirname, '../..', entries[0]))[exportName];
		const instance = new Module();
		assert.equal(type === 'nodes' ? instance.description.name : instance.name, name);
		if (method) assert.equal(typeof instance[method], 'function');
		else assert.ok(Array.isArray(instance.properties));
	});
}
