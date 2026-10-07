import React, {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

const RecipeDetails = () => {

  const { id } = useParams();

  const [recipe, setRecipe] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // =====================================
  // FETCH RECIPE
  // =====================================

  useEffect(() => {

    fetchRecipe();

  }, []);


  const fetchRecipe = async () => {

    try {

      console.log(
        "Recipe ID:",
        id
      );

      const res = await fetch(
        `http://localhost:5000/api/recipes/${id}`
      );

      const data =
        await res.json();

      console.log(
        "Recipe Data:",
        data
      );

      setRecipe(data);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);
    }
  };


  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (

      <div className="min-h-screen flex justify-center items-center bg-orange-50">

        <h1 className="text-3xl font-bold text-orange-600">

          Loading Recipe...

        </h1>

      </div>
    );
  }


  // =====================================
  // RECIPE NOT FOUND
  // =====================================

  if (!recipe) {

    return (

      <div className="min-h-screen flex justify-center items-center bg-orange-50">

        <h1 className="text-3xl font-bold text-red-500">

          Recipe Not Found

        </h1>

      </div>
    );
  }


  return (

    <div className="min-h-screen bg-orange-50 p-6">

      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">


        {/* IMAGE */}

        <img
          src={
            recipe.image ||
            `https://placehold.co/1200x500/orange/white?text=${recipe.title}`
          }
          alt={recipe.title}
          className="w-full h-96 object-cover"
        />


        <div className="p-8">


          {/* TITLE */}

          <h1 className="text-5xl font-bold text-orange-600">

            {recipe.title}

          </h1>


          {/* DESCRIPTION */}

          <p className="mt-4 text-gray-600 text-lg">

            {recipe.description}

          </p>


          {/* COOKING TIME */}

          <div className="mt-6">

            <span className="bg-orange-100 text-orange-700 px-5 py-3 rounded-full">

              ⏱ {recipe.cookingTime}

            </span>

          </div>


          {/* CONTENT GRID */}

          <div className="mt-10 grid md:grid-cols-2 gap-10">


            {/* INGREDIENTS */}

            <div>

              <h2 className="text-3xl font-bold mb-5">

                🥕 Ingredients

              </h2>

              <ul className="space-y-3">

                {
                  recipe.ingredients?.map(
                    (item, index) => (

                      <li
                        key={index}
                        className="bg-orange-100 p-3 rounded-xl"
                      >

                        {item}

                      </li>
                    )
                  )
                }

              </ul>

            </div>


            {/* STEPS */}

            <div>

              <h2 className="text-3xl font-bold mb-5">

                👨‍🍳 Cooking Steps

              </h2>

              <ol className="space-y-4">

                {
                  recipe.steps?.map(
                    (step, index) => (

                      <li
                        key={index}
                        className="bg-gray-100 p-4 rounded-xl"
                      >

                        <span className="font-bold">

                          Step {index + 1}:

                        </span>{" "}

                        {step}

                      </li>
                    )
                  )
                }

              </ol>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default RecipeDetails;