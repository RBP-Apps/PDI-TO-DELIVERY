import React, { useState, useEffect } from "react";
import { Search, RotateCw, Eye, X, Download } from "lucide-react";
import { useLayout } from "../contexts/LayoutContext";

// Define the PaymentItem interface
interface PaymentItem {
  "Planning No": string;
  "PO No": string;
  "Serial Number": string;
  Date: string;
  "Vendor Name": string;
  "Item Name": string;
  Qty: number;
  "PO Copy": string;
  "Project Name": string;
  "Firm Name": string;

  "Bill Type": string;
  "Bill No": string;
  "Bill Date": string;
  "Bill Amount": number;
  "Discount Amount": number;
  "Bill Image": string;
  "Transporter Name": string;
  "LR No.": string;

  Status?: string;
  "Payment Mode"?: string;
  Reason?: string;
  Amount?: number;
  "Reference No"?: string;
  "GST %"?: number;
  Discount?: number;
  "Grand Total Amount"?: number;
  "Product Rate"?: number;
  "Invoice No"?: string;
  "Invoice Date"?: string;
  status: string;
  Remarks: string;
  "Payment Status": string;
  "Payment Done": number;
  "Quotation No": string;

  Timestamp: string;
  Deduction: number;
}

// Google Apps Script URL
const SCRIPT_URL = `https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec`;


