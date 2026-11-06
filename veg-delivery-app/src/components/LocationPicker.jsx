import {
  GoogleMap,
  Marker,
  LoadScript,
} from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";

const libraries = ["places"];
const containerStyle = { width: "100%", height: "250px" };
const center = { lat: 17.385, lng: 78.4867 };

export default function LocationPicker({ onLocationSelect }) {
  const sessionTokenRef = useRef(null);
  const [position, setPosition] = useState(center);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualCoordinates, setShowManualCoordinates] = useState(false);
  const [error, setError] = useState("");

  const selectLocation = (location) => {
    setPosition({ lat: location.lat, lng: location.lng });
    setLatitude(String(location.lat));
    setLongitude(String(location.lng));
    onLocationSelect(location);
    setError("");
  };

  useEffect(() => {
    if (!mapsReady || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const places = window.google?.maps?.places;
      if (!places?.AutocompleteSuggestion) {
        setError("Address suggestions are unavailable. Use GPS, move the map pin, or enter coordinates manually.");
        setShowManualCoordinates(true);
        return;
      }

      setIsSearching(true);
      try {
        if (!sessionTokenRef.current && places.AutocompleteSessionToken) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }
        const response =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: searchQuery.trim(),
            origin: position,
            region: "in",
            ...(sessionTokenRef.current
              ? { sessionToken: sessionTokenRef.current }
              : {}),
          });
        if (active) {
          setSuggestions(response.suggestions || []);
          setError("");
        }
      } catch (suggestionError) {
        console.error("Address suggestions failed:", suggestionError);
        if (active) {
          setSuggestions([]);
          setShowManualCoordinates(true);
          setError("Address suggestions are unavailable. Use GPS, move the map pin, or enter coordinates manually.");
        }
      } finally {
        if (active) setIsSearching(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mapsReady, position, searchQuery]);

  const selectSuggestion = async (prediction) => {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["location", "formattedAddress", "displayName"],
      });
      if (!place.location) {
        throw new Error("The selected address did not include map coordinates.");
      }
      const location = {
        lat: Number(place.location.lat()),
        lng: Number(place.location.lng()),
        address:
          place.formattedAddress ||
          place.displayName ||
          prediction.text?.toString() ||
          "",
      };
      if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
        throw new Error("The selected address did not include valid coordinates.");
      }

      setAddress(location.address);
      setSearchQuery("");
      setSuggestions([]);
      sessionTokenRef.current = null;
      selectLocation(location);
    } catch (selectionError) {
      console.error("Unable to select delivery address:", selectionError);
      setError("We couldn't verify that address. Choose another suggestion or enter coordinates manually.");
      setShowManualCoordinates(true);
    }
  };

  const currentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser. Search for your address instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = Number(coords.latitude);
        const lng = Number(coords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
          setError("We couldn't verify your current location. Search for your address instead.");
          return;
        }

        const currentAddress = "Current location";
        setAddress(currentAddress);
        setSearchQuery("");
        selectLocation({ lat, lng, address: currentAddress });
      },
      (locationError) => {
        if (locationError.code === 1) {
          setError("Location permission was denied. Search for your address or allow location access.");
        } else if (locationError.code === 2) {
          setError("Your location is unavailable. Search for your address instead.");
        } else {
          setError("The location request timed out. Try again or search for your address.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const selectDraggedPosition = (event) => {
    if (!event.latLng) return;
    const location = {
      lat: Number(event.latLng.lat()),
      lng: Number(event.latLng.lng()),
      address,
    };
    setSearchQuery("");
    setSuggestions([]);
    selectLocation(location);
  };

  const selectManualCoordinates = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !address.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      (lat === 0 && lng === 0)
    ) {
      setError("Enter an address plus valid latitude and longitude coordinates.");
      return;
    }

    setSearchQuery("");
    setSuggestions([]);
    selectLocation({ lat, lng, address: address.trim() });
  };

  return (
    <div className="space-y-3">
      <label htmlFor="delivery-address" className="block text-sm font-semibold text-gray-800">
        Search for a delivery address
      </label>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        onLoad={() => setMapsReady(true)}
        onError={() => {
          setMapsReady(false);
          setShowManualCoordinates(true);
          setError("The address map couldn't be loaded. You can enter an address and coordinates manually.");
        }}
      >
        <input
          id="delivery-address"
          type="text"
          placeholder="Type an address or landmark"
          value={address}
          onChange={(event) => {
            const value = event.target.value;
            setAddress(value);
            setSearchQuery(value);
            setLatitude("");
            setLongitude("");
            setError("");
            setShowManualCoordinates(false);
            onLocationSelect(null);
          }}
          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
          autoComplete="street-address"
        />
        {(suggestions.length > 0 || isSearching) && (
          <div
            role="listbox"
            aria-label="Address suggestions"
            className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            {isSearching && (
              <p className="px-3 py-2 text-sm text-gray-600">Searching addresses…</p>
            )}
            {suggestions.map((suggestion, index) => {
              const prediction = suggestion.placePrediction;
              if (!prediction) return null;
              return (
                <button
                  key={prediction.placeId || index}
                  type="button"
                  role="option"
                  onClick={() => selectSuggestion(prediction)}
                  className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-800 last:border-0 hover:bg-emerald-50"
                >
                  {prediction.text?.toString() || "Select this address"}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={currentLocation}
          className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Use Current Location
        </button>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={position}
          zoom={15}
          options={{ streetViewControl: false, mapTypeControl: false }}
        >
          <Marker
            position={position}
            draggable
            onDragEnd={selectDraggedPosition}
          />
        </GoogleMap>
      </LoadScript>
      <p className="text-xs text-gray-600">
        Choose a suggested address, move the map pin, or use GPS. Confirm the location before placing your order.
      </p>
      <button
        type="button"
        onClick={() => setShowManualCoordinates((show) => !show)}
        className="text-sm font-semibold text-emerald-800 underline underline-offset-2"
      >
        {showManualCoordinates ? "Hide manual coordinates" : "Enter coordinates manually"}
      </button>
      {showManualCoordinates && (
        <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            Enter an address or landmark above and its coordinates to use manual location entry.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-gray-700">
              Latitude
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                className="mt-1 w-full border border-gray-300 bg-white p-2 text-sm text-gray-900"
              />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Longitude
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                className="mt-1 w-full border border-gray-300 bg-white p-2 text-sm text-gray-900"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={selectManualCoordinates}
            className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Select this manual location
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
