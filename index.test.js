const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const {
	moveSubfolderContentsToMainFolder,
	reorganizeMoviesFolder
} = require('./index');

function setupMockEnvironment() {
	mock({
		'Movies': {
			'10 Minutes Gone - 2019.mp4': 'movie content',
			'10 Minutes Gone - 2019.nfo': 'info content',
			'10 Minutes Gone - 2019-backdrop.jpg': 'image content',

			'12 Years a Slave - 2013.mp4': 'movie content',
			'12 Years a Slave - 2013.nfo': 'info content',
			'12 Years a Slave - 2013-backdrop.jpg': 'image content',
			'12 Years a Slave - 2013-logo.png': 'image content',

			'trickplay': {
				'10 Minutes Gone - 2019-320.bif': 'thumbnail content',
				'10 Minutes Gone - 2019-manifest.json': 'info',

				'12 Years a Slave - 2013.bif': 'thumbnail content',
				'12 Years a Slave - 2013.json': 'info'
			},

			'Ace Ventura': {
				'Ace Ventura： Pet Detective - 1994.mp4': 'movie content', // the special colon is a "hack" some of my movies use
				'Ace Ventura： Pet Detective - 1994.nfo': 'info content',
				'Ace Ventura： Pet Detective - 1994-backdrop.jpg': 'image content',
				'trickplay': {
					'Ace Ventura： Pet Detective - 1994-320.bif': 'thumbnail content',
					'Ace Ventura： Pet Detective - 1994-manifest.json': 'info',
				}
			}
		}
	});
}

function readEntireMockedFS(basePath = 'Movies/') {
	let structure = {};

	const items = fs.readdirSync(basePath);
	for (const item of items) {
		const itemPath = path.join(basePath, item);
		const stats = fs.statSync(itemPath);

		if (stats.isDirectory()) {
			structure[item] = readEntireMockedFS(itemPath); // Recursive call for directories
		} else {
			structure[item] = fs.readFileSync(itemPath, 'utf8'); // Read file content
		}
	}

	return structure;
}

(async () => {
	setupMockEnvironment();

	const mockBefore = readEntireMockedFS();
	console.log("Mock FS - Before:");
	console.dir(mockBefore, {
		depth: null,
		colors: true
	});

	// Run main script functions
	await moveSubfolderContentsToMainFolder();
	await reorganizeMoviesFolder();

	console.log("Mock FS - Before:");
	console.dir(mockBefore, {
		depth: null,
		colors: true
	});
	console.log("\nMock FS - After:");
	console.dir(readEntireMockedFS(), {
		depth: null,
		colors: true
	});

	process.exit(1);
})();