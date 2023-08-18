const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const moviesFolderPath = '/media_storage/Documentaries';
const videoExtensions = ['mov', 'mp4', 'avi', 'mkv'];

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

/**
 * Prompts the user with a question and returns their response.
 * @param {string} question - The question to display to the user.
 * @returns {Promise<string>} - The user's response.
 */
async function promptUser(question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

/**
 * Moves the contents of the subfolder to the main movies folder.
 */
async function moveSubfolderContentsToMainFolder() {
	try {
		const files = fs.readdirSync(moviesFolderPath);

		for (const file of files) {
			const currentPath = path.join(moviesFolderPath, file);
			if (!fs.statSync(currentPath).isDirectory()) continue;
			if (file === 'trickplay') continue;

			await processSubfolder(currentPath);
		}
	} catch (err) {
		console.error('Error reading movies folder:', err);
	}
}

/**
 * Processes each subfolder, moving relevant files.
 * @param {string} subfolderPath - Path to the subfolder being processed.
 */
async function processSubfolder(subfolderPath) {
	const trickplayFolderPath = path.join(subfolderPath, 'trickplay');

	await moveFilesToDestination(trickplayFolderPath, path.join(moviesFolderPath, 'trickplay'));
	console.log(`Moved trickplay files from ${trickplayFolderPath} to ${path.join(moviesFolderPath, 'trickplay')}`);

	// Remove the now-empty trickplay subfolder.
	fs.rmdirSync(trickplayFolderPath);
	console.log(`Removed empty trickplay folder: ${trickplayFolderPath}`);

	await moveFilesToDestination(subfolderPath, moviesFolderPath);
	console.log(`Moved files from ${subfolderPath} to ${moviesFolderPath}`);

	// Remove the processed subfolder.
	fs.rmdirSync(subfolderPath);
	console.log(`Removed empty subfolder: ${subfolderPath}`);
}

/**
 * Moves files from a source to a destination.
 * @param {string} source - Source path.
 * @param {string} destination - Destination path.
 */
async function moveFilesToDestination(source, destination) {
	const files = fs.readdirSync(source);
	for (const file of files) {
		const sourcePath = path.join(source, file);
		const destinationPath = path.join(destination, file);

		fs.renameSync(sourcePath, destinationPath);
		console.log(chalk.green(`Moved ${sourcePath} to ${destinationPath}`));
		/* const shouldProceed = await promptUser(`Move ${sourcePath} to ${destinationPath}? (yes/no)\n`);
		if (shouldProceed.toLowerCase() === 'y') {
			fs.renameSync(sourcePath, destinationPath);
			console.log(chalk.green(`Moved ${sourcePath} to ${destinationPath}`));
		} else {
			console.log(chalk.red(`Skipped moving ${sourcePath}`));
		} */
	}
}

/**
 * Reorganizes the main movies folder by creating subfolders for each movie and
 * moving associated files.
 */
async function reorganizeMoviesFolder() {
	try {
		const files = fs.readdirSync(moviesFolderPath);

		console.log(`Reorganizing ${moviesFolderPath} with ${files.length} files...`);
		for (const file of files) {
			const moviePath = path.join(moviesFolderPath, file);
			if (!fs.existsSync(moviePath)) continue;
			if (fs.statSync(moviePath).isDirectory()) continue;

			const movieExtension = file.substring(file.lastIndexOf('.') + 1);
			if (!videoExtensions.includes(movieExtension)) continue;

			await processMovieFile(file, moviePath, movieExtension);
			// await processMovieFileNewFormat(file, moviePath, movieExtension);
		}
	} catch (err) {
		console.error('Error reading movies folder:', err);
	}
}

/**
 * Processes individual movie files, renaming them and moving associated files.
 * @param {string} file - The movie file name.
 * @param {string} moviePath - Full path to the movie file.
 * @param {string} movieExtension - The movie file's extension.
 */
async function processMovieFile(file, moviePath, movieExtension) {
	const movieName = file.substring(0, file.lastIndexOf('.'));
	const [title, year] = movieName.split('-').map((item) => item.trim());

	if (!title || !year || isNaN(year)) {
		console.log(`Skipping ${moviePath} - Invalid format`);
		return;
	}

	const newFolderPath = createNewFolderPath(title, year);
	const newMoviePath = getNewMoviePath(newFolderPath, title, year, movieExtension);

	const shouldRename = await promptUser(`Rename ${moviePath} to ${newMoviePath}? (yes/no)\n`);
	if (shouldRename.toLowerCase() === 'y') {
		fs.renameSync(moviePath, newMoviePath);
		console.log(chalk.green(`Renamed ${moviePath} to ${newMoviePath}`));
	} else {
		console.log(chalk.red(`Skipped renaming ${moviePath}`));
	}

	await moveAssociatedFiles(movieName, newFolderPath, title, year);
	await moveTrickplayFiles(movieName, newFolderPath, title, year);
}

/**
 * Moves new format movie files not in a folder to a folder.
 * @param {string} file - The movie file name.
 * @param {string} moviePath - Full path to the movie file.
 * @param {string} movieExtension - The movie file's extension.
 */
async function processMovieFileNewFormat(file, moviePath, movieExtension) {
	const movieName = file.substring(0, file.lastIndexOf('.'));

	if (movieName.includes(' (') && movieName.includes(')')){
		const newFolderPath = createNewFolderPathNewFormat(movieName);
		const newMoviePath = getNewMoviePathNewFormat(newFolderPath, movieName, movieExtension);

		const shouldRename = await promptUser(`Rename ${moviePath} to ${newMoviePath}? (yes/no)\n`);
		if (shouldRename.toLowerCase() === 'y') {
			fs.renameSync(moviePath, newMoviePath);
			console.log(chalk.green(`Renamed ${moviePath} to ${newMoviePath}`));
		} else {
			console.log(chalk.red(`Skipped renaming ${moviePath}`));
		}

		await moveAssociatedFilesNewFormat(movieName, newFolderPath);
		await moveTrickplayFilesNewFormat(movieName, newFolderPath);
	}

	console.log(`Skipping ${moviePath} - Invalid format`);
}

/**
 * Creates the new folder path for the movie and returns it.
 * @param {string} movieName - Original name of the movie.
 * @returns {string} - New folder path.
 */
function createNewFolderPathNewFormat(movieName) {
	const newFolderPath = path.join(moviesFolderPath, movieName);
	if (!fs.existsSync(newFolderPath)) {
		fs.mkdirSync(newFolderPath);
	}
	return newFolderPath;
}

/**
 * Returns the new path for the movie.
 * @param {string} newFolderPath - Folder path to store the movie.
 * @param {string} movieName - Original name of the movie.
 * @param {string} movieExtension - Movie file extension.
 * @returns {string} - New path for the movie.
 */
function getNewMoviePathNewFormat(newFolderPath, movieName, movieExtension) {
	return path.join(newFolderPath, `${movieName}.${movieExtension}`);
}

/**
 * Moves files associated with a movie (e.g. subtitles, images) to its new location.
 * @param {string} movieName - Original name of the movie.
 * @param {string} newFolderPath - New path for the movie.
 */
async function moveAssociatedFilesNewFormat(movieName, newFolderPath) {
	const associatedFiles = fs.readdirSync(moviesFolderPath)
		.filter((associatedFile) => associatedFile.includes(movieName));

	for (const associatedFile of associatedFiles) {
		// skip directories
		if (fs.statSync(path.join(moviesFolderPath, associatedFile)).isDirectory()) continue;
		const associatedFilePath = path.join(moviesFolderPath, associatedFile);
		const newAssociatedFilePath = path.join(newFolderPath, associatedFile);

		fs.renameSync(associatedFilePath, newAssociatedFilePath);
		console.log(chalk.green(`Moved ${associatedFilePath} to ${newAssociatedFilePath}`));
		/* const shouldMoveAssociatedFile = await promptUser(`Move ${associatedFilePath} to ${newAssociatedFilePath}? (yes/no)\n`);
		if (shouldMoveAssociatedFile.toLowerCase() === 'y') {
			fs.renameSync(associatedFilePath, newAssociatedFilePath);
			console.log(chalk.green(`Moved ${associatedFilePath} to ${newAssociatedFilePath}`));
		} else {
			console.log(chalk.red(`Skipped moving ${associatedFilePath}`));
		} */
	}
}

/** 
 * Handle the movement of files from the main 'trickplay' folder to their respective sub-trickplay folders inside each movie folder.
 * @param {string} movieName - Original name of the movie.
 * @param {string} newFolderPath - New path for the movie.
 */
async function moveTrickplayFilesNewFormat(movieName, newFolderPath) {
	const trickplayMainFolderPath = path.join(moviesFolderPath, 'trickplay');
	const newTrickplayFolderPath = path.join(newFolderPath, 'trickplay');

	// Ensure the main trickplay folder exists
	if (!fs.existsSync(trickplayMainFolderPath)) {
		console.log(chalk.yellow('Main trickplay folder not found.'));
		return;
	}

	// Get all trickplay files associated with the movie
	const trickplayFiles = fs.readdirSync(trickplayMainFolderPath)
		.filter((trickplayFile) => trickplayFile.includes(movieName));

	for (const trickplayFile of trickplayFiles) {
		const trickplayFilePath = path.join(trickplayMainFolderPath, trickplayFile);
		const trickplayDestinationFilePath = path.join(newTrickplayFolderPath, trickplayFile);

		// Create trickplay folder inside movie folder if it doesn't exist
		if (!fs.existsSync(newTrickplayFolderPath)) {
			fs.mkdirSync(newTrickplayFolderPath);
		}

		fs.renameSync(trickplayFilePath, trickplayDestinationFilePath);
		console.log(chalk.green(`Moved ${trickplayFilePath} to ${trickplayDestinationFilePath}`));

		/* const shouldMoveTrickplayFile = await promptUser(`Move ${trickplayFilePath} to ${trickplayDestinationFilePath}? (yes/no)\n`);
		if (shouldMoveTrickplayFile.toLowerCase() === 'y') {
			fs.renameSync(trickplayFilePath, trickplayDestinationFilePath);
			console.log(chalk.green(`Moved ${trickplayFilePath} to ${trickplayDestinationFilePath}`));
		} else {
			console.log(chalk.red(`Skipped moving ${trickplayFilePath}`));
		} */
	}
}

/**
 * Creates the new folder path for the movie and returns it.
 * @param {string} title - Movie title.
 * @param {string} year - Movie year.
 * @returns {string} - New folder path.
 */
function createNewFolderPath(title, year) {
	const newFolderPath = path.join(moviesFolderPath, `${title} (${year})`);
	if (!fs.existsSync(newFolderPath)) {
		fs.mkdirSync(newFolderPath);
	}
	return newFolderPath;
}

/**
 * Returns the new path for the movie.
 * @param {string} newFolderPath - Folder path to store the movie.
 * @param {string} title - Movie title.
 * @param {string} year - Movie year.
 * @param {string} movieExtension - Movie file extension.
 * @returns {string} - New path for the movie.
 */
function getNewMoviePath(newFolderPath, title, year, movieExtension) {
	const newTitle = title.trim();
	return path.join(newFolderPath, `${newTitle} (${year}).${movieExtension}`);
}

/**
 * Moves files associated with a movie (e.g. subtitles, images) to its new location.
 * @param {string} movieName - Original name of the movie.
 * @param {string} newFolderPath - New path for the movie.
 * @param {string} title - Movie title.
 * @param {string} year - Movie year.
 */
async function moveAssociatedFiles(movieName, newFolderPath, title, year) {
	const associatedFiles = fs.readdirSync(moviesFolderPath)
		.filter((associatedFile) => associatedFile.includes(movieName));

	for (const associatedFile of associatedFiles) {
		const newAssociatedFileName = associatedFile.replace(movieName, `${title} (${year})`);
		const associatedFilePath = path.join(moviesFolderPath, associatedFile);
		const newAssociatedFilePath = path.join(newFolderPath, newAssociatedFileName);

		fs.renameSync(associatedFilePath, newAssociatedFilePath);
		console.log(chalk.green(`Moved ${associatedFilePath} to ${newAssociatedFilePath}`));
		/* const shouldMoveAssociatedFile = await promptUser(`Move ${associatedFilePath} to ${newAssociatedFilePath}? (yes/no)\n`);
		if (shouldMoveAssociatedFile.toLowerCase() === 'y') {
			fs.renameSync(associatedFilePath, newAssociatedFilePath);
			console.log(chalk.green(`Moved ${associatedFilePath} to ${newAssociatedFilePath}`));
		} else {
			console.log(chalk.red(`Skipped moving ${associatedFilePath}`));
		} */
	}
}

/** 
 * Handle the movement of files from the main 'trickplay' folder to their respective sub-trickplay folders inside each movie folder.
 * @param {string} movieName - Original name of the movie.
 * @param {string} newFolderPath - New path for the movie.
 * @param {string} title - Movie title.
 * @param {string} year - Movie year.
 */
async function moveTrickplayFiles(movieName, newFolderPath, title, year) {
	const trickplayMainFolderPath = path.join(moviesFolderPath, 'trickplay');
	const newTrickplayFolderPath = path.join(newFolderPath, 'trickplay');

	// Ensure the main trickplay folder exists
	if (!fs.existsSync(trickplayMainFolderPath)) {
		console.log(chalk.yellow('Main trickplay folder not found.'));
		return;
	}

	// Get all trickplay files associated with the movie
	const trickplayFiles = fs.readdirSync(trickplayMainFolderPath)
		.filter((trickplayFile) => trickplayFile.includes(movieName));

	for (const trickplayFile of trickplayFiles) {
		const trickplayFilePath = path.join(trickplayMainFolderPath, trickplayFile);
		const newTrickplayFileName = trickplayFile.replace(movieName, `${title} (${year})`);
		const trickplayDestinationFilePath = path.join(newTrickplayFolderPath, newTrickplayFileName);

		// Create trickplay folder inside movie folder if it doesn't exist
		if (!fs.existsSync(newTrickplayFolderPath)) {
			fs.mkdirSync(newTrickplayFolderPath);
			console.log(`Created new trickplay folder: ${newTrickplayFolderPath}`);
		}

		fs.renameSync(trickplayFilePath, trickplayDestinationFilePath);
		console.log(chalk.green(`Moved ${trickplayFilePath} to ${trickplayDestinationFilePath}`));

		/* const shouldMoveTrickplayFile = await promptUser(`Move ${trickplayFilePath} to ${trickplayDestinationFilePath}? (yes/no)\n`);
		if (shouldMoveTrickplayFile.toLowerCase() === 'y') {
			fs.renameSync(trickplayFilePath, trickplayDestinationFilePath);
			console.log(chalk.green(`Moved ${trickplayFilePath} to ${trickplayDestinationFilePath}`));
		} else {
			console.log(chalk.red(`Skipped moving ${trickplayFilePath}`));
		} */
	}
}

(async () => {
  // await moveSubfolderContentsToMainFolder();
  await reorganizeMoviesFolder();
  rl.close();
})();

module.exports = {
	moveSubfolderContentsToMainFolder,
	reorganizeMoviesFolder
}