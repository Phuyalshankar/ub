import React, { useEffect } from "react";
import { useSF, sf } from "./hooks/service/superFetch";

export default function App() {
  const { loading, data, error, get } = useSF();

  const getProduct = async () => {
    try {
      const res = await get("https://fakestoreapi.com/products"); // <- use proper URL
      if (res.success) console.log("Products:", res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    getProduct();
  }, []);

  return (
    <div>
      <h1>Products</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      {data && (
        <ul>
          {Array.isArray(data) &&
            data.map((p) => (
              <li key={p.id}>
                {p.title} - ${p.price}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
