const n8nNodesBase = require('eslint-plugin-n8n-nodes-base');
const baseConfig = require('./eslint.config.js');

module.exports = [
	...baseConfig,
	{
		files: ['package.json'],
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			'n8n-nodes-base/community-package-json-name-still-default': 'error',
		},
	},
];
