const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBHXjtkidSc1RQyiC4epPR6eg1nlzi4yp4';

let mapsScriptPromise = null;

export function loadGoogleMapsSDK() {
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Browser environment required'));
    }

    const scriptId = 'google-maps-sdk';
    if (document.getElementById(scriptId)) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          resolve(window.google.maps);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but window.google is undefined'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps SDK script'));
    };

    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

/**
 * Searches for real-time place/city suggestions using Google Places Autocomplete API.
 * Falls back gracefully to Google Geocoding API if AutocompleteService is initializing.
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  const input = query.trim();

  try {
    const googleMaps = await loadGoogleMapsSDK();
    if (googleMaps?.places?.AutocompleteService) {
      const service = new googleMaps.places.AutocompleteService();
      return new Promise((resolve) => {
        service.getPlacePredictions(
          {
            input,
            types: ['(cities)'],
            componentRestrictions: { country: 'in' },
          },
          (predictions, status) => {
            if (status === googleMaps.places.PlacesServiceStatus.OK && predictions) {
              resolve(
                predictions.map((p) => ({
                  placeId: p.place_id,
                  description: p.description,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || '',
                }))
              );
            } else {
              // Try broader search without country restriction
              service.getPlacePredictions(
                { input },
                (globalPreds, globalStatus) => {
                  if (globalStatus === googleMaps.places.PlacesServiceStatus.OK && globalPreds) {
                    resolve(
                      globalPreds.map((p) => ({
                        placeId: p.place_id,
                        description: p.description,
                        mainText: p.structured_formatting?.main_text || p.description,
                        secondaryText: p.structured_formatting?.secondary_text || '',
                      }))
                    );
                  } else {
                    resolve(fetchGeocodeFallback(input));
                  }
                }
              );
            }
          }
        );
      });
    }
  } catch (err) {
    console.warn('Google Places SDK autocomplete fallback:', err);
  }

  return fetchGeocodeFallback(input);
}

/**
 * Converts a Google Place ID or description to exact GPS coordinates ({ lat, lng, name, state }).
 */
export async function getCoordsForPlace(placeId, description) {
  try {
    const googleMaps = await loadGoogleMapsSDK();
    if (googleMaps?.Geocoder) {
      const geocoder = new googleMaps.Geocoder();
      return new Promise((resolve, reject) => {
        const queryObj = placeId ? { placeId } : { address: description };
        geocoder.geocode(queryObj, (results, status) => {
          if (status === googleMaps.GeocoderStatus.OK && results?.[0]) {
            const loc = results[0].geometry.location;
            const lat = Math.round(loc.lat() * 10000) / 10000;
            const lng = Math.round(loc.lng() * 10000) / 10000;
            const name =
              results[0].address_components?.find((c) => c.types.includes('locality'))?.long_name ||
              description.split(',')[0];
            const state =
              results[0].address_components?.find((c) =>
                c.types.includes('administrative_area_level_1')
              )?.long_name || '';

            resolve({ name, state, lat, lng, fullAddress: results[0].formatted_address });
          } else {
            reject(new Error(`Geocoding status: ${status}`));
          }
        });
      });
    }
  } catch (err) {
    console.warn('Geocoding SDK fallback:', err);
  }

  return fetchGeocodeDetailsDirect(description);
}

async function fetchGeocodeFallback(query) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${API_KEY}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      return data.results.slice(0, 5).map((r) => ({
        placeId: r.place_id,
        description: r.formatted_address,
        mainText: r.address_components?.[0]?.long_name || r.formatted_address,
        secondaryText: r.formatted_address,
      }));
    }
  } catch {}
  return [];
}

async function fetchGeocodeDetailsDirect(address) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );
  const data = await res.json();
  if (data.status === 'OK' && data.results?.[0]) {
    const loc = data.results[0].geometry.location;
    return {
      name: address.split(',')[0],
      state: '',
      lat: Math.round(loc.lat * 10000) / 10000,
      lng: Math.round(loc.lng * 10000) / 10000,
      fullAddress: data.results[0].formatted_address,
    };
  }
  throw new Error('Could not geocode location');
}

/**
 * Reverse geocodes latitude and longitude coordinates into the actual city/locality name.
 * e.g., (22.7196, 75.8577) -> "Indore, MP"
 */
export async function reverseGeocodeCoords(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) {
    return { name: 'Current Location', displayName: 'Current Location', lat, lng, isGps: true };
  }

  try {
    const googleMaps = await loadGoogleMapsSDK();
    if (googleMaps?.Geocoder) {
      const geocoder = new googleMaps.Geocoder();
      return new Promise((resolve) => {
        geocoder.geocode({ location: { lat: nLat, lng: nLng } }, (results, status) => {
          if (status === googleMaps.GeocoderStatus.OK && results?.[0]) {
            const localityComp =
              results[0].address_components?.find((c) => c.types.includes('locality')) ||
              results[0].address_components?.find((c) => c.types.includes('sublocality')) ||
              results[0].address_components?.find((c) => c.types.includes('administrative_area_level_2'));
            const stateComp = results[0].address_components?.find((c) =>
              c.types.includes('administrative_area_level_1')
            );

            const cityName = localityComp?.long_name || localityComp?.short_name || 'Your Area';
            const stateName = stateComp?.short_name || stateComp?.long_name || '';

            resolve({
              name: cityName,
              displayName: `${cityName}${stateName ? `, ${stateName}` : ''}`,
              state: stateName,
              lat: nLat,
              lng: nLng,
              isGps: true,
            });
          } else {
            resolve(fetchReverseGeocodeFallback(nLat, nLng));
          }
        });
      });
    }
  } catch (err) {
    console.warn('Reverse geocoding SDK fallback:', err);
  }

  return fetchReverseGeocodeFallback(nLat, nLng);
}

async function fetchReverseGeocodeFallback(lat, lng) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const localityComp =
        data.results[0].address_components?.find((c) => c.types.includes('locality')) ||
        data.results[0].address_components?.find((c) => c.types.includes('sublocality')) ||
        data.results[0].address_components?.find((c) => c.types.includes('administrative_area_level_2'));
      const stateComp = data.results[0].address_components?.find((c) =>
        c.types.includes('administrative_area_level_1')
      );

      const cityName = localityComp?.long_name || 'Your Area';
      const stateName = stateComp?.short_name || '';
      return {
        name: cityName,
        displayName: `${cityName}${stateName ? `, ${stateName}` : ''}`,
        state: stateName,
        lat,
        lng,
        isGps: true,
      };
    }
  } catch {}

  return {
    name: 'Current Location',
    displayName: 'Current Location',
    state: '',
    lat,
    lng,
    isGps: true,
  };
}

