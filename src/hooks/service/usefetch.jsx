import React, { useState, useEffect, useCallback } from "react";

function useFetch(baseUrl) {
  const [api, setApi] = useState({
    data: [],
    loading: false,
    error: null,
    success: null,
  });

  const fetchData = useCallback(async (endpoint = "") => {
    setApi((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${baseUrl}/${endpoint}`);
      if (!res.ok) throw new Error("Data Fetch Error");

      const data = await res.json();
      setApi((prev) => ({ ...prev, data, success: true }));
    } catch (error) {
      setApi((prev) => ({ ...prev, error: error.message, success: false }));
    } finally {
      setApi((prev) => ({ ...prev, loading: false }));
    }
  }, [baseUrl]); // fetchData stable huncha

  useEffect(() => {
    fetchData();
  }, [fetchData]); // warning gone

  return { api, fetchData };
}
export default useFetch;