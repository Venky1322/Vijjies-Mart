import {
  getTeluguProductAliases,
  normalizeTeluguProductSpacing,
} from "./voiceAssistantLanguage.js";

const PRODUCT_ALIASES = {
  tomato: [
    "tomato",
    "tomatoes",
    "టమాటా",
    "టమాట",
    "టొమాటో",
    "टमाटर",
    "ಟೊಮೆಟೊ",
    "ಟೊಮಾಟೊ",
    "தக்காளி",
    "തക്കാളി",
    "टोमॅटो",
    "টমেটো",
  ],
  brinjal: [
    "brinjal",
    "brinjals",
    "eggplant",
    "eggplants",
    "aubergine",
    "వంకాయ",
    "बैंगन",
    "ಬದನೆಕಾಯಿ",
    "கத்திரிக்காய்",
    "கத்தரிக்காய்",
    "വഴുതന",
    "വഴുതനങ്ങ",
    "वांगी",
    "বেগুন",
  ],
  potato: [
    "potato",
    "potatoes",
    "బంగాళాదుంప",
    "आलू",
    "ಆಲೂಗಡ್ಡೆ",
    "உருளைக்கிழங்கு",
    "ഉരുളക്കിഴങ്ങ്",
    "बटाटा",
    "আলু",
  ],
  onion: [
    "onion",
    "onions",
    "ఉల్లిపాయ",
    "ఉల్లిపాయలు",
    "प्याज",
    "ಈರುಳ್ಳಿ",
    "வெங்காயம்",
    "வெங்காயங்கள்",
    "സവാള",
    "ഉള്ളി",
    "कांदा",
    "পেঁয়াজ",
    "পিঁয়াজ",
  ],
  carrot: [
    "carrot",
    "carrots",
    "క్యారెట్",
    "गाजर",
    "ಕ್ಯಾರೆಟ್",
    "கேரட்",
    "കാരറ്റ്",
    "गाजर",
    "গাজর",
  ],
  mirchi: [
    "mirchi",
    "chilli",
    "chillies",
    "green chilli",
    "green chillies",
    "మిర్చి",
    "మిరపకాయ",
    "మిరప",
    "పచ్చిమిర్చి",
  ],
};

