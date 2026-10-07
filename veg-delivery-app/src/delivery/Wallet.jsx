const Wallet = () => {
  const [balance, setBalance] = useState(0);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold">💰 Wallet</h2>

      <p className="text-2xl text-green-600">₹{balance}</p>

      <input placeholder="Bank Account" className="border p-2 w-full mt-3"/>

      <button className="bg-green-600 text-white px-4 py-2 mt-2 rounded">
        Withdraw
      </button>
    </div>
  );
};