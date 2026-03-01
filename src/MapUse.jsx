import React, { useEffect } from 'react';
import createFullStore, { Filters, createResource } from './hooks/service/map';

const store = createFullStore({
  products: [],
  productsLoading: false,
  search: '',
  sortBy: 'id',
  currentPage: 1,
  pageSize: 5
});

const API_URL = 'https://fakestoreapi.com/products';

// १. Resource with your flexible map logic
const productRes = createResource(store, {
  key: 'products',
  fetcher: () => store.api.get(API_URL),
  // तपाईंको लजिक: res छैन भने res.data हेर्ने, नत्र खाली एरे दिने (Safety)
  map: (res) => res?.data || res || [] 
});

export default function App() {
  const loading = productRes.loading();
  const search = store.$('search');
  const sortBy = store.$('sortBy');
  const currentPage = store.$('currentPage');
  const pageSize = store.$('pageSize');

  // २. DataEngine pagination
  const { data: pagedData, pages, total } = store.$data.page(currentPage, pageSize);

  // ३. Load data on mount
  useEffect(() => {
    productRes.load();
  }, []);

  // ४. Filtering & Sorting logic
  useEffect(() => {
    store.set('currentPage', 1);
    store.$data
      .clear()
      .use(Filters.search(search, ['title']), 'search')
      .use(Filters.sort(sortBy, true), 'sort');
  }, [search, sortBy]);

  // --- Actions ---

  const handleAdd = async () => {
    const newItem = { title: "Super Product", price: 250 };
    await store.$async('products', store.api.post(API_URL, newItem), {
      onSuccess: (res) => {
        // Sync local with server response
        store.$data.push({ ...newItem, id: res.id || Date.now() });
      }
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("हटाउन चाहनुहुन्छ?")) return;
    await store.$async('products', store.api.delete(`${API_URL}/${id}`), {
      onSuccess: () => store.$data.remove((item) => item.id === id)
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>स्टोर इन्भेन्टरी ({total})</h2>
        <button onClick={handleAdd} disabled={loading} style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>
          {loading ? 'Processing...' : '+ Add Item'}
        </button>
      </header>

      <input 
        placeholder="खोज्नुहोस्..." 
        value={search}
        onChange={(e) => store.set('search', e.target.value)}
        style={{ padding: '12px', width: '100%', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc' }}
      />

      

      <div style={{ position: 'relative' }}>
        <table border="1" cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', opacity: loading ? 0.5 : 1 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th>ID</th>
              <th>Title</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedData.map(p => (
              <tr key={p.id}>
                <td>{String(p.id).slice(-4)}</td>
                <td>{p.title}</td>
                <td>${p.price}</td>
                <td>
                  <button onClick={() => handleDelete(p.id)} disabled={loading} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button disabled={currentPage === 1 || loading} onClick={() => store.set('currentPage', currentPage - 1)}>Prev</button>
        <span>{currentPage} / {pages}</span>
        <button disabled={currentPage === pages || loading} onClick={() => store.set('currentPage', currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}