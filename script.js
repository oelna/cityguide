
const entriesContainer = document.querySelector('main section ul.entries');

const tags = document.querySelectorAll('.tags a');
const geo = document.querySelectorAll('.geo');

let entries;

try {
	const response = await fetch('./entries.json');
	entries = await response.json();
} catch (e) {
	console.error('Error', e);
}

if (entries) {
	console.log(entries);

	for (const entry of entries) {
		if (entry?.visible === false) continue;

		const li = document.createElement('li');
		li.setAttribute('data-id', 1);

		const details = document.createElement('details');
		const summary = document.createElement('summary');
		const h3 = document.createElement('h3');
		h3.textContent = entry.title;

		const expanded = document.createElement('div');
		expanded.classList.add('entry-expanded');

		const tags = document.createElement('ul');
		tags.classList.add('tags');
		entry.tags.forEach(function (tag, i) {
			tags.insertAdjacentHTML('beforeend', `<li><a class="${tag}" href="#${tag}">${tag}</a></li>`)
		});

		const geo = document.createElement('div');
		geo.classList.add('geo');
		const address = document.createElement('div');
		address.classList.add('address');
		address.setAttribute('data-lat', entry.lat);
		address.setAttribute('data-lng', entry.lng);
		const maplink = document.createElement('a');
		maplink.setAttribute('href', `http://maps.apple.com/?q=${entry.lat},${entry.lng}`);
		maplink.insertAdjacentHTML('beforeend', entry.address.replaceAll('\n', '<br>'));
		const distance = document.createElement('div');
		distance.classList.add('distance');
		distance.textContent = '0';

		const desc = document.createElement('div');
		desc.classList.add('description');
		desc.insertAdjacentHTML('beforeend', entry.description.replaceAll('\n', '<br>'));

		// nest elements
		li.appendChild(details);
		details.appendChild(summary);
		details.appendChild(expanded);
		summary.appendChild(h3);
		expanded.appendChild(tags);
		expanded.appendChild(geo);
		expanded.appendChild(desc);
		geo.appendChild(address);
		geo.appendChild(distance);
		address.appendChild(maplink);

		// append to DOM
		entriesContainer.appendChild(li);
	}
}

document.addEventListener('pointerup', function (event) {
	if (event.target.closest('.tags > li')) {
		// click on a tag
		event.preventDefault();
		console.log('click on a tag', event.target.textContent);
	}
});

document.addEventListener('toggle', async function (event) {
	// click on a details element, aka. entry
	if (event.target.tagName === 'DETAILS' && event.target.closest('li[data-id]')) {
		const distanceElement = event.target.querySelector('.distance');
		if (event.target.open) {
			if (distanceElement.textContent == '0') {
				// first time load
				const success = await loadDistance(event.target);
				if (!success) console.error('Could not get distance for', place);
			} else {
				// console.log('ist offen, subsequent time');
			}
		} else {
			// console.log('ist zu');
		}
	}
}, true);

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

	// https://nominatim.org/release-docs/develop/api/Search/
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
