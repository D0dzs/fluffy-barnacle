#!/usr/bin/env node

/**
 * Script to fetch Hungarian railway (MÁV) real-time vehicle positions
 * Updated for edge/serverless environments using fetch
 */

const fs = require('node:fs');
const path = require('node:path');

const outputDir = 'public';

/**
 * Fetch train position data from MÁV API using fetch
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

	const query = `{vehiclePositions(swLat: 45.45705023932743,swLon: 15.663443499528626,neLat: 48.768228505564224,neLon: 22.56329116419002,modes: [RAIL,RAIL_REPLACEMENT_BUS,SUBURBAN_RAILWAY,TRAMTRAIN,COACH]) { vehicleId lat lon heading label lastUpdated speed stopRelationship { status stop { gtfsId name } arrivalTime departureTime } trip { id gtfsId routeShortName tripHeadsign tripShortName route { mode shortName longName textColor color } pattern { id } } prevOrCurrentStop { scheduledArrival realtimeArrival arrivalDelay scheduledDeparture realtimeDeparture departureDelay } } }`;

	const payload = {
		query: query,
		variables: {},
	};

	try {
		console.log('🌐 Making API request...');

		const response = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.log(`❌ HTTP error: ${response.status} ${response.statusText}`);
			return null;
		}

		const jsonData = await response.json();

		// Validate GraphQL response structure
		if (jsonData.errors) {
			console.log(`❌ GraphQL API returned errors: ${JSON.stringify(jsonData.errors)}`);
			return null;
		}

		if (!jsonData.data) {
			console.log("❌ Invalid API response: missing 'data' field");
			console.log(`🔍 Response keys: ${Object.keys(jsonData)}`);
			return null;
		}

		if (!jsonData.data.vehiclePositions) {
			console.log("❌ Invalid API response: missing 'vehiclePositions' field");
			console.log(`🔍 Data keys: ${Object.keys(jsonData.data)}`);
			return null;
		}

		const vehicles = jsonData.data.vehiclePositions;
		if (!Array.isArray(vehicles)) {
			console.log(`❌ Invalid vehiclePositions format: expected array, got ${typeof vehicles}`);
			return null;
		}

		console.log(`✅ API response validated: ${vehicles.length} vehicles found`);
		return jsonData;
	} catch (error) {
		console.log(`❌ Network error fetching data: ${error.message}`);
		return null;
	}
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
		// Ensure output directory exists
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Check if file exists before writing
		const outputPath = path.join(outputDir, filename);
		const fileExists = fs.existsSync(outputPath);
		console.log(`📁 File ${filename} ${fileExists ? 'exists' : 'does not exist'} before writing`);

		fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), { encoding: 'utf-8' });

		// Check file after writing
		if (fs.existsSync(outputPath)) {
			const stats = fs.statSync(outputPath);
			const fileSize = stats.size;
			console.log(`✅ Successfully saved ${outputData.metadata.vehicle_count} vehicles to ${filename} (${fileSize} bytes)`);
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
		return;
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
		return;
	}

	console.log('🎉 Data fetch and save completed successfully');

	// Final file check for debugging
	const finalPath = path.join(outputDir, 'train.json5');
	if (!fs.existsSync(finalPath)) {
		console.log('❌ Warning: train.json5 does not exist after completion!');
	}
}

// Run the main function if this file is executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error('❌ Unhandled error:', error.message);
		console.error(error.stack);
	});
}

// Export functions for potential module use
module.exports = {
	main,
};
