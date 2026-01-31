import { useEffect, useState } from "react";
import { Search, Filter, Clock } from "lucide-react";

const VendorDataPage = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";
  const SHEET_NAME = "Vendors";

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Vendor data: ${response.status}`);
      }

      const json = await response.json();
      const data: any[][] = json.data || [];

      // Assuming header is in first row, data from second onwards
      const START_ROW_INDEX = 1;
      const body = data.slice(START_ROW_INDEX);

      // Map rows to objects
      const transformedData = body.map((r, index) => ({
        id: index + 1,
        serialNumber: (r[0] ?? "").toString().trim(),
        vendorName: (r[1] ?? "").toString().trim(),
        totalQty: (r[2] ?? "").toString().trim(),
        totalPOQty: (r[3] ?? "").toString().trim(),
        totalReceivedQty: (r[4] ?? "").toString().trim(),
      }));

      // Filter out rows missing serial number or vendor name
      const filteredData = transformedData.filter(
        (r) => r.serialNumber && r.vendorName
      );

      setRows(filteredData);
    } catch (e: any) {
      setError(e?.message || "Failed to load Vendor data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  // Filter rows based on search and vendor filter
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      row.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterVendor === "all" ||
      row.vendorName.toLowerCase() === filterVendor.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Get unique vendors for filter dropdown
  const uniqueVendors = Array.from(
    new Set(rows.map((r) => r.vendorName))
  ).sort();

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Vendor Data</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Serial or Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Vendors</option>
            {uniqueVendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadRows}
          disabled={loading}
          className="flex items-center gap-2 justify-center px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition"
        >
          {loading ? (
            <Clock className="w-5 h-5 animate-spin" />
          ) : (
            <Filter className="w-5 h-5" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && filteredRows.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No data found. Try different search or filter.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-blue-600">
          <Clock className="mx-auto w-8 h-8 animate-spin mb-2" />
          Loading Vendor data...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 border-b border-gray-200">Serial Number</th>
                <th className="px-6 py-3 border-b border-gray-200">Vendor Name</th>
                <th className="px-6 py-3 border-b border-gray-200">Total Qty</th>
                <th className="px-6 py-3 border-b border-gray-200">Total PO Qty</th>
                <th className="px-6 py-3 border-b border-gray-200">Total Received Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-100 transition-colors duration-150"
                >
                  <td className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">
                    {row.serialNumber}
                  </td>
                  <td className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">
                    {row.vendorName}
                  </td>
                  <td className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">
                    {row.totalQty}
                  </td>
                  <td className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">
                    {row.totalPOQty}
                  </td>
                  <td className="px-6 py-4 border-b border-gray-200 whitespace-nowrap">
                    {row.totalReceivedQty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VendorDataPage;
