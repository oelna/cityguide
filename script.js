
const tags = document.querySelectorAll('.tags a');
const geo = document.querySelectorAll('.geo');
const places = document.querySelectorAll('.entries > li');

for (const place of places) {
	const detailElement = place.querySelector('details');
	detailElement.addEventListener('toggle', async function (event) {
		const distanceElement = event.target.querySelector('.distance');
		if (event.target.open) {
			if (distanceElement.textContent == '0') {
				// first time load
				// console.log('ist offen, first time');
				const success = await loadDistance(detailElement);
				if (!success) console.error('Could not get distance for', place);
			} else {
				// console.log('ist offen, subsequent time');
			}
		} else {
			// console.log('ist zu');
		}
	})
}

for (const tag of tags) {
	tag.addEventListener('click', function (event) {
		event.preventDefault();

		console.log(event.target.innerText);
	});
}

function getLocation () {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function (position) { // Success function
				// document.documentElement.setAttribute('data-home-lat', position.coords.latitude);
				// document.documentElement.setAttribute('data-home-lng', position.coords.longitude);

				console.log('Setting user location … success!');
			},
			function (error) { // Error function
				console.log('Error getting user location', error);
			}, 
			{ // options
				enableHighAccuracy: false, // true?
				timeout: 10000,
				maximumAge: 0
			});
	} else { 
		console.error('Geolocation is not supported by this browser.');
	}
}

async function loadDistance (placeElement) {
	if (!placeElement) return false;

	const address = placeElement.querySelector('.address a');
	const addressText = address.innerHTML.replaceAll('<br>', ',');
	let result;

	console.log('loading distance to', addressText);
	let currentLat = address.closest('.address').getAttribute('data-lat');
	let currentLng = address.closest('.address').getAttribute('data-lng');
	if (currentLat == '0' || currentLat == '') currentLat = null;
	if (currentLng == '0' || currentLng == '') currentLng = null;
	// console.log(currentLat, currentLng);

	if (!currentLat && !currentLng) {
		const url = 'https://nominatim.openstreetmap.org/search?format=json&q='+addressText.replaceAll(' ', '+');
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}

			result = await response.json();
			// console.log(result);
		} catch (error) {
			console.error(error);
			return false;
		}
	} else {
		console.log('using stored lat/lng');
		result = [
			{
				'lat': currentLat,
				'lon': currentLng
			}
		];
	}

	if (result.length > 0) {
		const homeLat = document.documentElement.getAttribute('data-home-lat');
		const homeLng = document.documentElement.getAttribute('data-home-lng');

		// preserve latlng as attributes
		address.closest('.address').setAttribute('data-lat', result[0].lat);
		address.closest('.address').setAttribute('data-lng', result[0].lon);

		const distance = getDistance(homeLat, homeLng, result[0].lat, result[0].lon);
		const roundedDistance = Math.round((distance + Number.EPSILON) * 10) / 10;
		const niceDistance = formatDistance(roundedDistance * 1000);
		// console.log(niceDistance);

		const distanceElement = placeElement.querySelector('.distance');
		distanceElement.innerText = niceDistance;

		address.setAttribute('href', 'http://maps.apple.com/?q='+result[0].lat+','+result[0].lon);

		return true;
	} else return false;
}

function getDistance (lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the Earth in kilometers
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a =
	Math.sin(dLat / 2) * Math.sin(dLat / 2) +
	Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
	Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c; // Distance in kilometers
	return distance;
}

function formatDistance (meters, decimals=2) {
	if (!+meters) return '0 Meter';

	const k = 1000;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['m', 'km'];

	const i = Math.floor(Math.log(meters) / Math.log(k));

	return `${parseFloat((meters / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
}
