// tsc only emits JavaScript, so the node and credential icons are copied next to it.
const { cpSync } = require('node:fs');

const isIconOrDirectory = (source) => !/\.\w+$/.test(source) || /\.(png|svg)$/.test(source);

for (const directory of ['nodes', 'credentials']) {
	cpSync(directory, `dist/${directory}`, { recursive: true, filter: isIconOrDirectory });
}
