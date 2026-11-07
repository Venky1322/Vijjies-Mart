import { ArrowLeft, Store } from "lucide-react";
import { Link } from "react-router-dom";

const Vendor = () => (
  <main className="vm-info-page min-h-screen px-4 py-16">
    <section className="mx-auto max-w-xl rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF6EC] text-green-700">
        <Store size={26} />
      </span>
      <p className="vm-eyebrow">VENDOR PORTAL</p>
      <h1 className="text-3xl font-bold">Vendor dashboard</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">
        Vendor order management is not available in this view yet.
      </p>
      <Link
        to="/"
        className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
      >
        <ArrowLeft size={16} /> Return to Vijjies-Mart
      </Link>
    </section>
  </main>
);

export default Vendor;