const PaymentList: React.FC = () => {
  const [data, setData] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [retryCount, setRetryCount] = useState<number>(0);

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);

  const [selectedPlanningData, setSelectedPlanningData] = useState<
    PaymentItem[]
  >([]);
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  // Layout context to hide sidebar/header/footer when modal is open
  const { setAllHidden } = useLayout();

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      // console.log("[PaymentList] Fetching fresh data from server...");
      const targetUrl = `${SCRIPT_URL}?sheet=Payment History`;
      const url = import.meta.env.DEV
        ? `/gas?sheet=Payment History`
        : targetUrl;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      if (
        !responseText.trim().startsWith("{") &&
        !responseText.trim().startsWith("[")
      ) {
        throw new Error(
          `Expected JSON but got: ${responseText.slice(0, 80)}...`
        );
      }

      const json = JSON.parse(responseText);
      if (json.error) throw new Error(json.error);
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error("No data returned from the server");
      }

      // Header row is index 5 per sheet structure
      const headerRowIndex = 0;
      const headerRow = json.data[headerRowIndex];
      if (!headerRow) throw new Error("Header row not found in the data");


      // Data rows start from index 6; filter out empty ones
      const dataRows = json.data
        .slice(headerRowIndex + 1)
        .filter(
          (row: any[]) =>
            row && row.some((cell) => String(cell ?? "").trim() !== "")
        );

      // Process data in chunks to avoid blocking the main thread
      const CHUNK_SIZE = 100;
      const transformedData: PaymentItem[] = [];

      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        const chunk = dataRows.slice(i, i + CHUNK_SIZE);
        const chunkData = chunk.map((row: any[]) => {
          return {
            Timestamp: String(row[0] || ""), // A - Timestamp
            "Planning No": String(row[1] || ""), // B - Planning No
            "Serial Number": String(row[2] || ""), // C - Serial No
            "Payment Mode": String(row[3] || ""), // D - Payment Mode
            Amount: Number(row[4] || 0), // E - amount
            Reason: String(row[5] || ""), // F - reason
            "Reference No": String(row[6] || ""), // G - ref no
            Deduction: Number(row[7] || 0), // H - Deduction
            "Vendor Name": String(row[8] || 0), // H - Deduction
            "Bill No": String(row[9] || 0), // H - Deduction
          };
        });

        transformedData.push(...chunkData);

        // Allow UI to update between chunks
        if (i + CHUNK_SIZE < dataRows.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      setData(transformedData);
      // console.log("[PaymentList] Loaded", transformedData.length, "records");
    } catch (err) {
      console.error("[PaymentList] Error:", err);
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      if (!isRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(
          `[PaymentList] Retrying in ${delay}ms... (${retryCount + 1}/3)`
        );
        setTimeout(() => {
          setRetryCount((prev: number) => prev + 1);
          fetchData(true);
        }, delay);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchData(true);
  }, []);

  // Hide layout elements when modal is open
  useEffect(() => {
    setAllHidden(showModal);
    return () => {
      setAllHidden(false);
    };
  }, [showModal, setAllHidden]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  // Filter data (no pagination)
  // Filter data (no pagination)
  // console.log("data",data);
  const filteredData = data
    .filter((item) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (item["Planning No"] || "").toLowerCase().includes(q) ||
        (item["Serial Number"] || "").toLowerCase().includes(q) ||
        (item["Payment Mode"] || "").toLowerCase().includes(q) ||
        (item["Reference No"] || "").toLowerCase().includes(q) ||
        (item.Reason || "").toLowerCase().includes(q) ||
        (item["Vendor Name"] || "").toLowerCase().includes(q) ||
        (item["Bill No"] || "").toLowerCase().includes(q)

      );
    })
    .reduce((unique: PaymentItem[], item) => {
      if (!unique.find((u) => u["Planning No"] === item["Planning No"])) {
        unique.push(item);
      }
      return unique;
    }, []);

  // Loading and error states
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded-lg">
        Error: {error}
      </div>
    );
  }

  const formatDateToDDMMYYYY = (dateString: any) => {
    if (!dateString) return "N/A";

    let date;
    // Regex to match "Date(YYYY,MM,DD,HH,MM,SS)" or "Date(YYYY,MM,DD)"
    const dateMatch = dateString.match(
      /^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,(\d{1,2}),(\d{1,2}),(\d{1,2}))?\)$/
    );

    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10); // Month from GS is already 0-indexed
      const day = parseInt(dateMatch[3], 10);
      const hours = dateMatch[4] ? parseInt(dateMatch[4], 10) : 0;
      const minutes = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
      const seconds = dateMatch[6] ? parseInt(dateMatch[6], 10) : 0;

      date = new Date(year, month, day, hours, minutes, seconds);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      console.error("Invalid Date object after parsing:", dateString);
      return "N/A";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Add 1 for 1-indexed display
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // console.log("selectedItem", selectedItem);
  // console.log("filteredData", filteredData);

  return (
    <div className="space-y-6">
      {/* Search and Refresh */}
      <div className="flex flex-col gap-4 justify-between p-6 bg-white rounded-xl border border-gray-200 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="py-2 pr-3 pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setRetryCount(0);
            fetchData(true); // Pass true to bypass cache
          }}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RotateCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {/* <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  View
                </th> */}
                {[
                  "Planning No",
                  "Bill No",
                  "Vendor Name",
                  "Timestamp",
                  "Payment Mode",
                  "Amount",
                  "Reason",
                  "Reference No",
                  "Deduction",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const planningData = data.filter(
                            (row) => row["Planning No"] === item["Planning No"]
                          );
                          setSelectedPlanningData(planningData);
                          setShowPlanningModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                      >
                        {item["Planning No"] || "-"}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Bill No"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Vendor Name"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateToDDMMYYYY(item.Timestamp) || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Payment Mode"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Amount?.toLocaleString() || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Reason || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Reference No"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Deduction?.toLocaleString() || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="px-4 py-12 text-center">
                    <Search className="mx-auto w-12 h-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      No payments found
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "No data available"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planning Data Modal */}
      {showPlanningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Payment History: {selectedPlanningData[0]?.["Planning No"]}
              </h2>
              <button
                onClick={() => setShowPlanningModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Serial Number",
                        "Timestamp",
                        "Bill No",
                        "Vendor Name",
                        "Payment Mode",
                        "Amount",
                        "Reason",
                        "Reference No",
                        "Deduction",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPlanningData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Serial Number"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {formatDateToDDMMYYYY(item.Timestamp) || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Bill No"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Vendor Name"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Payment Mode"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                          ₹{item.Amount?.toLocaleString() || "-"}
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-gray-700 max-w-48 truncate"
                          title={item.Reason}
                        >
                          {item.Reason || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Reference No"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                          ₹{item.Deduction?.toLocaleString() || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
