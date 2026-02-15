import React, { useEffect } from "react";
import { useSF, sf } from "./hooks/service/superFetch";

export default function App() {
  // बेस URL सेट
  sf.config.setBaseURL('https://fakestoreapi.com');
  
  const { loading, data, error, get } = useSF();

  // सीधै useEffect मा गर्ने
  useEffect(() => {
    get('/products'); // ✅ यति मात्र पुग्छ
  }, []);

  return (
    <div>
      <h1>Products</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      
      {data && Array.isArray(data) && (
        <ul>
          {data.map((product) => (
            <li key={product.id}>
              {product.title} - ${product.price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}