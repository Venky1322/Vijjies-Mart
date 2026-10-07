import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Clock3,
  Flame,
} from "lucide-react";

const RecipeCard = ({ recipe }) => {

  const navigate =
    useNavigate();

  return (

    <div
      onClick={() =>
        navigate(
          `/recipe/${recipe._id}`
        )
      }
      className="
      group
      relative
      overflow-hidden
      rounded-[30px]
      bg-gradient-to-br
      from-[#111111]
      via-[#1b1b1b]
      to-[#2a2a2a]
      border
      border-red-500/30
      shadow-[0_0_20px_rgba(255,0,0,0.25)]
      hover:shadow-[0_0_45px_rgba(255,0,0,0.65)]
      hover:border-red-500/70
      hover:-translate-y-3
      transition-all
      duration-500
      cursor-pointer
      backdrop-blur-xl
    "
    >


      {/* ===================================== */}
      {/* RED GLOW EFFECT */}
      {/* ===================================== */}

      <div className="
        absolute
        inset-0
        bg-gradient-to-r
        from-red-500/10
        via-transparent
        to-red-500/10
        opacity-0
        group-hover:opacity-100
        transition-all
        duration-500
      " />


      {/* ===================================== */}
      {/* IMAGE */}
      {/* ===================================== */}

      <div className="relative overflow-hidden">

        <img
          src={
            recipe.image &&
            recipe.image.startsWith(
              "http"
            )
              ? recipe.image
              : `https://source.unsplash.com/600x400/?${recipe.title},curry,food`
          }
          alt={recipe.title}
          className="
            h-72
            w-full
            object-cover
            group-hover:scale-110
            transition-transform
            duration-700
          "
        />


        {/* IMAGE OVERLAY */}

        <div className="
          absolute
          inset-0
          bg-gradient-to-t
          from-black
          via-black/20
          to-transparent
        " />


        {/* HOT BADGE */}

        <div className="
          absolute
          top-5
          right-5
          flex
          items-center
          gap-2
          bg-red-600/90
          px-4
          py-2
          rounded-full
          shadow-lg
          backdrop-blur-lg
        ">

          <Flame
            size={18}
            className="text-white"
          />

          <span className="text-white font-bold text-sm">

            Trending

          </span>

        </div>

      </div>


      {/* ===================================== */}
      {/* CONTENT */}
      {/* ===================================== */}

      <div className="relative z-10 p-7">


        {/* TITLE */}

        <h2 className="
          text-3xl
          font-black
          text-white
          tracking-wide
          group-hover:text-red-400
          transition-all
          duration-300
        ">

          {recipe.title}

        </h2>


        {/* DESCRIPTION */}

        <p className="
          mt-4
          text-gray-300
          leading-relaxed
          line-clamp-3
          text-base
        ">

          {recipe.description}

        </p>


        {/* ===================================== */}
        {/* FOOTER */}
        {/* ===================================== */}

        <div className="
          mt-6
          flex
          items-center
          justify-between
        ">


          {/* COOKING TIME */}

          <div className="
            flex
            items-center
            gap-3
            bg-red-500/10
            border
            border-red-500/30
            px-4
            py-3
            rounded-2xl
            backdrop-blur-lg
          ">

            <Clock3
              size={20}
              className="text-red-400"
            />

            <span className="
              text-red-300
              font-bold
              text-sm
            ">

              {recipe.cookingTime}

            </span>

          </div>


          {/* VIEW BUTTON */}

          <button
            className="
              bg-gradient-to-r
              from-red-600
              to-red-700
              hover:from-red-500
              hover:to-red-600
              text-white
              font-bold
              px-5
              py-3
              rounded-2xl
              shadow-lg
              hover:shadow-red-500/50
              transition-all
              duration-300
            "
          >

            View Recipe

          </button>

        </div>

      </div>


      {/* ===================================== */}
      {/* BOTTOM GLOW */}
      {/* ===================================== */}

      <div className="
        absolute
        bottom-0
        left-0
        w-full
        h-[3px]
        bg-gradient-to-r
        from-transparent
        via-red-500
        to-transparent
        opacity-70
      " />

    </div>
  );
};

export default RecipeCard;