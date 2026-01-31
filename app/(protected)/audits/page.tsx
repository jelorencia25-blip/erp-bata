'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/lib/supabase';

type AuditRow = {
  id: number;
  user: string;
  action: string;
  module: string;
  timestamp: string;
};

export default function AuditsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    async function fetchAudits() {
      const { data } = await supabase.from('audits').select('id, user, action, module, created_at');
      if(data) setRows(data.map(d=>({id:d.id, user:d.user, action:d.action, module:d.module, timestamp:d.created_at})));
    }
    fetchAudits();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audits</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left border border-white/10">
          <thead className="bg-white/10">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Module</th>
              <th className="px-4 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-2">{r.id}</td>
                <td className="px-4 py-2">{r.user}</td>
                <td className="px-4 py-2">{r.action}</td>
                <td className="px-4 py-2">{r.module}</td>
                <td className="px-4 py-2">{r.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
