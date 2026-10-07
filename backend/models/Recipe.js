const mongoose = require("mongoose");

const recipeSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
      },

      description: {
        type: String,
      },

      ingredients: [
        {
          type: String,
        },
      ],

      steps: [
        {
          type: String,
        },
      ],

      cookingTime: {
        type: String,
      },

      vegetables: [
        {
          type: String,
        },
      ],

      image: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Recipe",
    recipeSchema
  );