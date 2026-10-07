const express = require("express");

const router = express.Router();

const Recipe =
  require("../models/Recipe");

const {
  GoogleGenAI,
} = require("@google/genai");


// =======================================
// 🤖 GEMINI CLIENT
// =======================================

const ai =
  new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY,
  });


// =======================================
// 🤖 GENERATE AI RECIPE
// =======================================

router.post(
  "/generate",
  async (req, res) => {

    try {

      const { vegetables } =
        req.body;


      // =======================================
      // ✅ SAFETY CHECK
      // =======================================

      if (
        !vegetables ||
        vegetables.length === 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Vegetables are required",
        });
      }


      console.log(
        "🥦 Vegetables:",
        vegetables
      );


      // =======================================
      // 🤖 PROMPT
      // =======================================

      const prompt = `
Generate one Indian curry recipe using:
${vegetables.join(", ")}

IMPORTANT:
Return ONLY valid pure JSON.

Do NOT add markdown.
Do NOT add explanation text.
Do NOT use \`\`\`.

Format:

{
  "title": "",
  "description": "",
  "ingredients": [],
  "steps": [],
  "cookingTime": "",
  "vegetables": [],
  "image": ""
}
`;


      // =======================================
      // 🚀 GEMINI GENERATION
      // =======================================

      const response =
        await ai.models.generateContent({

          model:
            "gemini-2.5-flash",

          contents: prompt,
        });


      // =======================================
      // 🧠 EXTRACT TEXT
      // =======================================

      const text =
        response.text;


      console.log(
        "🤖 RAW AI RESPONSE:"
      );

      console.log(text);


      // =======================================
      // ❌ EMPTY RESPONSE CHECK
      // =======================================

      if (!text) {

        return res.status(500).json({
          success: false,
          message:
            "No AI response received",
        });
      }


      // =======================================
      // 🧹 CLEAN RESPONSE
      // =======================================

      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();


      // =======================================
      // ✅ SAFE JSON PARSE
      // =======================================

      let recipe;

      try {

        recipe =
          JSON.parse(cleaned);

      } catch (jsonError) {

        console.log(
          "❌ JSON Parse Error"
        );

        console.log(cleaned);

        return res.status(500).json({
          success: false,
          message:
            "Invalid AI response format",
        });
      }


      // =======================================
      // 🖼 FALLBACK IMAGE
      // =======================================

      if (!recipe.image) {

        recipe.image =
          `https://source.unsplash.com/1600x900/?${vegetables.join(",")},curry,food`;
      }


      // =======================================
      // 💾 SAVE TO DATABASE
      // =======================================

      const savedRecipe =
        await Recipe.create(recipe);


      console.log(
        "✅ Recipe Saved"
      );


      // =======================================
      // ✅ RESPONSE
      // =======================================

      res.json(savedRecipe);

    } catch (error) {

      console.log(
        "❌ AI Recipe Error"
      );

      console.log(error);


      // =======================================
      // 🚨 ERROR RESPONSE
      // =======================================

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "AI Recipe Generation Failed",
      });
    }
  }
);


// =======================================
// 🌍 TRANSLATE RECIPE
// =======================================

router.post(
  "/translate",
  async (req, res) => {

    try {

      const {
        recipe,
        language,
      } = req.body;


      // =======================================
      // ✅ VALIDATION
      // =======================================

      if (
        !recipe ||
        !language
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Recipe and language are required",
        });
      }


      console.log(
        "🌍 Translating Recipe To:",
        language
      );


      // =======================================
      // 🤖 TRANSLATION PROMPT
      // =======================================

      const prompt = `
Translate this recipe into ${language}.

IMPORTANT:
Return ONLY valid JSON.

Do NOT add markdown.
Do NOT add explanation text.

Recipe:
${JSON.stringify(recipe)}

Format:

{
  "title": "",
  "description": "",
  "ingredients": [],
  "steps": [],
  "cookingTime": ""
}
`;


      // =======================================
      // 🚀 GEMINI TRANSLATION
      // =======================================

      const response =
        await ai.models.generateContent({

          model:
            "gemini-2.5-flash",

          contents: prompt,
        });


      // =======================================
      // 🧠 EXTRACT TEXT
      // =======================================

      const text =
        response.text;


      console.log(
        "🌍 TRANSLATED RESPONSE:"
      );

      console.log(text);


      // =======================================
      // ❌ EMPTY CHECK
      // =======================================

      if (!text) {

        return res.status(500).json({
          success: false,
          message:
            "No translation received",
        });
      }


      // =======================================
      // 🧹 CLEAN RESPONSE
      // =======================================

      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();


      // =======================================
      // ✅ SAFE JSON PARSE
      // =======================================

      let translatedRecipe;

      try {

        translatedRecipe =
          JSON.parse(cleaned);

      } catch (jsonError) {

        console.log(
          "❌ Translation JSON Error"
        );

        console.log(cleaned);

        return res.status(500).json({
          success: false,
          message:
            "Invalid translation format",
        });
      }


      // =======================================
      // ✅ RESPONSE
      // =======================================

      res.json(
        translatedRecipe
      );

    } catch (error) {

      console.log(
        "❌ Translation Error"
      );

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Recipe Translation Failed",
      });
    }
  }
);


// =======================================
// 📋 GET ALL RECIPES
// =======================================

router.get("/", async (req, res) => {

  try {

    const recipes =
      await Recipe.find().sort({
        createdAt: -1,
      });

    res.json(recipes);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =======================================
// 🔍 SEARCH RECIPES
// =======================================

router.post(
  "/search",
  async (req, res) => {

    try {

      const { vegetables } =
        req.body;

      const recipes =
        await Recipe.find({
          vegetables: {
            $in: vegetables,
          },
        });

      res.json(recipes);

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// =======================================
// 📄 GET SINGLE RECIPE
// =======================================

router.get(
  "/:id",
  async (req, res) => {

    try {

      const recipe =
        await Recipe.findById(
          req.params.id
        );

      if (!recipe) {

        return res.status(404).json({
          success: false,
          message:
            "Recipe not found",
        });
      }

      res.json(recipe);

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;