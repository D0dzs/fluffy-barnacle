#!/usr/bin/env node

/**
 * Script to fetch Hungarian railway (MÁV) real-time vehicle positions
 * and save them to a JSON5 file for GitHub access.
 */

const zlib = require('node:zlib');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = 'public';

/**
 * Fetch train position data from MÁV API
 */
async function fetchTrainData() {
	const url = 'https://emma.mav.hu/otp2-backend/otp/routers/default/index/graphql';

	const headers = {
		Host: 'emma.mav.hu',
		'Content-Type': 'application/json',
		Accept: '*/*',
		Origin: 'https://emma.mav.hu',
		Referer: 'https://emma.mav.hu/',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
		'Accept-Language': 'en-US,en;q=0.9',
		'Accept-Encoding': 'gzip, deflate, br',
		'Sec-Fetch-Site': 'same-origin',
		'Sec-Fetch-Mode': 'cors',
		'Sec-Fetch-Dest': 'empty',
		'Sec-Ch-Ua': '"Not)A;Brand";v="8", "Chromium";v="138"',
		'Sec-Ch-Ua-Mobile': '?0',
		'Sec-Ch-Ua-Platform': '"Windows"',
		Connection: 'keep-alive',
	};

	const query = `
     {
         vehiclePositions(
             swLat: 45.45705023932743,
             swLon: 15.663443499528626,
             neLat: 48.768228505564224,
             neLon: 22.56329116419002,
             modes: [RAIL,RAIL_REPLACEMENT_BUS,SUBURBAN_RAILWAY,TRAMTRAIN,COACH]
         ) {
             vehicleId
             lat
             lon
             heading
             label
             lastUpdated
             speed
             stopRelationship {
                 status
                 stop {
                     gtfsId
                     name
                 }
                 arrivalTime
                 departureTime
             }
             trip {
                 id
                 gtfsId
                 routeShortName
                 tripHeadsign
                 tripShortName
                 route {
                     mode
                     shortName
                     longName
                     textColor
                     color
                 }
                 pattern {
                     id
                 }
             }
             prevOrCurrentStop {
                 scheduledArrival
                 realtimeArrival
                 arrivalDelay
                 scheduledDeparture
                 realtimeDeparture
                 departureDelay
             }
         }
     }
     `;

	const payload = {
		query: query,
		variables: {},
	};

	return new Promise((resolve) => {
		try {
			const postData = JSON.stringify(payload);
			const urlObj = new URL(url);

			const options = {
				hostname: urlObj.hostname,
				path: urlObj.pathname,
				method: 'POST',
				headers: {
					...headers,
					'Content-Length': Buffer.byteLength(postData),
				},
				timeout: 30000,
			};

			const req = https.request(options, (res) => {
				let stream = res;
				const encoding = res.headers['content-encoding'];

				// Handle compressed responses
				if (encoding === 'gzip') {
					stream = res.pipe(zlib.createGunzip());
				} else if (encoding === 'deflate') {
					stream = res.pipe(zlib.createInflate());
				} else if (encoding === 'br') {
					stream = res.pipe(zlib.createBrotliDecompress());
				}

				let data = '';

				stream.on('data', (chunk) => {
					data += chunk;
				});

				stream.on('end', () => {
					try {
						if (res.statusCode !== 200) {
							console.log(`❌ HTTP error: ${res.statusCode} ${res.statusMessage}`);
							resolve(null);
							return;
						}

						// Parse JSON response
						const jsonData = JSON.parse(data);

						// Validate GraphQL response structure
						if (jsonData.errors) {
							console.log(`❌ GraphQL API returned errors: ${JSON.stringify(jsonData.errors)}`);
							resolve(null);
							return;
						}

						if (!jsonData.data) {
							console.log("❌ Invalid API response: missing 'data' field");
							console.log(`🔍 Response keys: ${Object.keys(jsonData)}`);
							resolve(null);
							return;
						}

						if (!jsonData.data.vehiclePositions) {
							console.log("❌ Invalid API response: missing 'vehiclePositions' field");
							console.log(`🔍 Data keys: ${Object.keys(jsonData.data)}`);
							resolve(null);
							return;
						}

						const vehicles = jsonData.data.vehiclePositions;
						if (!Array.isArray(vehicles)) {
							console.log(`❌ Invalid vehiclePositions format: expected array, got ${typeof vehicles}`);
							resolve(null);
							return;
						}

						console.log(`✅ API response validated: ${vehicles.length} vehicles found`);
						resolve(jsonData);
					} catch (error) {
						console.log(`❌ Invalid JSON response: ${error.message}`);
						resolve(null);
					}
				});

				stream.on('error', (error) => {
					console.log(`❌ Decompression error: ${error.message}`);
					resolve(null);
				});
			});

			req.on('error', (error) => {
				console.log(`❌ Network error fetching data: ${error.message}`);
				resolve(null);
			});

			req.on('timeout', () => {
				console.log('❌ Request timeout');
				req.destroy();
				resolve(null);
			});

			req.write(postData);
			req.end();
		} catch (error) {
			console.log(`❌ Unexpected error processing API request: ${error.message}`);
			resolve(null);
		}
	});
}

