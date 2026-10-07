import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const parseVoiceProducts = (text) => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const ignoredWords = new Set([
    "kg",
    "kilo",
    "kilos",
    "rupee",
    "rupees",
    "rs",
    "per",
  ]);
  const prices = text.matchAll(/\d+(?:\.\d+)?/g);
  const parsedProducts = [];
  let previousPriceEnd = 0;

  for (const priceMatch of prices) {
    const price = Number(priceMatch[0]);
    const productName = text
      .slice(previousPriceEnd, priceMatch.index)
      .replace(/[^a-zA-Z\s'-]/g, " ")
      .split(/\s+/)
      .filter((word) => word && !ignoredWords.has(word.toLowerCase()))
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (productName && Number.isFinite(price) && price > 0) {
      parsedProducts.push({
        name: productName,
        pricePerKg: price,
      });
    }

    previousPriceEnd = priceMatch.index + priceMatch[0].length;
  }

  return parsedProducts;
};

const AdminDashboard = () => {

  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    pricePerKg: "",
    stock: 10,
  });

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [editingId, setEditingId] =
    useState(null);

  const [editData, setEditData] =
    useState({});

  const [selectedPartners, setSelectedPartners] =
    useState({});

  const [activeTab, setActiveTab] = useState("All");
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [parsedProducts, setParsedProducts] = useState([]);
  const [hasParsedVoice, setHasParsedVoice] = useState(false);
  const [voiceComparison, setVoiceComparison] = useState([]);
  const [hasComparedVoice, setHasComparedVoice] = useState(false);
  const [voiceProductImages, setVoiceProductImages] = useState({});
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");

  // ✅ refresh flag
  const isManualRefresh = useRef(false);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchPartners();

    // 🔄 Auto refresh every 10 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    // 🧹 Cleanup when component closes
    return () => clearInterval(interval);
  }, []);


  const filterRecentOrders = (ordersData = []) => {
    const now = Date.now();
    const THIRTY_MINUTES = 30 * 60 * 1000;

    return ordersData.filter((order) => {
      const createdTime = new Date(order.createdAt).getTime();

      if (!Number.isFinite(createdTime)) return false;

      const age = now - createdTime;

      return age >= 0 && age <= THIRTY_MINUTES;
    });
  };

  // ✅ FETCH ORDERS (last 30 minutes)
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API}/orders`);
      const data = await res.json();
      setOrders(filterRecentOrders(data.orders || []));
    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  // ✅ FETCH PRODUCTS
  const fetchProducts = async () => {

    const res =
      await fetch(`${API}/products`);

    const data = await res.json();

    setProducts(data.products || []);
  };

  // ✅ FETCH PARTNERS
  const fetchPartners = async () => {

    const token =
      localStorage.getItem("token");

    const res = await fetch(
      `${API}/auth/delivery-partners`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    setPartners(data.partners || []);
  };
  // 📍 OPEN CUSTOMER LOCATION IN GOOGLE MAPS
  const openCustomerLocation = (location) => {
    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number" ||
      (location.lat === 0 && location.lng === 0)
    ) {
      alert("Customer location is not available.");
      return;
    }
    const googleMapsUrl =
      `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    window.open(googleMapsUrl, "_blank");
  };

  // 📍 OPEN DELIVERY PARTNER LIVE LOCATION
  const openDeliveryLocation = (partner) => {
    const location = partner?.liveLocation;

    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number"
    ) {
      alert("Live location is not available yet.");
      return;
    }

    const googleMapsUrl =
      `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    window.open(googleMapsUrl, "_blank");
  };

  // ✅ REFRESH BUTTON
  const handleRefresh = async () => {
    try {
      isManualRefresh.current = true;
      const res = await fetch(`${API}/orders`);
      const data = await res.json();
      setOrders(filterRecentOrders(data.orders || []));
      setTimeout(() => { isManualRefresh.current = false; }, 2000);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  // ✅ ADD PRODUCT
  const addProduct = async () => {
    const pricePerKg = Number(newProduct.pricePerKg);
    const stock = Number(newProduct.stock);

    if (!newProduct.name.trim()) {
      return alert("Product name is required.");
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      return alert("Price must be greater than 0.");
    }

    if (String(newProduct.stock).trim() === "" || !Number.isFinite(stock) || stock < 0) {
      return alert("Stock must be 0 or greater.");
    }

    if (!selectedFile) {
      return alert("Product image is required.");
    }

    const formData = new FormData();

    formData.append(
      "name",
      newProduct.name
    );

    formData.append(
      "pricePerKg",
      newProduct.pricePerKg
    );

    formData.append("stock", newProduct.stock);

    formData.append(
      "image",
      selectedFile
    );

    await fetch(`${API}/products`, {

      method: "POST",

      body: formData,
    });

    fetchProducts();
  };

  // ✅ DELETE PRODUCT
  const deleteProduct = async (id) => {

    await fetch(
      `${API}/products/${id}`,
      {
        method: "DELETE",
      }
    );

    fetchProducts();
  };

  // ✅ START EDIT
  const startEdit = (p) => {

    setEditingId(p._id);

    setEditData({
      name: p.name,
      pricePerKg: p.pricePerKg,
      stock: p.stock ?? 0,
    });
  };

  // ✅ SAVE EDIT
  const saveEdit = async (id) => {
    const pricePerKg = Number(editData.pricePerKg);
    const stock = Number(editData.stock);

    if (!editData.name?.trim()) {
      return alert("Product name is required.");
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      return alert("Price must be greater than 0.");
    }

    if (String(editData.stock).trim() === "" || !Number.isFinite(stock) || stock < 0) {
      return alert("Stock must be 0 or greater.");
    }

    await fetch(
      `${API}/products/${id}`,
      {

        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name: editData.name,
          pricePerKg,
          stock,
        }),
      }
    );

    setEditingId(null);

    fetchProducts();
  };

  // ✅ ASSIGN DELIVERY
  const assignPartner = async (orderId) => {

    const partnerId =
      selectedPartners[orderId];

    if (!partnerId)
      return alert(
        "Select delivery partner"
      );

    await fetch(
      `${API}/orders/${orderId}/assign`,
      {

        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          partnerId,
          earning: 50,
        }),
      }
    );

    fetchOrders();
  };

  // ✅ GENERATE PDF
  const generateInvoicePDF = (order) => {

    const doc = new jsPDF();

    let y = 20;

    // =========================
    // HEADER
    // =========================
    doc.setFontSize(22);
    doc.setTextColor(0, 128, 0);

    doc.text(
      "FreshVeg Invoice",
      70,
      y
    );

    y += 15;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    doc.text(
      `Customer: ${order.userEmail}`,
      15,
      y
    );

    y += 8;

    doc.text(
      `Order ID: ${order._id}`,
      15,
      y
    );

    y += 8;

    doc.text(
      `Date: ${new Date(order.createdAt).toLocaleString()}`,
      15,
      y
    );

    y += 15;

    // =========================
    // TABLE HEADER
    // =========================
    doc.setFillColor(
      34,
      197,
      94
    );

    doc.rect(
      10,
      y - 6,
      190,
      10,
      "F"
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      "Product",
      15,
      y
    );

    doc.text(
      "Weight",
      70,
      y
    );

    doc.text(
      "Price/Kg",
      110,
      y
    );

    doc.text(
      "Total",
      160,
      y
    );

    y += 12;

    doc.setTextColor(
      0,
      0,
      0
    );

    let grandTotal = 0;

    // =========================
    // ITEMS
    // =========================
    order.items?.forEach((item) => {

      const itemName =
        item.name ||
        item.productId?.name ||
        "Vegetable";

      const weight = parseFloat(
        item.weight || 1
      );

      // ✅ PRODUCT ID
      const productId =
        item.productId?._id ||
        item.productId ||
        item.id;

      // ✅ MATCH BY PRODUCT ID
      let matchedProduct =
        products.find(
          (product) =>
            String(product._id) ===
            String(productId)
        );

      // ✅ FALLBACK MATCH BY NAME
      if (!matchedProduct) {

        matchedProduct =
          products.find(
            (product) =>
              product.name
                ?.toLowerCase()
                .trim() ===
              itemName
                ?.toLowerCase()
                .trim()
          );
      }

      console.log(
        "Matched Product:",
        matchedProduct
      );

      // ✅ PRICE PER KG
      const pricePerKg = parseFloat(
        matchedProduct?.pricePerKg ??
        item.productId?.pricePerKg ??
        item.pricePerKg ??
        0
      );

      // ✅ TOTAL COST
      const itemTotal =
        pricePerKg * weight;

      grandTotal += itemTotal;

      doc.text(
        itemName,
        15,
        y
      );

      doc.text(
        `${weight} Kg`,
        70,
        y
      );

      doc.text(
        `₹${pricePerKg.toFixed(2)}`,
        110,
        y
      );

      doc.text(
        `₹${itemTotal.toFixed(2)}`,
        160,
        y
      );

      y += 10;

      // =========================
      // PAGE BREAK
      // =========================
      if (y > 270) {

        doc.addPage();

        y = 20;

        doc.setFillColor(
          34,
          197,
          94
        );

        doc.rect(
          10,
          y - 6,
          190,
          10,
          "F"
        );

        doc.setTextColor(
          255,
          255,
          255
        );

        doc.text(
          "Product",
          15,
          y
        );

        doc.text(
          "Weight",
          70,
          y
        );

        doc.text(
          "Price/Kg",
          110,
          y
        );

        doc.text(
          "Total",
          160,
          y
        );

        y += 12;

        doc.setTextColor(
          0,
          0,
          0
        );
      }
    });

    // =========================
    // GST
    // =========================
    const gstRate = 0.05;

    const gstAmount =
      grandTotal * gstRate;

    const finalAmount =
      grandTotal + gstAmount;

    y += 10;

    doc.line(
      10,
      y,
      190,
      y
    );

    y += 12;

    doc.setFontSize(12);

    doc.text(
      `Subtotal : ₹${grandTotal.toFixed(2)}`,
      120,
      y
    );

    y += 10;

    doc.text(
      `GST (5%) : ₹${gstAmount.toFixed(2)}`,
      120,
      y
    );

    y += 12;

    doc.setFontSize(15);

    doc.setTextColor(
      0,
      128,
      0
    );

    doc.text(
      `Grand Total : ₹${finalAmount.toFixed(2)}`,
      105,
      y
    );

    // =========================
    // FOOTER
    // =========================
    y += 20;

    doc.setFontSize(11);

    doc.setTextColor(
      0,
      0,
      0
    );

    doc.text(
      "Thank you for shopping with FreshVeg ❤️",
      45,
      y
    );

    y += 8;

    doc.text(
      "Fresh Vegetables Delivered Fast 🚚",
      55,
      y
    );

    return doc;
  };
  // ✅ DOWNLOAD INVOICE ONLY
  const downloadInvoice = (order) => {

    try {

      const doc =
        generateInvoicePDF(order);

      // ✅ DOWNLOAD PDF
      doc.save(
        `Invoice-${order._id}.pdf`
      );

      alert(
        "Invoice downloaded successfully ✅"
      );

    } catch (err) {

      console.log(err);

      alert(
        "Failed to download invoice"
      );
    }
  };
  const shareCustomerLocation = async (location) => {
    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number"
    ) {
      alert("Customer location is not available.");
      return;
    }

    const googleMapsUrl =
      `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Customer Location",
          text: "Open customer location in Google Maps",
          url: googleMapsUrl,
        });
      } else {
        await navigator.clipboard.writeText(
          googleMapsUrl
        );

        alert("Location link copied successfully!");
      }
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setParsedProducts([]);
      setHasParsedVoice(false);
      setVoiceComparison([]);
      setHasComparedVoice(false);
      setVoiceProductImages({});
      setChangeMessage("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleParseVoice = () => {
    setParsedProducts(parseVoiceProducts(voiceText));
    setHasParsedVoice(true);
    setVoiceComparison([]);
    setHasComparedVoice(false);
    setVoiceProductImages({});
    setChangeMessage("");
  };

  const handleCompareVoice = () => {
    const comparison = parsedProducts.map((voiceProduct) => {
      const existingProduct = products.find(
        (product) =>
          product.name?.trim().toLowerCase() ===
          voiceProduct.name.trim().toLowerCase()
      );

      if (!existingProduct) {
        return {
          ...voiceProduct,
          status: "NEW",
        };
      }

      const existingPricePerKg = Number(existingProduct.pricePerKg);

      return {
        ...voiceProduct,
        existingProduct,
        existingPricePerKg,
        status:
          existingPricePerKg === voiceProduct.pricePerKg
            ? "NO CHANGE"
            : "UPDATE",
      };
    });

    setVoiceComparison(comparison);
    setHasComparedVoice(true);
    setVoiceProductImages({});
    setChangeMessage("");
  };

  const cancelVoiceChanges = () => {
    setVoiceComparison([]);
    setHasComparedVoice(false);
    setVoiceProductImages({});
    setParsedProducts([]);
    setHasParsedVoice(false);
    setVoiceText("");
    setChangeMessage("");
  };

  const missingVoiceImageProducts = voiceComparison.filter(
    (product) =>
      product.status === "NEW" &&
      !voiceProductImages[product.name.trim().toLowerCase()]
  );

  const applyVoiceChanges = async () => {
    if (isApplyingChanges || !hasComparedVoice) {
      return;
    }

    if (missingVoiceImageProducts.length > 0) {
      setChangeMessage(
        `Please upload images for all new products before confirming. Image required for: ${missingVoiceImageProducts
          .map((product) => product.name)
          .join(", ")}.`
      );
      return;
    }

    setIsApplyingChanges(true);
    setChangeMessage("");

    const appliedChanges = [];
    const failedChanges = [];
    const failedProducts = [];

    try {
      for (const product of voiceComparison) {
        if (product.status === "NO CHANGE") {
          continue;
        }

        try {
          let response;

          if (product.status === "UPDATE") {
            const existingProduct = product.existingProduct;

            if (!existingProduct?._id) {
              throw new Error("The existing product could not be identified.");
            }

            response = await fetch(`${API}/products/${existingProduct._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: existingProduct.name,
                pricePerKg: product.pricePerKg,
                stock: existingProduct.stock,
              }),
            });
          } else if (product.status === "NEW") {
            const formData = new FormData();
            formData.append("name", product.name);
            formData.append("pricePerKg", String(product.pricePerKg));
            formData.append("stock", "10");
            formData.append(
              "image",
              voiceProductImages[product.name.trim().toLowerCase()]
            );

            response = await fetch(`${API}/products`, {
              method: "POST",
              body: formData,
            });
          } else {
            continue;
          }

          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}.`);
          }

          appliedChanges.push(product.name);
        } catch (error) {
          console.error(`Failed to apply voice product change for ${product.name}:`, error);
          failedChanges.push(
            `Failed to ${product.status === "UPDATE" ? "update" : "add"} ${product.name}.`
          );
          failedProducts.push(product);
        }
      }

      if (appliedChanges.length > 0) {
        try {
          await fetchProducts();
        } catch (error) {
          console.error("Failed to refresh products after voice changes:", error);
          failedChanges.push("The product list could not be refreshed.");
        }
      }

      if (failedChanges.length > 0 && appliedChanges.length > 0) {
        setChangeMessage(
          `Changes completed with ${failedChanges.length} failure${
            failedChanges.length === 1 ? "" : "s"
          }. ${failedChanges.join(" ")}`
        );
      } else if (failedChanges.length > 0) {
        setChangeMessage(
          `No voice product changes were applied. ${failedChanges.join(" ")}`
        );
      } else if (appliedChanges.length > 0) {
        setChangeMessage("Voice product changes applied successfully.");
      } else {
        setChangeMessage("No changes were needed.");
      }

      if (failedChanges.length === 0) {
        setVoiceText("");
        setParsedProducts([]);
        setHasParsedVoice(false);
        setVoiceComparison([]);
        setHasComparedVoice(false);
        setVoiceProductImages({});
      } else {
        setVoiceComparison(failedProducts);
        setVoiceProductImages((currentImages) =>
          Object.fromEntries(
            failedProducts
              .filter((product) => product.status === "NEW")
              .map((product) => {
                const imageKey = product.name.trim().toLowerCase();
                return [imageKey, currentImages[imageKey]];
              })
              .filter(([, image]) => image)
          )
        );
        setHasComparedVoice(failedProducts.length > 0);
      }

    } catch (error) {
      console.error("Failed to apply voice product changes:", error);
      setChangeMessage(
        appliedChanges.length > 0
          ? "Changes were applied, but an unexpected error occurred while finishing. Check the product list before retrying."
          : "The voice product changes could not be completed. Check the error and try again."
      );
      setVoiceComparison([]);
      setHasComparedVoice(false);
      setVoiceProductImages({});
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const hasMissingVoiceImages = missingVoiceImageProducts.length > 0;

  return (
    <div className="min-h-screen p-6 bg-[#F7F8F5] text-[#1F2937]">

      <h1 className="text-3xl text-center font-bold mb-6">
        Admin Dashboard
      </h1>

      <div className="bg-[#F1F8F3] border border-[#E5E7EB] p-4 rounded mb-6">
        <button
          onClick={startVoiceRecognition}
          disabled={isListening || isApplyingChanges}
          className="bg-green-600 px-4 py-2 rounded disabled:opacity-50"
        >
          {isListening ? "🎙️ Listening..." : "🎤 Start Voice"}
        </button>
        {voiceText && (
          <p className="mt-3">
            <strong>You said:</strong> {voiceText}
          </p>
        )}
        <button
          onClick={handleParseVoice}
          disabled={isApplyingChanges}
          className="bg-green-600 px-4 py-2 mt-3 rounded"
        >
          Parse Voice
        </button>
        <div className="mt-4">
          <h2 className="font-semibold">Parsed Products</h2>
          {!voiceText ? (
            <p className="mt-2 text-gray-600">
              No voice input available.
            </p>
          ) : !hasParsedVoice ? (
            <p className="mt-2 text-gray-600">
              Click Parse Voice to extract products.
            </p>
          ) : parsedProducts.length === 0 ? (
            <p className="mt-2 text-gray-600">
              No valid product and price found.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {parsedProducts.map((product, index) => (
                <li key={`${product.name}-${index}`}>
                  {product.name} — ₹{product.pricePerKg}/kg
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasParsedVoice && parsedProducts.length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleCompareVoice}
              disabled={isApplyingChanges}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Compare with Existing Products
            </button>
            <h2 className="font-semibold mt-4">Comparison Results</h2>
            {!hasComparedVoice ? (
              <p className="mt-2 text-gray-600">
                Compare the parsed products with the loaded catalog.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {voiceComparison.map((product, index) => (
                  <li
                    key={`${product.name}-${index}`}
                    className="bg-white border border-[#E5E7EB] p-2 rounded"
                  >
                    <span className="font-semibold">{product.status}</span>
                    {" — "}
                    {product.name}{" "}
                    {product.status === "UPDATE" ? (
                      <>
                        ₹{product.existingPricePerKg}/kg → ₹{product.pricePerKg}/kg
                      </>
                    ) : product.status === "NEW" ? (
                      <>₹{product.pricePerKg}/kg</>
                    ) : (
                      <>
                        ₹{product.existingPricePerKg}/kg (no change)
                      </>
                    )}
                    {product.status === "NEW" && (
                      <div className="mt-2">
                        <p className="text-sm">Product image required</p>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isApplyingChanges}
                          onChange={(event) => {
                            const imageFile = event.target.files?.[0];
                            if (!imageFile) {
                              return;
                            }
                            if (!imageFile.type.startsWith("image/")) {
                              setChangeMessage("Please select an image file.");
                              event.target.value = "";
                              return;
                            }

                            const imageKey = product.name.trim().toLowerCase();
                            setVoiceProductImages((currentImages) => ({
                              ...currentImages,
                              [imageKey]: imageFile,
                            }));
                            setChangeMessage("");
                          }}
                          className="mt-1 block"
                        />
                        <p className="text-sm text-gray-600">
                          {voiceProductImages[
                            product.name.trim().toLowerCase()
                          ] ? (
                            <>
                              Image selected:{" "}
                              {
                                voiceProductImages[
                                  product.name.trim().toLowerCase()
                                ].name
                              }{" "}
                              ✓
                            </>
                          ) : (
                            "No image selected"
                          )}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {hasComparedVoice && (
              <>
                <h3 className="font-semibold mt-4">Review Changes</h3>
                {hasMissingVoiceImages && (
                  <p className="mt-2 text-yellow-800">
                    Please upload images for all new products before confirming.
                    Image required for:{" "}
                    {missingVoiceImageProducts
                      .map((product) => product.name)
                      .join(", ")}.
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={applyVoiceChanges}
                    disabled={isApplyingChanges || hasMissingVoiceImages}
                    className="bg-green-600 px-4 py-2 rounded disabled:opacity-50"
                  >
                    {isApplyingChanges ? "Applying Changes..." : "Confirm Changes"}
                  </button>
                  <button
                    onClick={cancelVoiceChanges}
                    disabled={isApplyingChanges}
                    className="bg-gray-500 px-4 py-2 rounded disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {changeMessage && (
          <p className="mt-3" role="status">
            {changeMessage}
          </p>
        )}
      </div>

      {/* ADD PRODUCT */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded mb-6 shadow-sm">

        <h2>Add Product</h2>

        <input
          placeholder="Name"
          className="w-full p-2 mb-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
          onChange={(e) =>
            setNewProduct({
              ...newProduct,
              name: e.target.value,
            })
          }
        />

        <input
          placeholder="Price"
          className="w-full p-2 mb-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
          onChange={(e) =>
            setNewProduct({
              ...newProduct,
              pricePerKg:
                e.target.value,
            })
          }
        />

        <input
          type="number"
          min="0"
          placeholder="Stock Quantity"
          className="w-full p-2 mb-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
          value={newProduct.stock}
          onChange={(e) =>
            setNewProduct({
              ...newProduct,
              stock: e.target.value,
            })
          }
        />

        <input
          type="file"
          onChange={(e) =>
            setSelectedFile(
              e.target.files[0]
            )
          }
        />

        <button
          onClick={addProduct}
          className="bg-green-600 px-4 py-2 mt-2 rounded"
        >
          Add Product
        </button>

      </div>

      {/* ORDERS */}
      <div className="flex justify-between items-center mb-4">

        <h2>
          Orders (Last 30 Minutes)
        </h2>

        <button
          onClick={handleRefresh}
          className="bg-yellow-500 px-4 py-2 rounded"
        >
          Refresh Orders
        </button>


      </div>

      {/* ORDERS GRID */}
      <div className="grid md:grid-cols-3 gap-4">

        {orders.map((o) => (

          <div
            key={o._id}
            onClick={() =>
              setSelectedOrder(o)
            }
            className="bg-white border border-[#E5E7EB] p-4 rounded cursor-pointer shadow-sm"
          >

            <p>{o.userEmail}</p>

            <p>{o.status}</p>

            <p className="text-green-700">
              Payment :
              {" "}
              {o.paymentStatus}
            </p>

            {/* PDF BUTTON */}
            <button
              onClick={() =>
                downloadInvoice(o)
              }
              className="bg-purple-500 w-full mt-2 py-2 rounded"
            >
              Download Invoice PDF 📄
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openCustomerLocation(o.customerLocation);
              }}
              className="bg-purple-500 w-full mt-2 py-2 rounded"
            >
              📍 Customer Location
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                shareCustomerLocation(o.customerLocation);
              }}
              className="bg-blue-600 w-full mt-2 py-2 rounded"
            >
              📤 Share Customer Location
            </button>

            <select
              className="w-full mt-2 p-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
              onChange={(e) =>
                setSelectedPartners({
                  ...selectedPartners,
                  [o._id]:
                    e.target.value,
                })
              }
            >

              <option value="">
                Select Delivery Boy
              </option>

              {partners.map((p) => (

                <option
                  key={p._id}
                  value={p._id}
                >
                  {p.email}
                </option>

              ))}

            </select>

            <button
              onClick={() =>
                assignPartner(o._id)
              }
              className="bg-blue-600 w-full mt-2 py-1 rounded"
            >
              Assign Delivery 🚚
            </button>
            {o.deliveryPartnerId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();

                  const partner = partners.find(
                    (p) =>
                      String(p._id) ===
                      String(o.deliveryPartnerId)
                  );

                  openDeliveryLocation(partner);
                }}
                className="bg-green-600 w-full mt-2 py-2 rounded"
              >
                📍 Track Delivery Partner
              </button>
            )}

          </div>

        ))}

      </div>

      {/* PRODUCTS */}
      <h2 className="text-xl mt-6 mb-4">
        Products
      </h2>

      <div className="grid md:grid-cols-3 gap-4">

        {products.map((p) => (

          <motion.div
            key={p._id}
            className="bg-white border border-[#E5E7EB] p-4 rounded shadow-sm"
          >

            {editingId === p._id ? (

              <>

                <input
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      name:
                        e.target.value,
                    })
                  }
                  className="w-full mb-2 p-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
                />

                <input
                  value={
                    editData.pricePerKg
                  }
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      pricePerKg:
                        e.target.value,
                    })
                  }
                  className="w-full mb-2 p-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
                />

                <input
                  type="number"
                  min="0"
                  value={editData.stock ?? 0}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      stock: e.target.value,
                    })
                  }
                  className="w-full mb-2 p-2 bg-white text-[#1F2937] border border-[#E5E7EB]"
                  placeholder="Stock Quantity"
                />

                <button
                  onClick={() =>
                    saveEdit(p._id)
                  }
                  className="bg-green-600 w-full mt-2 py-1 rounded"
                >
                  Save
                </button>

              </>

            ) : (

              <>

                <img
                  src={p.image}
                  className="h-28 w-full object-cover"
                />

                <p>{p.name}</p>

                <p>
                  ₹{p.pricePerKg}
                </p>

                <p>
                  Stock: {p.stock ?? 0}
                </p>

                <button
                  onClick={() =>
                    startEdit(p)
                  }
                  className="bg-yellow-500 w-full mt-2 py-1 rounded"
                >
                  Edit
                </button>

              </>

            )}

            <button
              onClick={() =>
                deleteProduct(p._id)
              }
              className="bg-red-500 w-full mt-2 py-1 rounded"
            >
              Delete
            </button>

          </motion.div>

        ))}

      </div>

      {/* LOGOUT */}
      <button
        onClick={() => {

          localStorage.clear();

          navigate("/login");

        }}
        className="bg-red-600 w-full mt-6 py-2 rounded"
      >
        Logout
      </button>

    </div>
  );
};

export default AdminDashboard;