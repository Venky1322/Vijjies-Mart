export default function Contact() {
  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1F2937] flex flex-col items-center justify-center px-6">

      <h1 className="text-4xl font-bold mb-6">📞 Contact Us</h1>

      <p className="text-gray-600 mb-6 text-center max-w-xl">
        Have questions or need help? Reach out to us anytime.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">

        <a
          href="mailto:freshveg.support@gmail.com"
          className="bg-green-600 px-6 py-3 rounded-xl text-center hover:scale-105 transition"
        >
          📧 freshveg.support@gmail.com
        </a>

        <a
          href="tel:+918985778737"
          className="bg-blue-600 px-6 py-3 rounded-xl text-center hover:scale-105 transition"
        >
          📞 +91 8985778737
        </a>

      </div>

    </div>
  );
}