const QUANTITY_WORDS = [
  [/one\s+and\s+a?\s*half|one\s+and\s+half/gi, "1.5"],
  [/three\s+quarters?|three\s+quarter/gi, "0.75"],
  [/one\s+and\s+a\s+quarter/gi, "1.25"],
  [/\bhalf\b/gi, "0.5"],
  [/\bquarter\b/gi, "0.25"],
  [/\bone\b/gi, "1"],
  [/\btwo\b/gi, "2"],
  [/\bthree\b/gi, "3"],
  [/\bfour\b/gi, "4"],
  [/\bfive\b/gi, "5"],
  [/\bsix\b/gi, "6"],
  [/\bseven\b/gi, "7"],
  [/\beight\b/gi, "8"],
  [/\bnine\b/gi, "9"],
  [/\bten\b/gi, "10"],
  [/\beleven\b/gi, "11"],
  [/\btwelve\b/gi, "12"],
  [/ఒకటిన్నర/g, "1.5"],
  [/అర\s*కిలో|అరకిలో|అర\s*కేజీ|అరకేజీ/g, "0.5 kg "],
  [/పావు\s*కిలో|పావుకిలో|పావు\s*కేజీ|పావుకేజీ/g, "0.25 kg "],
  [/ముప్పావు/g, "0.75"],
  [/పావు|పావుకి/g, "0.25"],
  [/అర(?:\s|$)/g, "0.5 "],
  [/ఒకటి|ఒక/g, "1"],
  [/రెండు/g, "2"],
  [/మూడు/g, "3"],
  [/నాలుగు/g, "4"],
  [/ఐదు/g, "5"],
  [/आधे|आधा|आधी/g, "0.5"],
  [/पाऊण|पावणे/g, "0.75"],
  [/पौने/g, "0.75"],
  [/पाव/g, "0.25"],
  [/डेढ़/g, "1.5"],
  [/सवा/g, "1.25"],
  [/एक/g, "1"],
  [/दो/g, "2"],
  [/तीन/g, "3"],
  [/चार/g, "4"],
  [/पांच|पाँच/g, "5"],
  [/ಅರ್ಧ/g, "0.5"],
  [/ಮುಕ್ಕಾಲು/g, "0.75"],
  [/ಕಾಲು/g, "0.25"],
  [/ಒಂದೂವರೆ/g, "1.5"],
  [/ಒಂದು/g, "1"],
  [/ಎರಡು/g, "2"],
  [/ಮೂರು/g, "3"],
  [/ನಾಲ್ಕು/g, "4"],
  [/ಅಯ್ದು/g, "5"],
  [/முக்கால்/g, "0.75"],
  [/அரை/g, "0.5"],
  [/கால்/g, "0.25"],
  [/ஒன்றரை/g, "1.5"],
  [/ஒன்று|ஒரு/g, "1"],
  [/இரண்டு/g, "2"],
  [/மூன்று/g, "3"],
  [/நான்கு/g, "4"],
  [/ஐந்து/g, "5"],
  [/മുക്കാൽ/g, "0.75"],
  [/അര/g, "0.5"],
  [/കാൽ/g, "0.25"],
  [/ഒന്നര/g, "1.5"],
  [/ഒന്ന്|ഒരു/g, "1"],
  [/രണ്ട്/g, "2"],
  [/മൂന്ന്/g, "3"],
  [/നാല്/g, "4"],
  [/അഞ്ച്/g, "5"],
  [/अर्धा|अर्धी|अर्धे/g, "0.5"],
  [/पाव/g, "0.25"],
  [/दीड/g, "1.5"],
  [/एक/g, "1"],
  [/दोन/g, "2"],
  [/तीन/g, "3"],
  [/चार/g, "4"],
  [/पाच/g, "5"],
  [/আধা/g, "0.5"],
  [/পৌনে/g, "0.75"],
  [/সোয়া/g, "1.25"],
  [/দেড়/g, "1.5"],
  [/এক/g, "1"],
  [/দুই/g, "2"],
  [/তিন/g, "3"],
  [/চার/g, "4"],
  [/পাঁচ/g, "5"],
];

const QUANTITY_UNITS = [
  [/\bkilograms?\b/gi, "kg"],
  [/\bkilos?\b/gi, "kg"],
  [/\bkgs?\b/gi, "kg"],
  [/\bgrams?\b/gi, "g"],
  [/కిలోగ్రాములు|కిలోగ్రాము|కిలోలు|కిలో|కేజీలు|కేజీ/g, "kg"],
  [/గ్రాములు|గ్రాము/g, "g"],
  [/किलोग्राम|किलो/g, "kg"],
  [/ग्राम/g, "g"],
  [/ಕಿಲೋಗ್ರಾಂ|ಕಿಲೋ/g, "kg"],
  [/ಗ್ರಾಂ/g, "g"],
  [/கிலோகிராம்|கிலோ/g, "kg"],
  [/கிராம்கள்|கிராம்/g, "g"],
  [/കിലോഗ്രാം|കിലോ/g, "kg"],
  [/ഗ്രാമുകൾ|ഗ്രാം/g, "g"],
  [/किलोग्रॅम|किलो/g, "kg"],
  [/ग्रॅम/g, "g"],
  [/কিলোগ্রাম|কিলো/g, "kg"],
  [/গ্রাম/g, "g"],
  [/কেজি/g, "kg"],
];

const FILLER_WORDS =
  /\b(i|want|need|would|like|can|please|add|give|me|get|buy|put|of|the|some|a|an|and|also|per|kg|g)\b/giu;

const NON_LATIN_FILLER_WORDS =
  /మరియు|और|तथा|ಮತ್ತು|மற்றும்|കൂടാതെ|आणि|এবং/gu;

const removeFillerWords = (text) =>
  text.replace(FILLER_WORDS, " ").replace(NON_LATIN_FILLER_WORDS, " ");

const normalizeDigits = (text) =>
  text.replace(/[०-९০-৯೦-೯௦-௯౦-౯൦-൯]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) -
      (digit >= "०" && digit <= "९" ? 0x0966 :
        digit >= "০" && digit <= "৯" ? 0x09e6 :
          digit >= "೦" && digit <= "೯" ? 0x0ce6 :
            digit >= "௦" && digit <= "௯" ? 0x0be6 :
              digit >= "౦" && digit <= "౯" ? 0x0c66 : 0x0d66) + 48)
  );

