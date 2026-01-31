'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/lib/supabase';

type Item = {
  product_id: string;
  pallet_qty: number;
  price_per_m3: number;
};

type ItemField = keyof Item;

export default function NewSalesOrderPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [items, setItems] = useState<Item[]>([{ product_id: '', pallet_qty: 1, price_per_m3: 0 }]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cust } = await supabase.from('customers').select('*').eq('status', 'active');
      const { data: prod } = await supabase.from('products').select('*').eq('status', 'active');
      setCustomers(cust || []);
      setProducts(prod || []);
    };
    fetchData();
  }, []);

  const handleItemChange = (index: number, field: ItemField, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { product_id: '', pallet_qty: 1, price_per_m3: 0 }]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('rpc_create_sales_order', {
        p_customer_id: customerId,
        p_customer_order_ref: orderRef,
        p_items: items,
      });
      if (error) throw error;
      setMessage('Sales Order created: ' + data);
      // redirect ke list setelah submit sukses
      window.location.href = '/sales-orders';
    } catch (err: any) {
      setMessage('Error: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">New Sales Order</h1>

      {/* Back button */}
      <button
        onClick={() => window.location.href = '/sales-orders'}
        className="bg-gray-400 text-white px-4 py-2 mb-4"
      >
        Back
      </button>

      <select
        value={customerId}
        onChange={e => setCustomerId(e.target.value)}
        className="border p-2 w-full mb-2"
      >
        <option value="">Select Customer</option>
        {customers.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Customer Order Ref"
        className="border p-2 w-full mb-2"
        value={orderRef}
        onChange={e => setOrderRef(e.target.value)}
      />

      {items.map((item, i) => (
        <div key={i} className="border p-2 mb-2">
          <select
            value={item.product_id}
            onChange={e => handleItemChange(i, 'product_id', e.target.value)}
          >
            <option value="">Select Product</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={item.pallet_qty}
            onChange={e => handleItemChange(i, 'pallet_qty', parseInt(e.target.value))}
            placeholder="Pallet Qty"
          />

          <input
            type="number"
            min={0}
            step={0.01}
            value={item.price_per_m3}
            onChange={e => handleItemChange(i, 'price_per_m3', parseFloat(e.target.value))}
            placeholder="Price per m3"
          />
        </div>
      ))}

      <button onClick={addItem} className="bg-gray-200 p-2 mb-2">Add Item</button>

      <button
        onClick={handleSubmit}
        className={`px-4 py-2 text-white ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500'}`}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Create Sales Order'}
      </button>

      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}
