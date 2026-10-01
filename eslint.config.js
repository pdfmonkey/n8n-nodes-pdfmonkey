const tsParser = require('@typescript-eslint/parser');
const n8nNodesBase = require('eslint-plugin-n8n-nodes-base');
const n8nCommunityNodes = require('@n8n/eslint-plugin-community-nodes');

const languageOptions = {
	parser: tsParser,
	sourceType: 'module',
	ecmaVersion: 'latest',
	parserOptions: {
		project: ['./tsconfig.json'],
		extraFileExtensions: ['.json'],
	},
};

module.exports = [
	{ ignores: ['**/dist/**'] },
	n8nCommunityNodes.configs.recommended,
	{
		files: ['package.json'],
		languageOptions,
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.community.rules,
			'n8n-nodes-base/community-package-json-name-still-default': 'off',
		},
	},
	{
		files: ['credentials/**/*.ts'],
		languageOptions,
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		languageOptions,
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.nodes.rules,
			'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
			'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
			'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
			// Superseded by @n8n/community-nodes/node-connection-type-literal, which wants NodeConnectionTypes.Main
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
		},
	},
];
