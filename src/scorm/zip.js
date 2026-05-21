/**
 * src/scorm/zip.js
 *
 * Purpose:
 * Provides a tiny dependency-free ZIP writer for browser downloads.
 *
 * Intent:
 * This file is responsible for ZIP headers, CRC32 checksums, and final blob
 * creation because the SCORM export demo needs to produce a real package
 * without adding a build step or external compression library.
 *
 * Role in the app:
 * - Called by src/scorm/exporter.js after package files are collected.
 * - Receives file path/content objects and returns an application/zip Blob.
 * - Does not know about D2L, authoring, or SCORM semantics; it only packages bytes.
 */

/**
 * Creates a no-compression ZIP blob from named files.
 *
 * @param {Array<{path: string, content: string|Uint8Array}>} files - Files to place in the zip.
 * @returns {Blob} Downloadable application/zip Blob.
 *
 * This function does not mutate the input files. It supports SCORM export by
 * turning generated manifests, JSON, runtime assets, and source files into one package.
 */
export function createZipBlob(files) {
	const encoder = new TextEncoder();
	const now = new Date();
	const { dosDate, dosTime } = getDosDateTime(now);
	const localParts = [];
	const centralParts = [];
	let offset = 0;

	files.forEach((file) => {
		const nameBytes = encoder.encode(file.path);
		const dataBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
		const crc = crc32(dataBytes);
		const localHeader = createLocalFileHeader({ nameBytes, dataBytes, crc, dosDate, dosTime });
		localParts.push(localHeader, dataBytes);
		centralParts.push(createCentralDirectoryHeader({ nameBytes, dataBytes, crc, dosDate, dosTime, offset }));
		offset += localHeader.length + dataBytes.length;
	});

	const centralDirectoryOffset = offset;
	const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
	const endRecord = createEndRecord({
		fileCount: files.length,
		centralDirectorySize,
		centralDirectoryOffset,
	});
	const zipBytes = concatUint8Arrays([...localParts, ...centralParts, endRecord]);
	return new Blob([zipBytes], { type: "application/zip" });
}

/**
 * Creates a ZIP local file header for one file.
 *
 * @param {object} options - Header values.
 * @param {Uint8Array} options.nameBytes - UTF-8 encoded path.
 * @param {Uint8Array} options.dataBytes - File data.
 * @param {number} options.crc - CRC32 checksum.
 * @param {number} options.dosDate - DOS date value.
 * @param {number} options.dosTime - DOS time value.
 * @returns {Uint8Array} Local file header bytes.
 */
function createLocalFileHeader({ nameBytes, dataBytes, crc, dosDate, dosTime }) {
	const header = new Uint8Array(30 + nameBytes.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x04034b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, 0, true);
	view.setUint16(10, dosTime, true);
	view.setUint16(12, dosDate, true);
	view.setUint32(14, crc, true);
	view.setUint32(18, dataBytes.length, true);
	view.setUint32(22, dataBytes.length, true);
	view.setUint16(26, nameBytes.length, true);
	view.setUint16(28, 0, true);
	header.set(nameBytes, 30);
	return header;
}

/**
 * Creates a ZIP central directory header for one file.
 *
 * @param {object} options - Header values.
 * @param {Uint8Array} options.nameBytes - UTF-8 encoded path.
 * @param {Uint8Array} options.dataBytes - File data.
 * @param {number} options.crc - CRC32 checksum.
 * @param {number} options.dosDate - DOS date value.
 * @param {number} options.dosTime - DOS time value.
 * @param {number} options.offset - Byte offset of the matching local header.
 * @returns {Uint8Array} Central directory header bytes.
 */
function createCentralDirectoryHeader({ nameBytes, dataBytes, crc, dosDate, dosTime, offset }) {
	const header = new Uint8Array(46 + nameBytes.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x02014b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 20, true);
	view.setUint16(8, 0, true);
	view.setUint16(10, 0, true);
	view.setUint16(12, dosTime, true);
	view.setUint16(14, dosDate, true);
	view.setUint32(16, crc, true);
	view.setUint32(20, dataBytes.length, true);
	view.setUint32(24, dataBytes.length, true);
	view.setUint16(28, nameBytes.length, true);
	view.setUint16(30, 0, true);
	view.setUint16(32, 0, true);
	view.setUint16(34, 0, true);
	view.setUint16(36, 0, true);
	view.setUint32(38, 0, true);
	view.setUint32(42, offset, true);
	header.set(nameBytes, 46);
	return header;
}

/**
 * Creates the final ZIP end-of-central-directory record.
 *
 * @param {object} options - End record metadata.
 * @param {number} options.fileCount - Number of files in the archive.
 * @param {number} options.centralDirectorySize - Byte length of the central directory.
 * @param {number} options.centralDirectoryOffset - Starting byte offset of the central directory.
 * @returns {Uint8Array} End record bytes.
 */
function createEndRecord({ fileCount, centralDirectorySize, centralDirectoryOffset }) {
	const record = new Uint8Array(22);
	const view = new DataView(record.buffer);
	view.setUint32(0, 0x06054b50, true);
	view.setUint16(4, 0, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, fileCount, true);
	view.setUint16(10, fileCount, true);
	view.setUint32(12, centralDirectorySize, true);
	view.setUint32(16, centralDirectoryOffset, true);
	view.setUint16(20, 0, true);
	return record;
}

/**
 * Concatenates byte arrays into one archive byte buffer.
 *
 * @param {Uint8Array[]} parts - Ordered byte chunks.
 * @returns {Uint8Array} Combined byte array.
 */
function concatUint8Arrays(parts) {
	const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
	const output = new Uint8Array(totalLength);
	let offset = 0;
	parts.forEach((part) => {
		output.set(part, offset);
		offset += part.length;
	});
	return output;
}

/**
 * Converts a Date into ZIP-compatible DOS date/time fields.
 *
 * @param {Date} date - Current timestamp.
 * @returns {{dosDate: number, dosTime: number}} DOS date/time values.
 */
function getDosDateTime(date) {
	const year = Math.max(date.getFullYear(), 1980);
	return {
		dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
		dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
	};
}

let crcTable;

/**
 * Calculates a CRC32 checksum for file data.
 *
 * @param {Uint8Array} bytes - File bytes.
 * @returns {number} Unsigned CRC32 checksum.
 */
function crc32(bytes) {
	if (!crcTable) crcTable = createCrcTable();
	let crc = 0xffffffff;
	for (let index = 0; index < bytes.length; index += 1) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds the lookup table used by crc32().
 *
 * @returns {Uint32Array} CRC32 lookup table.
 */
function createCrcTable() {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index += 1) {
		let value = index;
		for (let bit = 0; bit < 8; bit += 1) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		table[index] = value >>> 0;
	}
	return table;
}
