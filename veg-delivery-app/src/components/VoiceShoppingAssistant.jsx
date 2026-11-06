import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, ShoppingCart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import {
  hasDozenQuantityRequest,
  parseVoiceOrder,
} from "../utils/voiceOrderParser";
import {
  getVoiceCopy,
  getVoiceProductName,
  hasVoiceIntent,
  VOICE_LANGUAGES,
} from "../utils/voiceAssistantLanguage";
import {
  calculateProspectiveCartTotal,
  MINIMUM_ORDER_VALUE,
} from "../utils/voiceOrderTotal";
import { withStockAlternative } from "../utils/voiceStockAlternative";

const VoiceShoppingAssistant = ({
  products = [],
  productLoadError = false,
  user = null,
}) => {
  const navigate = useNavigate();
  const { cart, addVoiceOrderItems } = useContext(CartContext);
  const recognitionRef = useRef(null);
  const isAddingToCartRef = useRef(false);
  const [language, setLanguage] = useState(() => {
    try {
      return VOICE_LANGUAGES.some(
        ({ code }) => code === localStorage.getItem("voiceAssistantLanguage")
      )
        ? localStorage.getItem("voiceAssistantLanguage")
        : "en-IN";
    } catch (error) {
      console.warn("Unable to read voice assistant language preference:", error);
      return "en-IN";
    }
  });
  const copy = useMemo(() => getVoiceCopy(language), [language]);
  const displayName =
    user?.displayName || user?.name || user?.given_name || "";
  const [availableVoices, setAvailableVoices] = useState(() =>
    window.speechSynthesis?.getVoices?.() || []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [stage, setStage] = useState("idle");
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: getVoiceCopy(language).greeting(displayName),
    },
  ]);
  const [pendingItems, setPendingItems] = useState([]);
  const [stockAlternatives, setStockAlternatives] = useState({});

  useEffect(() => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis) {
      return undefined;
    }
    const updateVoices = () => setAvailableVoices(speechSynthesis.getVoices());
    updateVoices();
    if (speechSynthesis.addEventListener) {
      speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () =>
        speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    }
    speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("voiceAssistantLanguage", language);
    } catch (error) {
      console.warn("Unable to save voice assistant language preference:", error);
    }
  }, [language]);

  useEffect(() => {
    setMessages((currentMessages) =>
      currentMessages.map((message, index) =>
        index === 0 && message.sender === "assistant"
          ? { ...message, text: copy.greeting(displayName) }
          : message
      )
    );
  }, [copy, displayName, language]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
    },
    []
  );

  const speakText = (text) => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      if (language === "te-IN") {
        console.warn(
          "No Telugu speech synthesis voice is available in this browser."
        );
      }
      return;
    }
    const voices = speechSynthesis.getVoices();
    const voicesToUse = voices.length > 0 ? voices : availableVoices;
    const matchingVoice = voicesToUse.find((voice) =>
      voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase())
    );
    if (!matchingVoice) {
      if (language === "te-IN") {
        console.warn(
          "No Telugu speech synthesis voice is available in this browser."
        );
      }
      return;
    }
    speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.voice = matchingVoice;
    speechSynthesis.speak(utterance);
  };

  const addMessage = (sender, text) => {
    setMessages((currentMessages) => [...currentMessages, { sender, text }]);
    if (sender === "assistant") {
      speakText(text);
    }
  };

  const cancelPendingOrder = () => {
    setPendingItems([]);
    setStockAlternatives({});
    setStage("idle");
    addMessage("assistant", copy.cancelled);
  };

  const addItemsToCart = (items) => {
    if (
      isAddingToCart ||
      items.length === 0 ||
      isAddingToCartRef.current
    ) {
      return;
    }

    const prospectiveTotal = calculateProspectiveCartTotal(cart, items);
    if (prospectiveTotal < MINIMUM_ORDER_VALUE) {
      setPendingItems([]);
      setStage("idle");
      addMessage(
        "assistant",
        copy.minimumOrder(
          prospectiveTotal.toFixed(2),
          MINIMUM_ORDER_VALUE
        )
      );
      return;
    }

    isAddingToCartRef.current = true;
    setIsAddingToCart(true);
    try {
      addVoiceOrderItems(
        items.map(({ product, quantity }) => ({ product, quantity }))
      );
      setPendingItems([]);
      setStage("after-add");
      addMessage(
        "assistant",
        copy.cartAdded
      );
    } catch (error) {
      console.error("Voice order cart update failed:", error);
      addMessage(
        "assistant",
        copy.cartError
      );
    } finally {
      isAddingToCartRef.current = false;
      setIsAddingToCart(false);
    }
  };

  const confirmAvailableStock = () => {
    const approvedItems = pendingItems.map((item) =>
      item.requiresStockApproval
        ? {
            ...item,
            quantity: item.availableQuantity,
            stockApproved: true,
          }
        : item
    );
    addItemsToCart(approvedItems);
  };

  const applyStockAlternative = (productId, rawQuantity) => {
    const updatedItems = withStockAlternative(
      pendingItems,
      productId,
      rawQuantity
    );
    if (!updatedItems) {
      addMessage("assistant", copy.stockReviewAgain);
      return;
    }

    const remainingItems = updatedItems.filter(
      (pendingItem) => pendingItem.requiresStockApproval
    );
    setPendingItems(updatedItems);
    setStockAlternatives((current) => ({ ...current, [productId]: "" }));

    if (remainingItems.length > 0) {
      setStage("stock-confirmation");
      addMessage(
        "assistant",
        copy.stockApproval(
          remainingItems.map((pendingItem) => ({
            productName: getVoiceProductName(pendingItem.product.name, language),
            requestedQuantity: pendingItem.requestedQuantity,
            availableQuantity: pendingItem.availableQuantity,
          }))
        )
      );
      return;
    }

    setStage("cart-review");
    const total = calculateProspectiveCartTotal(cart, updatedItems);
    const itemNames = updatedItems
      .map(({ product, quantity }) => `${product.name}, ${quantity} kg`)
      .join(" and ");
    addMessage("assistant", copy.review(itemNames, total.toFixed(2)));
  };

  const confirmCartAddition = () => {
    if (
      pendingItems.some(
        (item) => item.requiresStockApproval && !item.stockApproved
      )
    ) {
      return;
    }

    addItemsToCart(pendingItems);
  };

  const proceedToCheckout = () => {
    setIsOpen(false);
    navigate("/payment");
  };

  const handleRecognizedSpeech = (spokenText) => {
    const cleanText = spokenText.trim();
    addMessage("user", cleanText);

    if (stage === "stock-confirmation") {
      if (hasVoiceIntent(cleanText, language, "cancel")) {
        cancelPendingOrder();
      } else {
        const requestedAlternative = parseVoiceOrder(cleanText, products).find(
          (requestedItem) =>
            pendingItems.some(
              (pendingItem) =>
                pendingItem.requiresStockApproval &&
                String(pendingItem.product._id) ===
                  String(requestedItem.product?._id)
            )
        );
        if (requestedAlternative) {
          applyStockAlternative(
            requestedAlternative.product._id,
            requestedAlternative.quantity
          );
        } else if (hasVoiceIntent(cleanText, language, "confirm")) {
          confirmAvailableStock();
        } else {
          addMessage("assistant", copy.stockReviewAgain);
        }
      }
      return;
    }

    if (stage === "cart-review") {
      if (hasVoiceIntent(cleanText, language, "cancel")) {
        cancelPendingOrder();
      } else if (hasVoiceIntent(cleanText, language, "confirm")) {
        confirmCartAddition();
      } else {
        addMessage(
          "assistant",
          copy.reviewAgain
        );
      }
      return;
    }

    if (stage === "after-add") {
      if (hasVoiceIntent(cleanText, language, "shopping")) {
        setStage("idle");
        addMessage("assistant", copy.continueBrowsing);
      } else if (hasVoiceIntent(cleanText, language, "checkout")) {
        proceedToCheckout();
      } else {
        addMessage(
          "assistant",
          copy.proceedPrompt
        );
      }
      return;
    }

    if (productLoadError) {
      addMessage(
        "assistant",
        copy.unavailableError
      );
      return;
    }

    if (hasDozenQuantityRequest(cleanText)) {
      addMessage(
        "assistant",
        copy.specifyWeight || getVoiceCopy("en-IN").specifyWeight
      );
      return;
    }

    const requestedItems = parseVoiceOrder(cleanText, products);
    if (requestedItems.length === 0) {
      addMessage(
        "assistant",
        copy.notRecognized
      );
      return;
    }

    const unavailableNames = [];
    const outOfStockNames = [];
    const alreadyInCartNames = [];
    const stockUnknownNames = [];
    const eligibleItems = [];

    for (const requestedItem of requestedItems) {
      const product = requestedItem.product;
      if (!product) {
        unavailableNames.push(requestedItem.name);
        continue;
      }

      const stock = Number(product.stock);
      if (!Number.isFinite(stock)) {
        stockUnknownNames.push(product.name);
        continue;
      }
      if (stock <= 0) {
        outOfStockNames.push(product.name);
        continue;
      }

      const quantityAlreadyInCart = cart
        .filter(
          (cartItem) =>
            String(cartItem.productId ?? cartItem.id) === String(product._id)
        )
        .reduce(
          (total, cartItem) =>
            total +
            Number(cartItem.weight ?? 1) * Number(cartItem.quantity ?? 1),
          0
        );
      const availableStock = Math.max(0, stock - quantityAlreadyInCart);
      if (availableStock <= 0) {
        alreadyInCartNames.push(product.name);
        continue;
      }

      const pricePerKg = Number(product.pricePerKg);
      if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
        stockUnknownNames.push(`${product.name} (price unavailable)`);
        continue;
      }

      const requiresStockApproval = requestedItem.quantity > availableStock;
      eligibleItems.push({
        product,
        quantity: requestedItem.quantity,
        availableQuantity: availableStock,
        requestedQuantity: requestedItem.quantity,
        requiresStockApproval,
        stockApproved: !requiresStockApproval,
      });
    }

    if (unavailableNames.length > 0) {
      addMessage(
        "assistant",
        copy.notAvailable(unavailableNames.join(", "))
      );
    }
    if (outOfStockNames.length > 0) {
      addMessage(
        "assistant",
        copy.outOfStock(outOfStockNames.join(", "))
      );
    }
    if (alreadyInCartNames.length > 0) {
      addMessage(
        "assistant",
        copy.alreadyCart(alreadyInCartNames.join(", "))
      );
    }
    if (stockUnknownNames.length > 0) {
      addMessage(
        "assistant",
        copy.stockUnknown(stockUnknownNames.join(", "))
      );
    }
    if (eligibleItems.length === 0) {
      return;
    }

    const itemsRequiringApproval = eligibleItems.filter(
      (item) => item.requiresStockApproval
    );
    if (itemsRequiringApproval.length > 0) {
      setPendingItems(eligibleItems);
      setStockAlternatives({});
      setStage("stock-confirmation");
      addMessage(
        "assistant",
        copy.stockApproval(
          itemsRequiringApproval.map((item) => ({
            productName: getVoiceProductName(item.product.name, language),
            requestedQuantity: item.requestedQuantity,
            availableQuantity: item.availableQuantity,
          }))
        )
      );
      return;
    }

    const prospectiveTotal = calculateProspectiveCartTotal(cart, eligibleItems);
    if (prospectiveTotal < MINIMUM_ORDER_VALUE) {
      addMessage(
        "assistant",
        copy.minimumOrder(
          prospectiveTotal.toFixed(2),
          MINIMUM_ORDER_VALUE
        )
      );
      return;
    }

    setPendingItems(eligibleItems);
    setStage("cart-review");
    const itemNames = eligibleItems
      .map((item) => `${item.product.name}, ${item.quantity} kg`)
      .join(" and ");
    addMessage(
      "assistant",
      copy.review(itemNames, prospectiveTotal.toFixed(2))
    );
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage(
        "assistant",
        copy.unsupported
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
      };
      recognition.onresult = (event) => {
        const result = event.results?.[0]?.[0]?.transcript;
        if (result) {
          handleRecognizedSpeech(result);
        } else {
          addMessage("assistant", copy.didntCatch);
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          addMessage(
            "assistant",
            copy.micDenied
          );
        } else if (event.error !== "aborted") {
          console.error("Voice shopping speech recognition error:", event.error);
          addMessage(
            "assistant",
            copy.speechFailed
          );
        }
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
    } catch (error) {
      console.error("Unable to start voice shopping recognition:", error);
      setIsListening(false);
      addMessage(
        "assistant",
        copy.micFailed
      );
    }
  };

  const prospectiveCartTotal = calculateProspectiveCartTotal(cart, pendingItems);
  const canAddToCart =
    pendingItems.length > 0 &&
    !pendingItems.some(
      (item) => item.requiresStockApproval && !item.stockApproved
    );

  return (
    <div className="vm-voice-assistant mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-4">
      {isOpen && (
        <section
          aria-label="VIJJIESMART voice shopping assistant"
          className="vm-voice-panel flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-[#F1F8F3] px-4 py-3">
            <div>
              <h2 className="font-bold text-[#1F2937]">🥬 VIJJIESMART Assistant</h2>
              <label className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                <span>Language</span>
                <select
                  value={language}
                  onChange={(event) => {
                    recognitionRef.current?.abort?.();
                    setIsListening(false);
                    setLanguage(event.target.value);
                  }}
                  className="max-w-44 rounded-md border border-[#E5E7EB] bg-white px-2 py-1 text-[#1F2937]"
                  aria-label="Voice assistant language"
                >
                  {VOICE_LANGUAGES.map(({ code, label }) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                recognitionRef.current?.abort?.();
                setIsOpen(false);
              }}
              aria-label="Close voice assistant"
              className="rounded-lg p-2 text-gray-600 hover:bg-white"
            >
              <X size={18} />
            </button>
          </header>

          <div className="space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  message.sender === "user"
                    ? "ml-auto bg-[#EAF6EC] text-green-900"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {message.sender === "user" && (
                  <span className="mb-1 block text-xs font-semibold text-gray-500">
                    {copy.userSaid}
                  </span>
                )}
                {message.text}
              </div>
            ))}

            {pendingItems.length > 0 && stage === "cart-review" && (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <h3 className="mb-2 font-semibold text-[#1F2937]">🛒 {copy.order}</h3>
                <ul className="space-y-2 text-sm">
                  {pendingItems.map((item) => (
                    <li
                      key={item.product._id}
                      className="border-b border-gray-100 pb-2 last:border-0"
                    >
                      <div className="flex justify-between gap-2">
                        <span>
                          {item.product.name} · {item.quantity} kg × ₹
                          {Number(item.product.pricePerKg).toFixed(2)}/kg
                        </span>
                        <span className="font-semibold">
                          ₹
                          {(
                            Number(item.product.pricePerKg) * item.quantity
                          ).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {pendingItems.length > 0 && (
                  <>
                    <div className="mt-3 flex justify-between border-t border-[#E5E7EB] pt-2 font-bold">
                      <span>{copy.estimatedTotal}</span>
                      <span>₹{prospectiveCartTotal.toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      {copy.confirmAdd}?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={confirmCartAddition}
                        disabled={!canAddToCart || isAddingToCart}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isAddingToCart ? copy.adding : copy.confirmAdd}
                      </button>
                      <button
                        type="button"
                        onClick={cancelPendingOrder}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                      >
                        {copy.cancelItem}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {pendingItems.length > 0 && stage === "stock-confirmation" && (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <h3 className="font-semibold text-gray-900">{copy.order}</h3>
                <ul className="space-y-3 text-sm">
                  {pendingItems.map((item) => (
                    <li key={item.product._id} className="space-y-2 border-b border-amber-200 pb-3 last:border-0 last:pb-0">
                      <p className="font-medium text-gray-800">
                        {item.product.name}:{" "}
                        {copy.stockQuantityDetails(
                          item.requestedQuantity,
                          item.availableQuantity
                        )}
                      </p>
                      {item.requiresStockApproval && (
                        <div className="flex gap-2">
                          <label className="sr-only" htmlFor={`stock-quantity-${item.product._id}`}>
                            {copy.addAvailable(stockAlternatives[item.product._id] || "")}
                          </label>
                          <input
                            id={`stock-quantity-${item.product._id}`}
                            type="number"
                            min="0.25"
                            max={item.availableQuantity}
                            step="0.25"
                            inputMode="decimal"
                            value={stockAlternatives[item.product._id] || ""}
                            onChange={(event) =>
                              setStockAlternatives((current) => ({
                                ...current,
                                [item.product._id]: event.target.value,
                              }))
                            }
                            placeholder="kg"
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              applyStockAlternative(
                                item.product._id,
                                stockAlternatives[item.product._id]
                              )
                            }
                            disabled={isAddingToCart}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {copy.addAvailable(stockAlternatives[item.product._id] || "")}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmAvailableStock}
                    disabled={isAddingToCart}
                    className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingToCart ? copy.adding : copy.stockConfirmButton}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingOrder}
                    disabled={isAddingToCart}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {copy.cancelItem}
                  </button>
                </div>
              </div>
            )}

            {stage === "after-add" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={proceedToCheckout}
                  className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  {copy.checkout}
                </button>
                <button
                  type="button"
                  onClick={() => setStage("idle")}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
                >
                  {copy.continueShopping}
                </button>
              </div>
            )}
          </div>

          <footer className="border-t border-[#E5E7EB] p-3">
            <button
              type="button"
              onClick={startListening}
              disabled={isListening || isAddingToCart}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-60 ${
                isListening ? "animate-pulse bg-green-700" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening ? copy.listening : copy.startVoice}
            </button>
          </footer>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="vm-voice-toggle inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-green-700"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Voice Order assistant" : "Open Voice Order assistant"}
      >
        {isOpen ? <X size={20} /> : <ShoppingCart size={20} />}
        <span>{isOpen ? "Close" : "Voice Order"}</span>
      </button>
    </div>
  );
};

export default VoiceShoppingAssistant;
