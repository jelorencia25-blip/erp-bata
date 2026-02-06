'use client';

import { useEffect, useState } from 'react';

type Deposit = {
  id: string;
  deposit_date: string;
  deposit_code: string;
  customer_id: string;
  customer_name: string;
  price_lock_per_m3: number;
  total_do_tagged: number;
  do_used: number;
  do_remaining: number;
  deposit_amount: number;
  amount_used: number;
  amount_remaining: number;
  status: string;
  notes: string | null;
  created_at: string;
  so_count: number;
  payment_count: number;
};

type Customer = {
  id: string;
  name: string;
};

type DepositDetail = {
  deposit: Deposit;
  payments: Array<{
    id: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    reference_number: string;
    notes: string;
  }>;
  usages: Array<{
    id: string;
    do_count: number;
    amount_used: number;
    created_at: string;
    sj_number: string;              // 🔥 TAMBAH INI
    delivery_date: string;  
    sales_order: {
      id: string;
      so_number: string;
      order_date: string;
      ship_to_name: string;
      status: string;
    };
  }>;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || 'bg-gray-200'
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);
  <button
  type="button"
  onClick={() => setShowConfirmationStep(true)}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  Review Deposit
</button>

  

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const [selectedDeposit, setSelectedDeposit] = useState<DepositDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    customer: '',
    status: '',
  });

  // Form states
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    price_lock_per_m3: '',
    total_do_tagged: '',
    deposit_amount: '',
    notes: '',
    deposit_date: new Date().toISOString().split('T')[0],
  });

  const [topUpForm, setTopUpForm] = useState({
    amount: '',
    payment_method: 'Transfer',
    reference_number: '',
    notes: '',
  });

  // Fetch deposits
  useEffect(() => {
    fetchDeposits();
    fetchCustomers();
  }, []);

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposits');
      if (!res.ok) throw new Error('Failed to fetch deposits');
      const data = await res.json();
      setDeposits(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDepositDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/deposits/${id}`);
      if (!res.ok) throw new Error('Failed to fetch deposit detail');
      const data = await res.json();
      setSelectedDeposit(data);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: createForm.customer_id,
          price_lock_per_m3: parseFloat(createForm.price_lock_per_m3),
          total_do_tagged: parseInt(createForm.total_do_tagged),
          deposit_amount: parseFloat(createForm.deposit_amount || '0'),
          notes: createForm.notes,
          deposit_date: createForm.deposit_date,
        }),
      });

      if (!res.ok) throw new Error('Failed to create deposit');

      await fetchDeposits();
      setShowCreateModal(false);
      setCreateForm({
        customer_id: '',
        price_lock_per_m3: '',
        total_do_tagged: '',
        deposit_amount: '',
        notes: '',
        deposit_date: new Date().toISOString().split('T')[0], 
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/deposits/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_id: selectedDeposit.deposit.id,
          amount: parseFloat(topUpForm.amount),
          payment_method: topUpForm.payment_method,
          reference_number: topUpForm.reference_number,
          notes: topUpForm.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to add payment');

      await fetchDeposits();
      await fetchDepositDetail(selectedDeposit.deposit.id);
      setShowTopUpModal(false);
      setTopUpForm({
        amount: '',
        payment_method: 'Transfer',
        reference_number: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  
  // Filter deposits
  const filteredDeposits = deposits.filter((d) => {
    const matchCustomer = filters.customer
      ? d.customer_name.toLowerCase().includes(filters.customer.toLowerCase())
      : true;
    const matchStatus = filters.status ? d.status === filters.status : true;
    return matchCustomer && matchStatus;
  });

  // Stats
  const totalDeposits = filteredDeposits.length;
  const totalValue = filteredDeposits.reduce((sum, d) => sum + d.deposit_amount, 0);
  const totalUsed = filteredDeposits.reduce((sum, d) => sum + d.amount_used, 0);
  const totalRemaining = filteredDeposits.reduce((sum, d) => sum + d.amount_remaining, 0);
  const activeDeposits = filteredDeposits.filter((d) => d.status === 'active').length;

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Deposits</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          + Create Deposit
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Deposits</p>
          <p className="text-2xl font-bold text-gray-800">{totalDeposits}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Total Value</p>
          <p className="text-xl font-bold text-gray-800">
            Rp {(totalValue / 1000000).toFixed(1)}JT
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Used</p>
          <p className="text-xl font-bold text-gray-800">
            Rp {(totalUsed / 1000000).toFixed(1)}JT
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Remaining</p>
          <p className="text-xl font-bold text-gray-800">
            Rp {(totalRemaining / 1000000).toFixed(1)}JT
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500">
          <p className="text-xs text-gray-500 uppercase font-semibold">Active</p>
          <p className="text-2xl font-bold text-gray-800">{activeDeposits}</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter by Supplier Name"
          value={filters.customer}
          onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      

      // confirmation step can be added here
      {showConfirmationStep && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h2 className="text-2xl font-bold mb-4">Confirm New Deposit</h2>
      <div className="space-y-2">
        <p><strong>Supplier:</strong> {customers.find(c => c.id === createForm.customer_id)?.name}</p>
        <p><strong>Deposit Date:</strong> {createForm.deposit_date}</p>
        <p><strong>Harga Lock:</strong> Rp {parseFloat(createForm.price_lock_per_m3 || '0').toLocaleString('id-ID')}/m³</p>
        <p><strong>Total DO Tagged:</strong> {createForm.total_do_tagged}</p>
        <p><strong>Initial Deposit:</strong> Rp {parseFloat(createForm.deposit_amount || '0').toLocaleString('id-ID')}</p>
        {createForm.notes && <p><strong>Notes:</strong> {createForm.notes}</p>}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => setShowConfirmationStep(false)}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Back
        </button>
        <button
          onClick={handleCreate} // ini baru beneran create
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Confirm & Create
        </button>
      </div>
    </div>
  </div>
)}


      {/* TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="p-3 text-left">No</th>
              <th className="p-3 text-left">Tanggal</th>
              <th className="p-3 text-left">Kode Deposit</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-right">Harga Lock (per m³)</th>
              <th className="p-3 text-right">Total DO Tagged</th>
              <th className="p-3 text-right">DO Used</th>
              <th className="p-3 text-right">DO Remaining</th>
              <th className="p-3 text-right">Deposit Amount</th>
              <th className="p-3 text-right">Amount Used</th>
              <th className="p-3 text-right">Amount Remaining</th>
              <th className="p-3 text-center">SO Count</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="p-5 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredDeposits.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-5 text-center text-gray-400">
                  No deposits found
                </td>
              </tr>
            ) : (
              filteredDeposits.map((d, index) => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-600 font-medium">{index + 1}</td>
                  <td className="p-3">{d.deposit_date}</td>
                  <td className="p-3 font-semibold text-blue-600">{d.deposit_code}</td>
                  <td className="p-3">{d.customer_name}</td>
                  <td className="p-3 text-right">
                    Rp {d.price_lock_per_m3.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right">{d.total_do_tagged}</td>
                  <td className="p-3 text-right">{d.do_used}</td>
                  <td className="p-3 text-right font-semibold text-green-600">
                    {d.do_remaining}
                  </td>
                  <td className="p-3 text-right">
                    Rp {d.deposit_amount.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right text-orange-600">
                    Rp {d.amount_used.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-600">
                    Rp {d.amount_remaining.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center">{d.so_count}</td>
                  <td className="p-3 text-center">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => fetchDepositDetail(d.id)}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      Detail
                    </button>
                    {d.status === 'active' && (
                      <button
                        onClick={() => {
                          fetchDepositDetail(d.id);
                          setShowTopUpModal(true);
                        }}
                        className="text-green-600 hover:underline"
                      >
                        Top Up
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Deposit</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
  <label className="block text-sm font-medium mb-1">
    Deposit Date <span className="text-red-500">*</span>
  </label>
  <input
    type="date"
    required
    value={createForm.deposit_date}
    onChange={(e) =>
      setCreateForm({ ...createForm, deposit_date: e.target.value })
    }
    className="w-full border rounded px-3 py-2"
  />
</div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.customer_id}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customer_id: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Supplier</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Harga Lock (per m³) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={createForm.price_lock_per_m3}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, price_lock_per_m3: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="400000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Total DO to Tag <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={createForm.total_do_tagged}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, total_do_tagged: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Initial Deposit Amount (Optional)
                  </label>
                  <input
                    type="number"
                    value={createForm.deposit_amount}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, deposit_amount: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="50000000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bisa diisi nanti via Top Up
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notes: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">
                Deposit Detail: {selectedDeposit.deposit.deposit_code}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* DEPOSIT INFO */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <p className="text-sm text-gray-600">Supplier</p>
                <p className="font-semibold">{selectedDeposit.deposit.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <StatusBadge status={selectedDeposit.deposit.status} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Harga Lock</p>
                <p className="font-semibold">
                  Rp {selectedDeposit.deposit.price_lock_per_m3.toLocaleString('id-ID')}/m³
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">DO Tagged</p>
                <p className="font-semibold">
                  {selectedDeposit.deposit.do_used} / {selectedDeposit.deposit.total_do_tagged}
                  <span className="text-green-600 ml-2">
                    ({selectedDeposit.deposit.do_remaining} remaining)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Deposit Amount</p>
                <p className="font-semibold">
                  Rp {selectedDeposit.deposit.deposit_amount.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Remaining</p>
                <p className="font-semibold text-green-600">
                  Rp {selectedDeposit.deposit.amount_remaining.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* PAYMENT HISTORY */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Payment History</h3>
              {selectedDeposit.payments.length === 0 ? (
                <p className="text-gray-400 text-sm">No payments yet</p>
              ) : (
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left text-sm">Date</th>
                      <th className="p-2 text-right text-sm">Amount</th>
                      <th className="p-2 text-left text-sm">Method</th>
                      <th className="p-2 text-left text-sm">Ref</th>
                      <th className="p-2 text-left text-sm">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDeposit.payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2 text-sm">
                          {new Date(p.payment_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-2 text-right text-sm font-semibold">
                          Rp {p.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-sm">{p.payment_method}</td>
                        <td className="p-2 text-sm">{p.reference_number || '-'}</td>
                        <td className="p-2 text-sm">{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* SO USAGES */}
            <div>
              <h3 className="text-lg font-bold mb-2">Sales Order Usage</h3>
              {selectedDeposit.usages.length === 0 ? (
                <p className="text-gray-400 text-sm">No SO using this deposit yet</p>
              ) : (
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left text-sm">SO Number</th>
                      <th className="p-2 text-left text-sm">Order Date</th>
                    <th className="p-2 text-left text-sm">SJ Number</th>
                    <th className="p-2 text-left text-sm">Delivery Date</th>
                      <th className="p-2 text-left text-sm">Ship To</th>
                      <th className="p-2 text-right text-sm">DO Count</th>
                      <th className="p-2 text-right text-sm">Amount Used</th>
                      <th className="p-2 text-center text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDeposit.usages.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-2 text-sm font-semibold">
                          {u.sales_order.so_number}
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(u.sales_order.order_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-2 text-sm font-semibold text-blue-600">
                          {u.sj_number}
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(u.delivery_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-2 text-sm">{u.sales_order.ship_to_name}</td>
                        <td className="p-2 text-right text-sm">{u.do_count}</td>
                        <td className="p-2 text-right text-sm">
                          Rp {u.amount_used.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-center text-sm">
                          <StatusBadge status={u.sales_order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {selectedDeposit.deposit.status === 'active' && (
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Top Up Deposit
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP UP MODAL */}
      {showTopUpModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">
              Top Up Deposit: {selectedDeposit.deposit.deposit_code}
            </h2>
            <form onSubmit={handleTopUp}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={topUpForm.amount}
                    onChange={(e) =>
                      setTopUpForm({ ...topUpForm, amount: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="30000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={topUpForm.payment_method}
                    onChange={(e) =>
                      setTopUpForm({ ...topUpForm, payment_method: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Transfer">Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={topUpForm.reference_number}
                    onChange={(e) =>
                      setTopUpForm({ ...topUpForm, reference_number: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="REF-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={topUpForm.notes}
                    onChange={(e) =>
                      setTopUpForm({ ...topUpForm, notes: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
