import {
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import {
  Mail,
  Lock,
  Phone,
  MapPin,
  UserPlus,
} from "lucide-react";
import { apiUrl } from "../config/api";
import {
  Autocomplete,
  LoadScript,
} from "@react-google-maps/api";

const libraries = ["places"];

const Register = () => {

  const navigate =
    useNavigate();
  const autocompleteRef = useRef(null);
  const [locationError, setLocationError] = useState("");

  const [form, setForm] =
    useState({

      email: "",

      password: "",

      mobile: "",

      address: "",
    });


  // =====================================
  // 📝 REGISTER FUNCTION
  // =====================================

  const handleRegister =
    async () => {

      try {

        const res =
          await fetch(
            apiUrl("/auth/register"),
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                form
              ),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {

          alert(
            data.message
          );

          return;
        }

        alert(
          "Registered Successfully ✅"
        );


        // ✅ REDIRECT TO LOGIN

        navigate("/login");

      } catch (err) {

        console.log(err);

        alert(
          "Server error"
        );
      }
    };


  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      onError={() =>
        setLocationError("Address search couldn't be loaded. You can enter an address manually.")
      }
    >
      <div className="
      min-h-screen
      flex
      justify-center
      items-center
      bg-[#F7F8F5]
      text-[#1F2937]
      px-4
      py-10
    ">


      {/* ===================================== */}
      {/* MAIN CARD */}
      {/* ===================================== */}

      <div className="
        w-full
        max-w-md
        bg-white
        border
        border-[#E5E7EB]
        rounded-[35px]
        shadow-[0_0_40px_rgba(255,255,255,0.08)]
        overflow-hidden
      ">


        {/* ===================================== */}
        {/* HEADER */}
        {/* ===================================== */}

        <div className="
          bg-[#F1F8F3]
          border-b border-[#E5E7EB]
          p-8
          text-center
        ">

          <div className="
            flex
            justify-center
            mb-4
          ">

            <div className="
              bg-white
              p-4
              rounded-full
              shadow-lg
            ">

              <UserPlus
                size={40}
                className="text-green-700"
              />

            </div>

          </div>

          <h2 className="
            text-4xl
            font-black
            text-[#1F2937]
            tracking-wide
          ">

            Register

          </h2>

          <p className="
            text-gray-600
            mt-3
          ">

            Create your fresh account 🍅

          </p>

        </div>


        {/* ===================================== */}
        {/* FORM */}
        {/* ===================================== */}

        <form
          className="p-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRegister();
          }}
        >


          {/* EMAIL */}

          <div className="relative">

            <Mail
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
              size={20}
            />

            <label htmlFor="register-email" className="sr-only">Email address</label>
            <input
              id="register-email"
              placeholder="Email Address"
              type="email"
              autoComplete="email"
              required
              className="
                w-full
                bg-white
                border
                border-[#E5E7EB]
                text-[#1F2937]
                pl-12
                pr-4
                py-4
                rounded-2xl
                outline-none
                focus:border-emerald-600
                focus:shadow-[0_0_0_3px_rgba(34,136,56,0.14)]
                transition-all
              "
              onChange={(e) =>
                setForm({
                  ...form,
                  email:
                    e.target.value,
                })
              }
            />

          </div>


          {/* PASSWORD */}

          <div className="relative">

            <Lock
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
              size={20}
            />

            <label htmlFor="register-password" className="sr-only">Password</label>
            <input
              id="register-password"
              placeholder="Password"
              type="password"
              autoComplete="new-password"
              required
              className="
                w-full
                bg-white
                border
                border-[#E5E7EB]
                text-[#1F2937]
                pl-12
                pr-4
                py-4
                rounded-2xl
                outline-none
                focus:border-emerald-600
                focus:shadow-[0_0_0_3px_rgba(34,136,56,0.14)]
                transition-all
              "
              onChange={(e) =>
                setForm({
                  ...form,
                  password:
                    e.target.value,
                })
              }
            />

          </div>


          {/* MOBILE NUMBER */}

          <div className="relative">

            <Phone
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-400
              "
              size={20}
            />

            <label htmlFor="register-mobile" className="sr-only">Mobile number</label>
            <input
              id="register-mobile"
              placeholder="Mobile Number"
              type="tel"
              autoComplete="tel"
              required
              className="
                w-full
                bg-white
                border
                border-[#E5E7EB]
                text-[#1F2937]
                pl-12
                pr-4
                py-4
                rounded-2xl
                outline-none
                focus:border-emerald-600
                focus:shadow-[0_0_0_3px_rgba(34,136,56,0.14)]
                transition-all
              "
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile:
                    e.target.value,
                })
              }
            />

          </div>


          {/* ADDRESS */}

          <div className="relative">

            <MapPin
              className="
      absolute
      left-4
      top-5
      text-gray-400
      z-10
    "
              size={20}
            />

            <Autocomplete
              onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={() => {
                const place = autocompleteRef.current?.getPlace();
                const location = place?.geometry?.location;
                if (!location) {
                  setLocationError("Choose a suggested address with a map location.");
                  return;
                }

                setForm({
                  ...form,
                  address: place.formatted_address || place.name || "",
                  latitude: location.lat(),
                  longitude: location.lng(),
                });
                setLocationError("");
              }}
            >
              <div>
                <label htmlFor="register-address" className="sr-only">Delivery address</label>
                <input
                  id="register-address"
                  type="text"
                  placeholder="Search your Address"
                  value={form.address}
                  autoComplete="street-address"
                  className="
        w-full
        bg-white
        border
        border-[#E5E7EB]
        text-[#1F2937]
        pl-12
        pr-4
        py-4
        rounded-2xl
        outline-none
        focus:border-emerald-600
        focus:shadow-[0_0_0_3px_rgba(34,136,56,0.14)]
        transition-all
      "
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: e.target.value,
                      latitude: undefined,
                      longitude: undefined,
                    })
                  }
                />
              </div>
            </Autocomplete>

            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) {
                  setLocationError("Location is unavailable in this browser. You can enter an address manually.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const lat =
                      position.coords.latitude;

                    const lng =
                      position.coords.longitude;

                    if (!window.google?.maps?.Geocoder) {
                      setLocationError("Address lookup is unavailable. You can enter an address manually.");
                      return;
                    }
                    const geocoder =
                      new window.google.maps.Geocoder();

                    geocoder.geocode(
                      {
                        location: {
                          lat,
                          lng,
                        },
                      },
                      (results, status) => {
                        if (
                          status === "OK" &&
                          results[0]
                        ) {
                          setForm({
                            ...form,
                            address:
                              results[0].formatted_address,
                            latitude: lat,
                            longitude: lng,
                          });
                          setLocationError("");
                        } else {
                          setLocationError("We couldn't find an address for your location. Please enter it manually.");
                        }
                      }
                    );
                  },
                  (error) => {
                    setLocationError(
                      error.code === 1
                        ? "Location permission was denied. You can enter an address manually."
                        : "Your location could not be determined. You can enter an address manually."
                    );
                  },
                  { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                );
              }}
              className="
      mt-3
      w-full
      bg-green-600
      hover:bg-green-700
      text-white
      py-3
      rounded-xl
      font-bold
      transition
    "
            >
              📍 Use Current Location
            </button>
            {locationError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {locationError}
              </p>
            )}

          </div>

          {/* REGISTER BUTTON */}

          <button
            type="submit"
            className="
              w-full
              bg-gradient-to-r
              from-emerald-600
              to-green-700
              hover:from-emerald-700
              hover:to-green-800
              text-white
              py-4
              rounded-2xl
              font-black
              text-lg
              shadow-[0_0_25px_rgba(34,120,67,0.2)]
              hover:shadow-[0_0_40px_rgba(34,120,67,0.3)]
              transition-all
              duration-300
              hover:scale-[1.02]
            "
          >

            Register Now 🚀

          </button>


          {/* LOGIN LINK */}

          <p className="
            text-center
            text-gray-300
            mt-6
          ">

            Already have an account?{" "}

            <Link
              to="/login"
              className="
                text-green-700
                hover:text-green-800
                font-bold
                transition-all
              "
            >

              Login

            </Link>

          </p>

        </form>

      </div>

      </div>
    </LoadScript>
  );
};

export default Register;