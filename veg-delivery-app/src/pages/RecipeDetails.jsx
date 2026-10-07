import React, {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  Globe,
  Clock3,
  ChefHat,
  Salad,
  ChevronDown,
} from "lucide-react";

const RecipeDetails = () => {

  const { id } = useParams();

  const [recipe, setRecipe] =
    useState(null);

  const [
    translatedRecipe,
    setTranslatedRecipe,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [language, setLanguage] =
    useState("english");


  // =====================================
  // 🌍 WORLD LANGUAGES
  // =====================================

  const languages = [

    "english",

    "telugu",

    "hindi",

    "tamil",

    "kannada",

    "malayalam",

    "marathi",

    "bengali",

    "gujarati",

    "punjabi",

    "urdu",

    "french",

    "spanish",

    "german",

    "italian",

    "japanese",

    "chinese",

    "korean",

    "arabic",

    "russian",

    "portuguese",

    "turkish",

    "thai",

    "vietnamese",

  ];


  // =====================================
  // 🌍 FETCH RECIPE
  // =====================================

  useEffect(() => {

    fetchRecipe();

  }, []);


  // =====================================
  // 🌍 TRANSLATE WHEN LANGUAGE CHANGES
  // =====================================

  useEffect(() => {

    if (recipe) {

      translateRecipe(language);
    }

  }, [language, recipe]);


  // =====================================
  // 📦 FETCH RECIPE
  // =====================================

  const fetchRecipe = async () => {

    try {

      const res = await fetch(
        `http://localhost:5000/api/recipes/${id}`
      );

      const data =
        await res.json();

      console.log(data);

      setRecipe(data);

      setTranslatedRecipe(data);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);
    }
  };


  // =====================================
  // 🌍 TRANSLATE FUNCTION
  // =====================================

  const translateRecipe =
    async (selectedLanguage) => {

      try {

        if (
          selectedLanguage ===
          "english"
        ) {

          setTranslatedRecipe(
            recipe
          );

          return;
        }

        const res = await fetch(
          "http://localhost:5000/api/recipes/translate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              recipe,
              language:
                selectedLanguage,
            }),
          }
        );

        const data =
          await res.json();

        setTranslatedRecipe(
          data
        );

      } catch (error) {

        console.log(error);
      }
    };


  // =====================================
  // ⏳ LOADING
  // =====================================

  if (loading) {

    return (

      <div className="min-h-screen flex justify-center items-center bg-[#F7F8F5]">

        <h1 className="text-5xl font-black text-gray-600 animate-pulse">

          Loading Recipe...

        </h1>

      </div>
    );
  }


  // =====================================
  // ❌ NOT FOUND
  // =====================================

  if (!recipe) {

    return (

      <div className="min-h-screen flex justify-center items-center bg-[#F7F8F5]">

        <h1 className="text-5xl font-black text-red-500">

          Recipe Not Found

        </h1>

      </div>
    );
  }


  return (

    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] py-10 px-4">


      {/* ===================================== */}
      {/* 🌍 TOP LANGUAGE BAR */}
      {/* ===================================== */}

      <div className="max-w-7xl mx-auto mb-8 flex justify-end">

        <div className="relative group">

          <div className="flex items-center gap-4 bg-white border border-[#E5E7EB] px-6 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">

            <Globe
              size={24}
              className="text-gray-600"
            />

            <select
              value={language}
              onChange={(e) =>
                setLanguage(
                  e.target.value
                )
              }
              className="appearance-none bg-transparent text-[#1F2937] text-lg font-bold outline-none cursor-pointer pr-10 capitalize"
            >

              {
                languages.map(
                  (
                    lang,
                    index
                  ) => (

                    <option
                      key={index}
                      value={lang}
                      className="text-black capitalize"
                    >

                      {lang}

                    </option>
                  )
                )
              }

            </select>

            <ChevronDown
              size={22}
              className="absolute right-5 text-gray-600 pointer-events-none"
            />

          </div>

        </div>

      </div>


      {/* ===================================== */}
      {/* MAIN CONTAINER */}
      {/* ===================================== */}

      <div className="max-w-7xl mx-auto rounded-[40px] overflow-hidden border border-[#E5E7EB] bg-white shadow-lg">


        {/* ===================================== */}
        {/* IMAGE SECTION */}
        {/* ===================================== */}

        <div className="relative">

          <img
            src={
              recipe.image &&
              recipe.image.startsWith(
                "http"
              )
                ? recipe.image
                : `https://source.unsplash.com/1600x900/?${recipe.title},food,curry`
            }
            alt={recipe.title}
            className="w-full h-[500px] object-cover"
          />


          {/* OVERLAY */}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />


          {/* TITLE */}

          <div className="absolute bottom-10 left-8 md:left-14">

            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl">

              {
                translatedRecipe?.title
              }

            </h1>


            <p className="mt-5 text-gray-200 max-w-3xl text-lg leading-relaxed">

              {
                translatedRecipe?.description
              }

            </p>

          </div>

        </div>


        {/* ===================================== */}
        {/* TOP INFO BAR */}
        {/* ===================================== */}

        <div className="flex justify-center items-center py-6 bg-[#F1F8F3] border-y border-[#E5E7EB]">


          {/* COOK TIME */}

          <div className="flex items-center gap-4 bg-white border border-[#E5E7EB] px-6 py-4 rounded-2xl shadow-sm">

            <Clock3
              size={26}
              className="text-gray-600"
            />

            <span className="text-xl font-bold text-gray-700">

              {
                translatedRecipe?.cookingTime
              }

            </span>

          </div>

        </div>


        {/* ===================================== */}
        {/* CONTENT GRID */}
        {/* ===================================== */}

        <div className="grid lg:grid-cols-2 gap-10 p-8">


          {/* ===================================== */}
          {/* INGREDIENTS */}
          {/* ===================================== */}

          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">

            <div className="flex items-center gap-4 mb-8">

              <Salad
                size={35}
                className="text-green-700"
              />

              <h2 className="text-4xl font-black text-[#1F2937]">

                Ingredients

              </h2>

            </div>


            <div className="space-y-4">

              {
                translatedRecipe?.ingredients?.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      key={index}
                      className="bg-[#F7F8F5] border border-[#E5E7EB] rounded-2xl px-5 py-4 text-lg hover:bg-[#F1F8F3] hover:translate-x-2 transition-all duration-300"
                    >

                      🥕 {item}

                    </div>
                  )
                )
              }

            </div>

          </div>


          {/* ===================================== */}
          {/* COOKING STEPS */}
          {/* ===================================== */}

          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300">

            <div className="flex items-center gap-4 mb-8">

              <ChefHat
                size={35}
                className="text-orange-400"
              />

              <h2 className="text-4xl font-black text-[#1F2937]">

                Cooking Steps

              </h2>

            </div>


            <div className="space-y-5">

              {
                translatedRecipe?.steps?.map(
                  (
                    step,
                    index
                  ) => (

                    <div
                      key={index}
                      className="bg-[#F7F8F5] border border-[#E5E7EB] rounded-2xl p-5 hover:bg-[#F1F8F3] hover:scale-[1.02] transition-all duration-300"
                    >

                      <h3 className="text-2xl font-bold text-orange-700 mb-3">

                        Step {index + 1}

                      </h3>

                      <p className="text-gray-600 text-lg leading-relaxed">

                        {step}

                      </p>

                    </div>
                  )
                )
              }

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default RecipeDetails;