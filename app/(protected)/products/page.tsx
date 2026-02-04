'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/lib/supabase';

type Product = {
  id: string;
  name: string;
  ukuran: string;
  kubik_m3: number;
  isi_per_palet: number;
  jumlah_palet: number;
  status: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // add form
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [m3, setM3] = useState('');
  const [pcs, setPcs] = useState('');
  const [palletQty, setPalletQty] = useState('');

  const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*');

  console.log('PRODUCTS FETCH:', { data, error });

  if (error) {
    alert(error.message);
    return;
  }

  setProducts(data || []);
};

useEffect(() => {
  fetchProducts();
}, []);



  const handleAdd = async () => {
    if (!name || !size) return alert('Nama & ukuran wajib');

    setLoading(true);

    const { error } = await supabase.from('products').insert({
      name,
      ukuran: size,
      kubik_m3: Number(m3),
      isi_per_palet: Number(pcs),
      jumlah_palet: Number(palletQty),
      status: 'active',
    });

    setLoading(false);

    if (error) return alert(error.message);

    setName('');
    setSize('');
    setM3('');
    setPcs('');
    setPalletQty('');
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📦 Products</h1>

      {/* ADD PRODUCT */}
      <div className="bg-white p-4 rounded-xl shadow mb-8">
        <h2 className="font-semibold mb-3">Add Product</h2>

        <div className="grid grid-cols-6 gap-3">
          <input className="input" placeholder="Nama Barang" value={name} onChange={e => setName(e.target.value)} />
          <input className="input" placeholder="Ukuran" value={size} onChange={e => setSize(e.target.value)} />
          <input className="input" type="number" placeholder="m3 / Palet" value={m3} onChange={e => setM3(e.target.value)} />
          <input className="input" type="number" placeholder="Isi / Palet" value={pcs} onChange={e => setPcs(e.target.value)} />
          <input className="input" type="number" placeholder="Jumlah Palet" value={palletQty} onChange={e => setPalletQty(e.target.value)} />

          <button
            onClick={handleAdd}
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg"
          >
            {loading ? 'Saving...' : 'Add'}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="th">Nama</th>
              <th className="th">Ukuran</th>
              <th className="th">m3 / Palet</th>
              <th className="th">Isi / Palet</th>
              <th className="th">Palet</th>
              {/* <th className="th text-center">Aksi</th> */}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t">
                <td className="td">{p.name}</td>
                <td className="td">{p.ukuran}</td>
                <td className="td">{p.kubik_m3}</td>
                <td className="td">{p.isi_per_palet}</td>
                <td className="td">{p.jumlah_palet}</td>
                {/* <td className="td text-center">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="btn-red"
                  >
                    Delete
                  </button>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
