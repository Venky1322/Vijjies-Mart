export default function About() {
  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] px-6 py-12">

      {/* 🌿 HERO */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          🌱 Smart Raithumarket-to-Home Delivery Platform
        </h1>
        <p className="text-lg text-gray-600">
          A hyperlocal system connecting farmers, customers, and delivery partners
          in one seamless real-time platform.
        </p>
      </div>

      {/* 🧠 CORE CONCEPT */}
      <div className="mt-12 max-w-5xl mx-auto bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-sm text-center">
        <h2 className="text-2xl font-semibold mb-4">🧠 Core Concept</h2>
        <p className="text-gray-600 leading-relaxed">
          Deliver fresh vegetables directly from local vendors to customers with
          real-time tracking, smart pricing, and an efficient delivery network.
        </p>
      </div>

      {/* 👥 PLATFORM CONNECTION */}
      <div className="mt-12 max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center">
        {[
          { title: "🏪 Govt Market Vendors", desc: "Source vegetables directly from government market vendors for better pricing and freshness" },
          { title: "🛒 Customers", desc: "Get fresh vegetables at better prices" },
          { title: "🚚 Delivery Partners", desc: "Earn through flexible deliveries" },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#F1F8F3] border border-[#E5E7EB] p-6 rounded-2xl shadow-sm"
          >
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="mt-2 text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* 🚀 KEY FEATURES */}
      <div className="mt-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          🚀 Key Features
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "🛒 Smart Ordering", desc: "Weight-based pricing with real-time stock updates." },
            { title: "🚚 Delivery System", desc: "Track orders from placed to delivered with live updates." },
            { title: "🧑‍💼 Admin Panel", desc: "Manage products, orders, and delivery assignments." },
            { title: "📍 Real-Time Tracking", desc: "Live delivery tracking with ETA prediction (next feature)." },
            { title: "💳 Payments", desc: "Supports UPI, Card, and Cash on Delivery." },
            { title: "📊 Scalable Backend", desc: "Built with MongoDB Atlas and modern architecture." },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm hover:scale-105 transition"
            >
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-gray-200">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 💰 BUSINESS MODEL */}
      <div className="mt-20 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">💰 Business Model</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            "💵 Commission per order",
            "🚚 Delivery charges based on distance",
            "🧑‍🌾 Vendor subscription model",
            "📊 Future data insights monetization",
          ].map((item, i) => (
            <div
              key={i}
              className="bg-[#F1F8F3] border border-[#E5E7EB] p-4 rounded-xl"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* 🎯 PROBLEM & SOLUTION */}
      <div className="mt-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          🎯 Problem & Solution
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-500/20 p-6 rounded-2xl">
            <h3 className="text-xl font-semibold mb-3">❌ Problems</h3>
            <ul className="text-gray-600 space-y-2">
              <li>• Middlemen increase prices</li>
              <li>• Lack of freshness</li>
              <li>• No delivery transparency</li>
              <li>• Delayed delivery</li>
            </ul>
          </div>

          <div className="bg-green-500/20 p-6 rounded-2xl">
            <h3 className="text-xl font-semibold mb-3">✅ Our Solution</h3>
            <ul className="text-gray-600 space-y-2">
              <li>• Direct market-to-customer model</li>
              <li>• Hyperlocal sourcing</li>
              <li>• Real-time tracking system</li>
              <li>• Smart delivery network</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 🎤 PITCH */}
      <div className="mt-20 max-w-4xl mx-auto text-center bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-sm">
        <h2 className="text-3xl font-bold mb-4">🎤 Elevator Pitch</h2>
        <p className="text-gray-600 leading-relaxed">
          We are building a hyperlocal market-to-home delivery platform that connects
          vendors, customers, and delivery partners in real-time. Our system ensures
          fresh produce, faster delivery, and full transparency using a scalable
          full-stack architecture.
        </p>
      </div>

      {/* 📞 SUPPORT (ALIGNED FIX) */}
      <div className="mt-20 text-center">
        <h2 className="text-3xl font-bold mb-4">📞 Customer Support</h2>
        <p className="text-gray-600 mb-6">
          24/7 support to ensure smooth experience and quick issue resolution.
        </p>

        {/* ✅ Responsive alignment fix */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">

          <a
            href="mailto:freshveg.support@gmail.com"
            className="w-full sm:w-auto text-center bg-green-600 px-6 py-3 rounded-xl hover:scale-105 transition"
          >
            📧 freshveg.support@gmail.com
          </a>

          <a
            href="tel:+918985778737"
            className="w-full sm:w-auto text-center bg-blue-600 px-6 py-3 rounded-xl hover:scale-105 transition"
          >
            📞 +91 8985778737
          </a>

        </div>
      </div>

    </div>
  );
}