import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  LoadScript,
} from "@react-google-maps/api";

import { useRef, useState } from "react";

const libraries = ["places"];

const containerStyle = {
  width: "100%",
  height: "350px",
};

const center = {
  lat: 17.385,
  lng: 78.4867,
};

export default function LocationPicker({
  onLocationSelect,
}) {
  const searchRef = useRef();

  const [position, setPosition] =
    useState(center);

  const [address, setAddress] =
    useState("");

  const currentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat =
          pos.coords.latitude;

        const lng =
          pos.coords.longitude;

        setPosition({
          lat,
          lng,
        });

        onLocationSelect({
          lat,
          lng,
          address,
        });
      }
    );
  };

  const onPlacesChanged = () => {
    const place =
      searchRef.current.getPlaces()[0];

    if (!place) return;

    const lat =
      place.geometry.location.lat();

    const lng =
      place.geometry.location.lng();

    setAddress(
      place.formatted_address
    );

    setPosition({
      lat,
      lng,
    });

    onLocationSelect({
      lat,
      lng,
      address:
        place.formatted_address,
    });
  };

  return (
    <LoadScript
      googleMapsApiKey="YOUR_GOOGLE_API_KEY"
      libraries={libraries}
    >
      <StandaloneSearchBox
        onLoad={(ref) =>
          (searchRef.current = ref)
        }
        onPlacesChanged={
          onPlacesChanged
        }
      >
        <input
          placeholder="Search your address..."
          className="w-full p-3 rounded-xl bg-gray-900 text-white mb-3"
        />
      </StandaloneSearchBox>

      <button
        onClick={currentLocation}
        className="bg-green-600 text-white px-4 py-2 rounded-lg mb-3"
      >
        Use Current Location
      </button>

      <GoogleMap
        mapContainerStyle={
          containerStyle
        }
        center={position}
        zoom={16}
      >
        <Marker
          position={position}
          draggable
          onDragEnd={(e) => {
            const lat =
              e.latLng.lat();

            const lng =
              e.latLng.lng();

            setPosition({
              lat,
              lng,
            });

            onLocationSelect({
              lat,
              lng,
              address,
            });
          }}
        />
      </GoogleMap>
    </LoadScript>
  );
}