const normalizeQuantityText = (text) => {
  let normalized = normalizeDigits(
    normalizeTeluguProductSpacing(text).toLowerCase()
  );

  for (const [pattern, replacement] of QUANTITY_WORDS) {
    normalized = normalized.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of QUANTITY_UNITS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
};

const normalizeProductName = (name) =>
  name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => {
      if (word.endsWith("ies") && word.length > 4) {
        return `${word.slice(0, -3)}y`;
      }
      if (word.endsWith("oes") && word.length > 4) {
        return word.slice(0, -2);
      }
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
        return word.slice(0, -1);
      }
      return word;
    })
    .join(" ");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProductAliases = (product) => {
  if (
    !product ||
    typeof product !== "object" ||
    product._id == null ||
    typeof product.name !== "string" ||
    !product.name.trim()
  ) {
    return [];
  }

  const normalizedName = normalizeProductName(product.name || "");
  const aliases = new Set([product.name]);

  for (const [canonicalName, productAliases] of Object.entries(PRODUCT_ALIASES)) {
    if (normalizedName === normalizeProductName(canonicalName)) {
      productAliases.forEach((alias) => aliases.add(alias));
    }
  }

  getTeluguProductAliases(product.name).forEach((alias) => aliases.add(alias));
  return [...aliases].filter(Boolean);
};

const findProductMentions = (text, products) => {
  const candidates = [];

  for (const product of Array.isArray(products) ? products : []) {
    for (const alias of getProductAliases(product)) {
      const aliasPattern = escapeRegExp(alias.trim()).replace(/\s+/g, "\\s+");
      if (!aliasPattern) {
        continue;
      }

      const regex = new RegExp(
        `(^|[^\\p{L}\\p{N}])(${aliasPattern})(?=$|[^\\p{L}\\p{N}])`,
        "giu"
      );
      for (const match of text.matchAll(regex)) {
        const start = match.index + match[1].length;
        candidates.push({
          product,
          start,
          end: start + match[2].length,
        });
      }
    }
  }

  candidates.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }
    return right.end - left.end;
  });

  return candidates.filter(
    (candidate, index) =>
      !candidates
        .slice(0, index)
        .some(
          (earlier) =>
            candidate.start < earlier.end && candidate.end > earlier.start
        )
  );
};

