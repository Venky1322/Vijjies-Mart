import {
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
import LocationPicker from "../components/LocationPicker";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  LoadScript,
} from "@react-google-maps/api";

const Register = () => {

  const navigate =
    useNavigate();

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
            "http://localhost:5000/auth/register",
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

        <div className="p-8 space-y-5">


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

            <input
              placeholder="Email Address"
              type="email"
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
                focus:border-red-500
                focus:shadow-[0_0_20px_rgba(255,0,0,0.35)]
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

            <input
              placeholder="Password"
              type="password"
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
                focus:border-red-500
                focus:shadow-[0_0_20px_rgba(255,0,0,0.35)]
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

            <input
              placeholder="Mobile Number"
              type="tel"
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
                focus:border-red-500
                focus:shadow-[0_0_20px_rgba(255,0,0,0.35)]
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
              onLoad={(autocomplete) =>
                (autocompleteRef.current = autocomplete)
              }
              onPlaceChanged={() => {
                const place =
                  autocompleteRef.current.getPlace();

                if (!place.geometry) return;

                setForm({
                  ...form,
                  address: place.formatted_address,
                  latitude:
                    place.geometry.location.lat(),
                  longitude:
                    place.geometry.location.lng(),
                });
              }}
            >
              <input
                type="text"
                placeholder="Search your Address"
                value={form.address}
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
        focus:border-red-500
        focus:shadow-[0_0_20px_rgba(255,0,0,0.35)]
        transition-all
      "
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
              />
            </Autocomplete>

            <button
              type="button"
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const lat =
                      position.coords.latitude;

                    const lng =
                      position.coords.longitude;

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
                        }
                      }
                    );
                  }
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

          </div>

          {/* REGISTER BUTTON */}

          <button
            onClick={
              handleRegister
            }
            className="
              w-full
              bg-gradient-to-r
              from-red-600
              via-red-700
              to-red-800
              hover:from-red-500
              hover:to-red-700
              text-white
              py-4
              rounded-2xl
              font-black
              text-lg
              shadow-[0_0_25px_rgba(255,0,0,0.35)]
              hover:shadow-[0_0_40px_rgba(255,0,0,0.6)]
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
                text-red-400
                hover:text-red-300
                font-bold
                transition-all
              "
            >

              Login

            </Link>

          </p>

        </div>

      </div>

    </div>
  );
};

export default Register;