/**
 * Save data to JSON5 file with metadata
 * @param {Object|null} data - The data to save
 * @param {string} filename - The filename to save to
 * @returns {boolean} - Success status
 */
function saveToJson5(data, filename = 'train.json5') {
	if (data === null) {
		console.log('No data to save');
		return false;
	}

	// Add metadata
	const outputData = {
		metadata: {
			fetch_time: new Date().toISOString(),
			source: 'Hungarian Railway (MÁV) Real-time API',
			api_endpoint: 'https://emma.mav.hu/otp2-backend/otp/routers/default/index/graphql',
			description: 'Real-time positions of trains, trams, and buses in Hungary',
			vehicle_count: data.data?.vehiclePositions?.length || 0,
		},
		data: data,
	};

	try {
		// Check if file exists before writing
		const fileExists = fs.existsSync(filename);
		console.log(`📁 File ${filename} ${fileExists ? 'exists' : 'does not exist'} before writing`);

		const outputPath = path.join(outputDir, filename);
		fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), { encoding: 'utf-8' });

		// Check file after writing
		if (fs.existsSync(path.join(outputDir, filename))) {
			const stats = fs.statSync(path.join(outputDir, filename));
			const fileSize = stats.size;
			console.log(`✅ Successfully saved ${outputData.metadata.vehicle_count} vehicles to ${filename}`);
		} else {
			console.log(`❌ File ${filename} was not created!`);
			return false;
		}

		return true;
	} catch (error) {
		console.log(`❌ Error saving file: ${error}`);
		return false;
	}
}

/**
 * Main function
 */
async function main() {
	console.log(`🚂 Fetching train data at ${new Date().toISOString()}`);

	// Fetch data
	const data = await fetchTrainData();

	if (data === null) {
		console.log('❌ Failed to fetch data');
	}

	// Debug: Show what we got
	if (data.data?.vehiclePositions) {
		const vehicleCount = data.data.vehiclePositions.length;
		console.log(`✅ Successfully fetched data for ${vehicleCount} vehicles`);
		if (vehicleCount > 0) {
			console.log(`📍 Sample vehicle: ${data.data.vehiclePositions[0].label || 'Unknown'}`);
		}
	} else {
		console.log('⚠️ No vehicle positions in response');
		console.log(`🔍 Raw response keys: ${data ? Object.keys(data) : 'None'}`);
	}

	// Save to file
	console.log(`💾 Saving data to train.json5...`);
	const success = saveToJson5(data);

	if (!success) {
		console.log('Failed to save data');
	}

	console.log('🎉 Data fetch and save completed successfully');

	// Final file check for debugging
	if (!fs.existsSync(path.join(outputDir, 'train.json5'))) {
		console.log('❌ Warning: train.json5 does not exist after completion!');
	}
}

// Run the main function if this file is executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error('❌ Unhandled error:', error.message);
	});
}

// Export functions for potential module use
module.exports = {
	main,
};
