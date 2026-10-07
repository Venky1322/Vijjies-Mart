export default function Gallery() {

  // 🔥 Images from public folder
  const images = [
    "/IMG_20260421_101702[1].jpg",
    "/IMG_20260421_101614[1].jpg",
    "/IMG_20260421_101543[1].jpg",
    "/IMG_20260421_101558[1].jpg",
    "/IMG_20260421_101527[1].jpg",
    
  ];

  return (
    <div className="min-h-screen px-6 py-10 
    bg-[#F7F8F5] text-[#1F2937]">

      {/* 🖼️ TITLE */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-10 
      tracking-wide">
        🌿 Fresh Veggies Gallery
      </h1>

      {/* 📸 GRID */}
      <div className="max-w-7xl mx-auto grid 
      grid-cols-2 sm:grid-cols-3 md:grid-cols-4 
      gap-6">

        {images.map((img, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl shadow-lg 
            hover:shadow-green-500/40 transition duration-300"
          >
            <img
              src={img}
              alt="gallery"
              className="w-full h-48 object-cover 
              hover:scale-110 transition duration-500 
              cursor-pointer"
            />
          </div>
        ))}

      </div>

    </div>
  );
}