const findQuantities = (text) => {
  const quantities = [];
  const regex =
    /(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)(?:\s*(kg|g))?/giu;

  for (const match of text.matchAll(regex)) {
    const rawNumber = match[1].replace(/\s/g, "");
    let quantity = rawNumber.includes("/")
      ? Number(rawNumber.split("/")[0]) / Number(rawNumber.split("/")[1])
      : Number(rawNumber);

    if (match[2]?.toLowerCase() === "g") {
      quantity /= 1000;
    }

    if (Number.isFinite(quantity) && quantity > 0) {
      quantities.push({
        quantity,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  const unitRegex = /(?<![\p{L}\p{N}])kg(?![\p{L}\p{N}])/giu;
  for (const match of text.matchAll(unitRegex)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!quantities.some((quantity) => start < quantity.end && end > quantity.start)) {
      quantities.push({ quantity: 1, start, end });
    }
  }

  quantities.sort((left, right) => left.start - right.start);
  return quantities;
};

const hasUnknownAdjacentWords = (text, quantity, mentions, quantities) => {
  const previousBoundary = Math.max(
    0,
    ...mentions
      .filter((mention) => mention.end <= quantity.start)
      .map((mention) => mention.end),
    ...quantities
      .filter((other) => other.end <= quantity.start && other !== quantity)
      .map((other) => other.end)
  );
  const nextBoundary = Math.min(
    text.length,
    ...mentions
      .filter((mention) => mention.start >= quantity.end)
      .map((mention) => mention.start),
    ...quantities
      .filter((other) => other.start >= quantity.end && other !== quantity)
      .map((other) => other.start)
  );
  const adjacentText = removeFillerWords(
    `${text.slice(previousBoundary, quantity.start)} ${text.slice(
      quantity.end,
      nextBoundary
    )}`
  )
    .replace(/\b\d+(?:\.\d+)?\b/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return Boolean(adjacentText);
};

const assignQuantities = (text, mentions, quantities) =>
  quantities.map((quantity) => {
    if (hasUnknownAdjacentWords(text, quantity, mentions, quantities)) {
      return { ...quantity, mention: null };
    }

    const closestMention = mentions.reduce(
      (closest, mention) => {
        const distance =
          quantity.end < mention.start
            ? mention.start - quantity.end
            : quantity.start > mention.end
              ? quantity.start - mention.end
              : 0;
        const between =
          quantity.end < mention.start
            ? text.slice(quantity.end, mention.start)
            : text.slice(mention.end, quantity.start);
        const unexplainedWords = removeFillerWords(between)
          .replace(/\b\d+(?:\.\d+)?\b/gu, " ")
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .trim();
        return distance < closest.distance && !unexplainedWords
          ? { mention, distance }
          : closest;
      },
      { mention: null, distance: Infinity }
    );

    return { ...quantity, mention: closestMention.mention };
  });

const extractUnknownName = (text, quantity, mentions, quantities) => {
  const previousBoundary = Math.max(
    0,
    ...mentions
      .filter((mention) => mention.end <= quantity.start)
      .map((mention) => mention.end),
    ...quantities
      .filter((other) => other.end <= quantity.start && other !== quantity)
      .map((other) => other.end)
  );
  const nextBoundary = Math.min(
    text.length,
    ...mentions
      .filter((mention) => mention.start >= quantity.end)
      .map((mention) => mention.start),
    ...quantities
      .filter((other) => other.start >= quantity.end && other !== quantity)
      .map((other) => other.start)
  );
  const left = text.slice(previousBoundary, quantity.start);
  const right = text.slice(quantity.end, nextBoundary);
  const candidate = removeFillerWords(left.length > right.length ? left : right)
    .replace(/\b\d+(?:\.\d+)?\b/gu, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return candidate
    .split(/\s+/u)
    .filter((word) => word.length > 1)
    .join(" ");
};

export const parseVoiceOrder = (transcript, products = []) => {
  if (typeof transcript !== "string" || !transcript.trim()) {
    return [];
  }

  const normalizedText = normalizeQuantityText(transcript);
  const mentions = findProductMentions(normalizedText, products);
  const quantities = findQuantities(normalizedText);
  const assignments = assignQuantities(normalizedText, mentions, quantities);
  const items = [];

  for (const assignment of assignments) {
    if (assignment.mention) {
      const existing = items.find(
        (item) =>
          item.product?._id != null &&
          String(item.product._id) === String(assignment.mention.product._id)
      );
      if (existing) {
        existing.quantity += assignment.quantity;
      } else {
        items.push({
          name: assignment.mention.product.name,
          product: assignment.mention.product,
          quantity: assignment.quantity,
          unit: "kg",
        });
      }
    } else {
      const unknownName = extractUnknownName(
        normalizedText,
        assignment,
        mentions,
        quantities
      );
      if (unknownName) {
        items.push({
          name: unknownName.replace(/\b\w/g, (letter) => letter.toUpperCase()),
          product: null,
          quantity: assignment.quantity,
          unit: "kg",
        });
      }
    }
  }

  const matchedMentions = new Set(
    assignments.filter((item) => item.mention).map((item) => item.mention)
  );
  for (const mention of mentions) {
    if (matchedMentions.has(mention)) {
      continue;
    }
    const trailingUnit = normalizedText
      .slice(mention.end)
      .match(/^\s*(kg|g)\b/u);
    if (trailingUnit) {
      items.push({
        name: mention.product.name,
        product: mention.product,
        quantity: 1,
        unit: "kg",
      });
    }
  }

  return items;
};

export const matchVoiceProduct = (name, products) => {
  const normalizedName = normalizeProductName(name);
  return products.find((product) => {
    const normalizedProduct = normalizeProductName(product.name || "");
    if (normalizedName === normalizedProduct) {
      return true;
    }

    return getProductAliases(product).some(
      (alias) => normalizeProductName(alias) === normalizedName
    );
  }) || null;
};
