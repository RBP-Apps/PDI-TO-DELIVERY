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
  "Pending Amount"?: number;
  Deduction?: number;
  status: string;
  Remarks: string;
  "Payment Status": string;
  "Payment Done": number;
  "Quotation No": string;
  Planned2: string;
  Actual2: string;
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
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Layout context to hide sidebar/header/footer when modal is open
  const { setAllHidden } = useLayout();

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      // console.log("[PaymentList] Fetching fresh data from server...");
      const targetUrl = `${SCRIPT_URL}?sheet=PO`;
      const url = import.meta.env.DEV ? `/gas?sheet=PO` : targetUrl;

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
      const headerRowIndex = 5;
      const headerRow = json.data[headerRowIndex];
      if (!headerRow) throw new Error("Header row not found in the data");
      const headers = headerRow.map((h: any) => String(h || "").trim());

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
          const item: Record<string, any> = {};
          headers.forEach((header: string, idx: number) => {
            item[header] = row[idx] ?? "";
          });
          return {
            "Planning No": String(row[1] || ""), // B - Planning No.
            "Serial Number": String(row[2] || ""), // C - Serial No.
            "PO No": String(row[3] || ""), // D - PO No.
            Date: row[4] ? String(row[4]) : "", // E - PO Date
            "Quotation No": String(row[5] || ""), // F - Quotation No
            "Vendor Name": String(row[6] || ""), // G - Vendor Name
            "Item Name": String(row[7] || ""), // H - Item Name
            Qty: Number(row[8] || 0), // I - Qty
            Rate: Number(row[9] || 0), // J - Rate
            "GST %": Number(row[10] || 0), // K - GST %
            Discount: String(row[11] || ""), // L - Discount
            "Grand Total Amount": Number(row[12] || 0), // M - Grand Total Amount
            "PO Copy": String(row[13] || ""), // N - PO Copy
            "Project Name": String(row[14] || ""), // O - Project Name
            "Firm Name": String(row[15] || ""), // P - Firm Name
            poStatus: String(row[16] || ""), // Q - Status (PO Status)
            Remarks: String(row[17] || ""), // R - Remarks
            "PO Signature Image": String(row[18] || ""), // S - PO Signature Image
            "Received Qty": Number(row[19] || 0), // T - Receiving Qty
            Balance: String(row[20] || ""), // U - Balance
            "Receiving Status": String(row[21] || ""), // V - Status (Receiving)
            Planned: String(row[22] || ""), // W - Planned
            Actual: String(row[23] || ""), // X - Actual
            Delay: String(row[24] || ""), // Y - Delay
            "Bill Type": String(row[25] || ""), // Z - Bill Type
            "Bill No": String(row[26] || ""), // AA - Bill No
            "Bill Date": String(row[27] || ""), // AB - Bill Date
            "Bill Amount": Number(row[28] || 0), // AC - Bill Amount
            "Deduction Amount": Number(row[29] || 0), // AD - Discount Amount
            "Bill Image": String(row[30] || ""), // AE - Bill Image
            "Transporter Name": String(row[31] || ""), // AF - Transporter Name
            "LR No.": String(row[32] || ""), // AG - LR No.
            status: String(row[33] || ""), // AH - Receiving Status (duplicate?)
            Remarks2: String(row[34] || ""), // AI - Remarks (duplicate?)
            Planned2: String(row[35] || ""), // AJ - Planned (duplicate?)
            Actual2: String(row[36] || ""), // AK - Actual (duplicate?)
            "Timer Delay": String(row[37] || ""), // AL - Timer Delay
            Status: String(row[38] || ""), // AM - Status (Timer?)
            "Payment Mode": String(row[39] || ""), // AN - Payment Mode
            "Payment Done": String(row[40] || ""), // AO - amount
            Reason: String(row[41] || ""), // AP - reason
            "Ref No": String(row[42] || ""), // AQ - ref no
            "Payment Status": String(row[43] || ""), // AR - Payment Status
            "Pending Amount": Number(row[44] || 0), // AS - Pending Amount
          };
        });

        transformedData.push(...chunkData);

        // Allow UI to update between chunks
        if (i + CHUNK_SIZE < dataRows.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // console.log("transformedData",transformedData);



      setData(transformedData);
      // console.log("[PaymentList] Loaded", transformedData.length, "records");
    } catch (err) {
      console.error("[PaymentList] Error:", err);
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      if (!isRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        // console.log(
        //   `[PaymentList] Retrying in ${delay}ms... (${retryCount + 1}/3)`
        // );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      // Prepare the data for Google Sheets
      const rowData = new Array(8).fill(""); // 8 columns: Timestamp, Planning No., Serial No., Payment Mode, amount, reason, ref no, Deduction
      rowData[0] = new Date().toLocaleDateString("en-US"); // Timestamp
      rowData[1] = selectedItem["Planning No"] || ""; // Planning No.
      rowData[2] = selectedItem["Serial Number"] || ""; // Serial No.
      rowData[3] = selectedItem["Payment Mode"] || ""; // Payment Mode
      rowData[4] = selectedItem.Amount || 0; // amount
      rowData[5] = selectedItem.Reason || ""; // reason
      rowData[6] = selectedItem["Reference No"] || ""; // ref no
      rowData[7] = selectedItem.Deduction || 0; // Deduction

      // Submit to Google Apps Script
      const submitUrl = import.meta.env.DEV
        ? `https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec`
        : SCRIPT_URL;

      const params = new URLSearchParams();
      params.append("action", "insert");
      params.append("sheetName", "Payment History");
      params.append("rowData", JSON.stringify(rowData));
      // params.append("serialNo", selectedItem["Serial Number"] || "");

      const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
        // console.log("[Payment] Parsed response:", result);
      } catch (parseError) {
        console.warn("[Payment] Could not parse response as JSON:", parseError);
        result = {
          success: false,
          error: responseText || "Invalid response from server",
        };
      }

      if (result.success === true) {
        // Update local data
        setData((prevData) =>
          prevData.map((d) =>
            d["PO No"] === selectedItem["PO No"] ? selectedItem : d
          )
        );

        alert("Payment details saved successfully!");
        setShowModal(false);
        await fetchData(true);
      } else {
        throw new Error(
          result.error || result.message || "Failed to save data"
        );
      }
    } catch (error) {
      console.error("Error saving payment data:", error);
      setFormErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data
    .filter((item) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (item["Planning No"] || "").toLowerCase().includes(q) ||
        (item["PO No"] || "").toLowerCase().includes(q) ||
        (item["Vendor Name"] || "").toLowerCase().includes(q) ||
        (item["Item Name"] || "").toLowerCase().includes(q) ||
        (item["Project Name"] || "").toLowerCase().includes(q) ||
        (item["Firm Name"] || "").toLowerCase().includes(q)
      );
    })
    .filter((item) => item["Payment Status"] === "Pending")
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
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  View
                </th>
                {[
                  "Planning No.",
                  "PO No.",
                  "Serial Number",
                  "Date",
                  "Vendor Name",
                  "Bill Amount",

                  "PO Copy",
                  "Project Name",
                  "Firm Name",
                  "Bill Type",
                  "Bill No",
                  "Bill Date",
                  "Deduction Amount",
                  "Bill Image",
                  "Transporter Name",
                  "LR No.",
                  "Payment Done",
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="mr-1 w-4 h-4" />
                          form
                        </button>
                        {item["PO Copy"] && (
                          <button
                            onClick={() =>
                              window.open(item["PO Copy"], "_blank")
                            }
                            className="text-blue-600 hover:text-blue-900"
                            title="View PO Copy"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    {[
                      "Planning No",
                      "PO No",
                      "Serial Number",
                      "Date",
                      "Vendor Name",
                      "Bill Amount",

                      "PO Copy",
                      "Project Name",
                      "Firm Name",
                      "Bill Type",
                      "Bill No",
                      "Bill Date",
                      "Deduction Amount",
                      "Bill Image",
                      "Transporter Name",
                      "LR No.",
                      "Payment Done",
                    ].map((colKey) => {
                      const value = item[colKey as keyof PaymentItem];
                      return (
                        <td
                          key={colKey}
                          className="px-4 py-3 whitespace-nowrap"
                        >
                          {colKey === "PO Copy" ||
                            (colKey == "Bill Image" && value) ? (
                            <a
                              href={String(value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 underline hover:text-blue-900"
                              title="Click to view PO Copy"
                            >
                              <Download className="mr-1 w-4 h-4" />
                              View Document
                            </a>
                          ) : typeof value === "number" ? (
                            value.toLocaleString()
                          ) : colKey === "Bill Date" || colKey == "Date" ? (
                            formatDateToDDMMYYYY(value)
                          ) : (
                            value || "-"
                          )}
                        </td>
                      );
                    })}
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

      {/* Payment Form Modal */}
      {showModal && selectedItem && (
        <div className="overflow-y-auto fixed inset-0 z-50">
          <div className="flex justify-center items-center px-4 pt-4 pb-20 min-h-screen text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setShowModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block overflow-hidden px-4 pt-5 pb-4 text-left align-bottom bg-white rounded-2xl shadow-xl transition-all transform sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="sm:flex sm:items-start">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Payment Details
                          </h3>
                          <p className="text-sm text-gray-500">
                            PO Number:{" "}
                            <span className="font-medium text-blue-600">
                              {selectedItem["PO No"]}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
                        onClick={() => setShowModal(false)}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                      {/* Order Information Section */}
                      <div className="p-6 bg-gradient-to-r to-gray-50 rounded-xl border border-gray-200 from-slate-50">
                        <h4 className="flex items-center mb-4 text-base font-semibold text-gray-900">
                          <svg
                            className="mr-2 w-5 h-5 text-slate-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Order Information
                        </h4>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Planning No.
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Planning No"] || "-"}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              PO No.
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["PO No"] || "-"}
                            </div>
                          </div>
                          {/* <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Serial Number
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Serial Number"] || "-"}
                            </div>
                          </div> */}
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Bill Date
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateToDDMMYYYY(
                                selectedItem["Bill Date"]
                              ) || "-"}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Bill No
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Bill No"] || "-"}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Vendor Name
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Vendor Name"] || "-"}
                            </div>
                          </div>
                          {/* <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Item Name
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Item Name"] || "-"}
                            </div>
                          </div> */}
                          <div>
                            {/* <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Qty
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Qty"]?.toLocaleString() || "0"}
                            </div> */}
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Project Name
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Project Name"] || "-"}
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Firm Name
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Firm Name"] || "-"}
                            </div>
                          </div>
                          <div className="md:col-span-2 lg:col-span-1">
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              PO Copy
                            </label>
                            <div className="text-sm">
                              {selectedItem["PO Copy"] ? (
                                <a
                                  href={selectedItem["PO Copy"]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
                                >
                                  <svg
                                    className="mr-1 w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  View Document
                                </a>
                              ) : (
                                <span className="font-medium text-gray-400">
                                  -
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Total Amount
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Bill Amount"] || "-"}
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Payment Done
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Payment Done"] || "-"}
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Remaining Payment
                            </label>
                            <div className="text-sm font-medium text-gray-900">
                              {selectedItem["Bill Amount"] -
                                selectedItem["Payment Done"] || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Payment Information Section */}
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                        <h4 className="flex items-center mb-4 text-base font-semibold text-gray-900">
                          <svg
                            className="mr-2 w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Payment Information
                        </h4>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Payment Mode
                            </label>
                            <select
                              value={selectedItem["Payment Mode"] || ""}
                              onChange={(e) => {
                                if (!selectedItem) return;
                                setSelectedItem((prev) => ({
                                  ...prev!,
                                  "Payment Mode": e.target.value,
                                }));
                              }}
                              className="block px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            >
                              <option value="">Select Payment Mode</option>
                              <option value="Credit">Credit</option>
                              <option value="Cheque">Cheque</option>
                              <option value="RTGS">RTGS</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>

                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Amount
                            </label>
                            <div className="relative">
                              <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">
                                  ₹
                                </span>
                              </div>
                              <input
                                type="number"
                                value={selectedItem.Amount || ""}
                                onChange={(e) => {
                                  if (!selectedItem) return;
                                  setSelectedItem((prev) => ({
                                    ...prev!,
                                    Amount: parseFloat(e.target.value) || 0,
                                  }));
                                }}
                                className="block py-2 pr-3 pl-8 w-full text-sm bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
                              Deduction
                            </label>
                            <div className="relative">
                              <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">
                                  ₹
                                </span>
                              </div>
                              <input
                                type="number"
                                value={selectedItem.Deduction || ""}
                                onChange={(e) => {
                                  if (!selectedItem) return;
                                  setSelectedItem((prev) => ({
                                    ...prev!,
                                    Deduction: parseFloat(e.target.value) || 0,
                                  }));
                                }}
                                className="block py-2 pr-3 pl-8 w-full text-sm bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details Section */}
                      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="flex items-center mb-4 text-base font-semibold text-gray-900">
                          <svg
                            className="mr-2 w-5 h-5 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Additional Details
                        </h4>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor="reason"
                              className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase"
                            >
                              Reason
                            </label>
                            <textarea
                              id="reason"
                              rows={3}
                              value={selectedItem.Reason || ""}
                              onChange={(e) => {
                                if (!selectedItem) return;
                                setSelectedItem((prev) => ({
                                  ...prev!,
                                  Reason: e.target.value,
                                }));
                              }}
                              className="block px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter payment reason..."
                              disabled={isSubmitting}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="referenceNo"
                              className="block mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase"
                            >
                              Reference Number
                            </label>
                            <input
                              id="referenceNo"
                              type="text"
                              value={selectedItem["Reference No"] || ""}
                              onChange={(e) => {
                                if (!selectedItem) return;
                                setSelectedItem((prev) => ({
                                  ...prev!,
                                  "Reference No": e.target.value,
                                }));
                              }}
                              className="block px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter reference number"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center px-6 py-4 mt-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowModal(false)}
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg border border-transparent shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="mr-2 -ml-1 w-4 h-4 text-white animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="mr-2 -ml-1 w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Save Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {formErrors.submit && (
                  <div className="p-3 mx-6 mt-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-400">
                    <div className="flex items-center">
                      <svg
                        className="mr-2 w-5 h-5 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formErrors.submit}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
