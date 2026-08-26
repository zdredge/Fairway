import { readFileSync } from 'node:fs';
import sharp from 'sharp';

// Rasterize the source SVG into the square PNG icons the manifest needs.
// Run with `npm run gen-icons` whenever static/icon.svg changes.
const svg = readFileSync('static/icon.svg');

for (const size of [192, 512]) {
	const out = `static/icon-${size}.png`;
	await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out);
	console.log(`wrote ${out} (${size}x${size})`);
}
