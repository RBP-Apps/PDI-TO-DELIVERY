import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const POHistory = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>(
    {}
  );

  // Google Apps Script endpoint (same as Planning)
  // Use Vite dev proxy to avoid CORS in local dev. Configure in vite.config.ts under '/gas'
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";
  const SHEET_NAME = "PO";

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    // console.log("[Approval] Fetching fresh data from server...");
    try {
      // Fetch INDENT sheet data
      const indentResponse = await fetch(
        `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}`,
        {
          method: "GET",
        }
      );

      if (!indentResponse.ok)
        throw new Error(
          `Failed to fetch INDENT data: ${indentResponse.status}`
        );

      const indentJson = await indentResponse.json();
      const indentData: any[][] = indentJson.data || [];

      // Process INDENT data first
      const START_ROW_INDEX = 6;
      const body = indentData.slice(START_ROW_INDEX);

      // Process data in chunks to avoid blocking the main thread
      const CHUNK_SIZE = 100;
      const transformedData: any[] = [];

      for (let i = 0; i < body.length; i += CHUNK_SIZE) {
        const chunk = body.slice(i, i + CHUNK_SIZE);
        const chunkData = chunk.map((r, index) => ({
          id: index + 1 + i,
          timestamp: (r[0] ?? "").toString().trim(),
          planningNo: (r[1] ?? "").toString().trim(),
          serialNo: (r[2] ?? "").toString().trim(),
          poNO: (r[3] ?? "").toString().trim(),
          poDate: (r[4] ?? "").toString().trim(),
          quotationNo: (r[5] ?? "").toString().trim(),
          vendoreName: (r[6] ?? "").toString().trim(),
          itemName: (r[7] ?? "").toString().trim(),
          qty: (r[8] ?? "").toString().trim(),
          rate: (r[9] ?? "").toString().trim(),
          gst: (r[10] ?? "").toString().trim(),
          discount: (r[11] ?? "").toString().trim(),
          grandTotalAmount: (r[12] ?? "").toString().trim(),
          poCopy: (r[13] ?? "").toString().trim(),
          projectName: (r[14] ?? "").toString().trim(),
          firmName: (r[15] ?? "").toString().trim(),
          poStatus: (r[16] ?? "").toString().trim(),
          poRemarks: (r[17] ?? "").toString().trim(),
          poSignatureImage: (r[18] ?? "").toString().trim(),
          receivingQuantity: (r[19] ?? "").toString().trim(),
          balance: (r[20] ?? "").toString().trim(),
          receivingStatus: (r[21] ?? "").toString().trim(),
          planned1: (r[22] ?? "").toString().trim(),
          actual1: (r[23] ?? "").toString().trim(),
          delay1: (r[24] ?? "").toString().trim(),
          billType: (r[25] ?? "").toString().trim(),
          billNo: (r[26] ?? "").toString().trim(),
          billDate: (r[27] ?? "").toString().trim(),
          billAmount: (r[28] ?? "").toString().trim(),
          discountAmount: (r[29] ?? "").toString().trim(),
          billImage: (r[30] ?? "").toString().trim(),
          transpoterName: (r[31] ?? "").toString().trim(),
          lrNo: (r[32] ?? "").toString().trim(),
          status: (r[33] ?? "").toString().trim(),
          remarks: (r[34] ?? "").toString().trim(),
          planned2: (r[35] ?? "").toString().trim(),
          actual2: (r[36] ?? "").toString().trim(),
          timerDelay: (r[37] ?? "").toString().trim(),
          paymentStatus: (r[38] ?? "").toString().trim(),
          paymentMode: (r[39] ?? "").toString().trim(),
          amount: (r[40] ?? "").toString().trim(),
          reason: (r[41] ?? "").toString().trim(),
          refNo: (r[42] ?? "").toString().trim(),
          paymentStatusFinal: (r[43] ?? "").toString().trim(),
          productRate: (r[44] ?? "").toString().trim(),
        }));

        transformedData.push(...chunkData);

        // Allow UI to update between chunks
        if (i + CHUNK_SIZE < body.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Filter out empty rows
      // Filter out empty rows - check key fields that should have data
      const filteredData = transformedData.filter((r) => {
        // Check if essential fields have meaningful data
        const hasPlanning = (r.planningNo || "").toString().trim() !== "";
        const hasVendor = (r.vendoreName || "").toString().trim() !== "";
        const hasItem = (r.itemName || "").toString().trim() !== "";

        // Row is valid only if it has at least planning number AND (vendor OR item)
        return hasPlanning && (hasVendor || hasItem);
      });

      const finalData = filteredData;

      // console.log("finalData",finalData);

      setRows(finalData);
      // console.log("[Approval] Loaded", finalData.length, "records");
    } catch (e: any) {
      setError(e?.message || "Failed to load approval data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  // Group rows by Planning Number and merge data
  const groupByPlanningNo = (data: any[]) => {
    const grouped = data.reduce((acc: Record<string, any>, item) => {
      const key = item.planningNo;
      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = { ...item };
      } else {
        // Combine item names, quantities, and vendor names
        if (item.itemName && !acc[key].itemName.includes(item.itemName)) {
          acc[key].itemName += `, ${item.itemName}`;
        }
        if (item.qty) {
          acc[key].qty = acc[key].qty
            ? `${acc[key].qty}, ${item.qty}`
            : item.qty;
        }
        if (
          item.vendoreName &&
          !acc[key].vendoreName.includes(item.vendoreName)
        ) {
          acc[key].vendoreName += `, ${item.vendoreName}`;
        }
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  // Separate pending and history based on status
  const pendingData = groupByPlanningNo(
    rows.filter((item) => item.poStatus === "")
  );
  const historyData = groupByPlanningNo(
    rows.filter((item) => item.poStatus !== "")
  );

  // console.log("pendingData",pendingData);

  const currentData = activeTab === "pending" ? pendingData : historyData;

  // console.log("pendingData",pendingData);

  const filteredData = currentData.filter((item) => {
    const matchesSearch = Object.values(item).some((value: any) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilter =
      filterStatus === "all" ||
      item.status.toLowerCase().includes(filterStatus);
    return matchesSearch && matchesFilter;
  });

  // console.log("filteredData",filteredData);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending review":
      case "pending approval":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatDateTime = (date: any) => {
    // Convert to Date object if it's a timestamp
    const dateObj = typeof date === "number" ? new Date(date) : date;

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const uploadFileToGoogleDrive = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1]; // Remove data:image/png;base64, prefix

          const params = new URLSearchParams();
          params.append("action", "uploadFile");
          params.append("base64Data", base64Data);
          params.append("fileName", file.name);
          params.append("mimeType", file.type);
          params.append("folderId", "1x8zdRdbZn-rTL769dkgUdBHpDPpRiLDZ"); // Your folder ID

          const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: params,
          });

          if (!response.ok) throw new Error("File upload failed");
          const data = await response.json();

          if (!data.success) throw new Error(data.error || "Upload failed");

          resolve(data.fileUrl);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsDataURL(file); // Convert to base64
    });
  };

  const updateSheetRow = async (
    item: any,
    newStatus: string,
    fileUrl: string = ""
  ) => {
    try {
      // Find the local index in rows
      const localIndex = rows.findIndex((r) => r.id === item.id);
      if (localIndex === -1) return;

      // Calculate sheet row number (1-based)
      const START_ROW_INDEX = 6; // Zero-based, data starts from row 7 (1-based)
      const sheetRow = localIndex + START_ROW_INDEX + 1; // +1 for 1-based

      // console.log("item", item);
      // console.log("newStatus", newStatus);
      // console.log("fileUrl", fileUrl);

      // Prepare row data array for update (only non-empty values, 20 columns A-T)
      const rowData = new Array(47).fill("");
      rowData[16] = newStatus;
      rowData[17] = item.userRemarks || "";
      rowData[18] = fileUrl;

      const params = new URLSearchParams();
      params.append("action", "POupdate");
      // Align with GAS code expecting 'sheetName' in doPost
      params.append("sheetName", "PO");
      params.append("rowIndex", String(sheetRow));
      params.append("rowData", JSON.stringify(rowData));
      params.append("poNo", item.planningNo || "");
      // params.append("serialNo", item.serialNo || "");

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        body: params,
      })
        .then((res) => res.json())
        .then((data) => console.log("Update response:", data))
        .catch((err) => console.error("Update error:", err));

      // console.log(`Updated row ${sheetRow} to ${newStatus}`);
    } catch (e) {
      console.error("Failed to update sheet:", e);
    }
  };

  const handleApproval = async (id: number, action: "approve" | "reject") => {
    if (submitting[id]) return;
    const newStatus = action === "approve" ? "Approved" : "Rejected";
    const item = rows.find((r) => r.id === id);
    if (!item) return;

    // Optional validation: require remarks on rejection
    if (newStatus === "Rejected" && !item.userRemarks?.trim()) {
      setNotice({
        type: "error",
        message: "Please add remarks before rejecting.",
      });
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    try {
      setSubmitting((s) => ({ ...s, [id]: true }));

      let fileUrl = "";
      if (item.uploadedFile) {
        setUploadingFiles((s) => ({ ...s, [id]: true }));
        fileUrl = await uploadFileToGoogleDrive(item.uploadedFile);
        setUploadingFiles((s) => ({ ...s, [id]: false }));
      }

      await updateSheetRow(item, newStatus, fileUrl);

      // 3) Update UI
      // const newRows = rows.map((r) => (r.id === id ? { ...r, status: newStatus } : r));

      const newRows = rows.map((r) =>
        r.planningNo === item.planningNo
          ? {
            ...r,
            poStatus: newStatus,
            fileUrl: fileUrl,
            actual1: new Date().toLocaleDateString("en-US"), // Add approval date
          }
          : r
      );

      setRows(newRows);
      setNotice({ type: "success", message: `Decision saved: ${newStatus}` });
      setTimeout(() => setNotice(null), 2200);
    } catch (e: any) {
      console.error(e);
      setNotice({
        type: "error",
        message: e?.message || "Failed to save decision",
      });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setSubmitting((s) => ({ ...s, [id]: false }));
    }
  };

  const handleRemarksSubmit = (id: number, remarks: string) => {
    setRows((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, userRemarks: remarks } : item
      )
    );
  };

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

  // console.log("filteredData", filteredData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              PO History
            </h1>
            <p className="text-gray-600">Approve, Cancel or reject PO</p>
          </div>
          <div className="flex gap-3 items-center">
            {error && (
              <div className="flex gap-2 items-center px-3 py-1.5 text-red-700 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            <button
              onClick={() => loadRows()}
              disabled={loading}
              className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50"
            >
              <Clock
                className={`w-4 h-4 ${loading ? "text-blue-600 animate-spin" : "text-gray-500"
                  }`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-6 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <Clock className="mx-auto mb-2 w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading data from Google Sheet...</p>
        </div>
      )}

      {notice && (
        <div
          className={`p-4 bg-white rounded-xl border shadow-sm ${notice.type === "success" ? "border-green-200" : "border-red-200"
            }`}
        >
          <div
            className={`flex items-center space-x-2 ${notice.type === "success" ? "text-green-700" : "text-red-700"
              }`}
          >
            {notice.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notice.message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-white rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Error loading data:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex px-6 space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending ({pendingData.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>History ({historyData.length})</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search approvals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-3 pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="py-2 pr-3 pl-10 w-full rounded-lg border border-gray-300 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex justify-end items-center">
              <span className="text-sm text-gray-600">
                {filteredData.length} of {currentData.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === "pending" && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Action
                  </th>
                )}

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  User Remarks
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Planning No.
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Vendor Name
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Item Name
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Qty
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Date
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Project Name
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Firm Name
                </th>

                {/* <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Item Type
                </th> */}

                {/* <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Remarks
                </th> */}

                {activeTab === "pending" && (
                  <>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      PO Copy
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Upload File
                    </th>
                  </>
                )}

                {activeTab === "history" && (
                  <>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Upload File
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors duration-150 hover:bg-gray-50"
                >
                  {activeTab === "pending" && (
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproval(item.id, "approve")}
                          disabled={!!submitting[item.id]}
                          className={`p-1 rounded transition-colors duration-200 ${submitting[item.id]
                              ? "text-green-300 cursor-not-allowed"
                              : "text-green-600 hover:text-green-900"
                            }`}
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleApproval(item.id, "reject")}
                          disabled={!!submitting[item.id]}
                          className={`p-1 rounded transition-colors duration-200 ${submitting[item.id]
                              ? "text-red-300 cursor-not-allowed"
                              : "text-red-600 hover:text-red-900"
                            }`}
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.poStatus)}
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          item.poStatus
                        )}`}
                      >
                        {item.poStatus}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {activeTab === "pending" ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Add remarks..."
                          value={item.userRemarks}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? { ...i, userRemarks: e.target.value }
                                  : i
                              )
                            )
                          }
                          className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleRemarksSubmit(
                                item.id,
                                e.currentTarget.value
                              );
                            }
                          }}
                        />
                        <button
                          className="p-1 text-blue-600 rounded transition-colors duration-200 hover:text-blue-900"
                          title="Add Remarks"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">
                        {item.poRemarks}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.planningNo}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.vendoreName}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.qty}
                  </td>

                  {/* <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.serialNumber}
                  </td> */}
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {formatDateToDDMMYYYY(item.Date)}
                  </td>
                  {/* <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.requesterName}
                  </td> */}
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.projectName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.firmName}
                  </td>
                  {/* 
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.billType}
                  </td> */}

                  {/* <td className="px-6 py-4 max-w-xs text-sm text-gray-900 truncate">
                    {item.remarks}
                  </td> */}

                  {activeTab === "pending" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.poCopy ? (
                          <button
                            onClick={() => window.open(item.poCopy, "_blank")}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100"
                          >
                            <Eye className="mr-1.5 w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">No file</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRows((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? { ...i, uploadedFile: file }
                                    : i
                                )
                              );
                            }
                          }}
                          className="text-sm text-gray-600"
                          disabled={uploadingFiles[item.id]}
                        />
                        {uploadingFiles[item.id] && (
                          <span className="text-xs text-blue-600">
                            Uploading...
                          </span>
                        )}
                      </td>
                    </>
                  )}

                  {activeTab === "history" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.poSignatureImage ? (
                          <button
                            onClick={() => window.open(item.poSignatureImage, "_blank")}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100"
                          >
                            <Eye className="mr-1.5 w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">No file</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="py-12 text-center">
            <div className="mb-2 text-gray-400">
              {activeTab === "pending" ? (
                <Clock className="mx-auto w-12 h-12" />
              ) : (
                <CheckCircle className="mx-auto w-12 h-12" />
              )}
            </div>
            <h3 className="mb-1 text-lg font-medium text-gray-900">
              No {activeTab === "pending" ? "pending" : "history"} items found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default POHistory;
