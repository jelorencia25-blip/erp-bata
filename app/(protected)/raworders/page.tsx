export default function RawOrdersPage() {
  return (
    <div className="h-screen bg-gray-100 p-6 flex flex-col">

      {/* HEADER + TIPS (atas) */}
      <div className="flex mb-4 shrink-0 gap-4 h-40">
        
        {/* KIRI - Judul & Deskripsi */}
        <div className="flex-1 bg-white shadow-md rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 Raw Orders</h1>
          <p className="text-gray-700">
            Silahkan isi orderan yang masuk langsung pada spreadsheet di bawah ini.
          https://docs.google.com/spreadsheets/d/1kCnIMMsAZIRKoneR9VOAf_TxSDyT1cV5fs_pKvbEEA0/edit?usp=sharing
          </p>
        </div>

        {/* KANAN - Tips */}
        <div className="flex-1 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
          <h2 className="font-semibold text-lg text-blue-900 mb-2">💡 Tips Pengisian</h2>
          <ul className="list-disc list-inside text-sm space-y-1 text-blue-900">
            <li>Spreadsheet ini <b>bisa diedit semua orang</b>.</li>
            <li>Isi data order berurutan agar tidak tumpang tindih.</li>
            <li>Nama pelanggan & tanggal order wajib diisi dengan benar.</li>
            <li>Perubahan tersimpan otomatis.</li>
          </ul>
        </div>

      </div>

      {/* SPREADSHEET - scrollable */}
      <div className="flex-1 bg-white shadow-lg rounded-lg border border-gray-200 overflow-auto">
        <iframe
          src="https://docs.google.com/spreadsheets/d/1kCnIMMsAZIRKoneR9VOAf_TxSDyT1cV5fs_pKvbEEA0/edit?usp=sharing"
          className="w-full h-full"
          style={{ minHeight: 0 }}
          frameBorder="0"
          allow="clipboard-write; clipboard-read"
        />
      </div>

    </div>
  );
}