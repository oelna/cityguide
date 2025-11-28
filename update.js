
import entries from "./entries.json" with { type: "json" };

let changed = 0;

for (const entry of entries) {
	if (entry.address?.length > 0) {
		if (entry.lat == 0 && entry.lng == 0) {

			// locate address
			const addressText = entry.address.replaceAll("\n", ',');
			const url = 'https://nominatim.openstreetmap.org/search?format=json&q='+addressText.replaceAll(' ', '+');
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`Response status: ${response.status}`);
				}

				const result = await response.json();

				if (result.length > 1) {
					// console.log(result[0]?.lat, result[0]?.lon);
					entry.lat = (result[0]?.lat) ? parseFloat(result[0]?.lat) : 0.0;
					entry.lng = (result[0]?.lon) ? parseFloat(result[0]?.lon) : 0.0;

					changed += 1;
				}
				
			} catch (error) {
				console.error(error);
				Deno.exit(1);
			}
		}
	}
}

if (changed > 0) {
	Deno.writeTextFileSync("./entries.json", JSON.stringify(entries, null, "\t"));
}

// Deno.exit(0);
