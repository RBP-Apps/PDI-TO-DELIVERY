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

const Approval = () => {
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

  // Google Apps Script endpoint (same as Planning)
  // Use Vite dev proxy to avoid CORS in local dev. Configure in vite.config.ts under '/gas'
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";
  const SHEET_NAME = "INDENT";
  const APPROVAL_LOG_SHEET = "Approval"; // audit log tab

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
          planningNo: (r[1] ?? "").toString().trim(),
          serialNumber: (r[2] ?? "").toString().trim(),
          date: (r[3] ?? "").toString().trim(),
          requesterName: (r[4] ?? "").toString().trim(),
          projectName: (r[5] ?? "").toString().trim(),
          firmName: (r[6] ?? "").toString().trim(),
          vendorName: (r[7] ?? "").toString().trim(),
          itemType: (r[8] ?? "").toString().trim(),
          itemName: (r[10] ?? "").toString().trim(),
          qty: (r[12] ?? "").toString().trim(),
          remarks: (r[15] ?? "").toString().trim(),
          state: (r[16] ?? "").toString().trim(),
          department: (r[17] ?? "").toString().trim(),
          status: (r[21] ?? "Pending Review").toString().trim(),
          userRemarks: "",
          planned: "Yes",
          actual1: (r[19] ?? "").toString().trim(),
        }));

        transformedData.push(...chunkData);

        // Allow UI to update between chunks
        if (i + CHUNK_SIZE < body.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Filter out empty rows
      const filteredData = transformedData.filter((r) =>
        Object.values(r).some((v) => (v || "").toString().trim() !== "")
      );

      const finalData = filteredData;

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

  // Separate pending and history based on status
  const pendingData = rows.filter(
    (item) => !item.actual1 || item.actual1.trim() === ""
  );
  const historyData = rows.filter(
    (item) => item.actual1 && item.actual1.trim() !== ""
  );

  const groupByPlanningNo = (data: any[]) => {
    const grouped = data.reduce((acc, item) => {
      const planningNo = item.planningNo;
      if (!acc[planningNo]) {
        acc[planningNo] = {
          ...item,
          itemCount: 1,
          allItems: [item] // Store all items with same planning no
        };
      } else {
        acc[planningNo].itemCount++;
        acc[planningNo].allItems.push(item);
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  };

  const groupedPendingData = groupByPlanningNo(pendingData);
  const groupedHistoryData = groupByPlanningNo(historyData);

  const currentData = activeTab === "pending" ? groupedPendingData : groupedHistoryData;

  const filteredData = currentData.filter((item) => {
    const matchesSearch = Object.values(item).some((value: any) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilter =
      filterStatus === "all" ||
      item.status.toLowerCase().includes(filterStatus);
    return matchesSearch && matchesFilter;
  });

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

  // Append audit log row to 'Approval' tab without changing GAS code
  const logDecisionToApproval = async (
    item: any,
    status: "Approved" | "Rejected"
  ) => {
    // GAS insert currently validates for >= 15 columns for INDENT.
    // To keep compatibility and avoid modifying GAS, pad the Approval row to 22 columns (A-V)
    const row: string[] = new Array(22).fill("");
    row[0] = formatDateTime(Date.now()); // Column A: Timestamp
    row[1] = item.planningNo || ""; // Column B: Planning No.
    row[2] = String(item.serialNumber || ""); // Column C: Serial Number
    row[3] = status; // Column D: Status
    row[4] = item.userRemarks || ""; // Column E: Remarks
    // Columns F-V remain empty for the Approval log sheet

    const params = new URLSearchParams();
    params.append("action", "insert");
    params.append("sheetName", APPROVAL_LOG_SHEET);
    params.append("rowData", JSON.stringify(row));

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      body: params,
    });
    if (!res.ok) throw new Error(`Failed to log decision (${res.status})`);
    return res.json().catch(() => ({}));
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

  // const handleApproval = async (id: number, action: "approve" | "reject") => {
  //   if (submitting[id]) return;
  //   const newStatus = action === "approve" ? "Approved" : "Rejected";
  //   const item = rows.find((r) => r.id === id);
  //   if (!item) return;

  //   // Optional validation: require remarks on rejection
  //   if (newStatus === "Rejected" && !item.userRemarks?.trim()) {
  //     setNotice({
  //       type: "error",
  //       message: "Please add remarks before rejecting.",
  //     });
  //     setTimeout(() => setNotice(null), 3000);
  //     return;
  //   }

  //   try {
  //     setSubmitting((s) => ({ ...s, [id]: true }));
  //     // 1) Append audit log to 'Approval' tab using action=insert, sheetName
  //     await logDecisionToApproval(item, newStatus as "Approved" | "Rejected");
  //     // 2) Update status/remarks/date in INDENT row
  //     // await updateSheetRow(item, newStatus);

  //     // 3) Update UI
  //     // const newRows = rows.map((r) => (r.id === id ? { ...r, status: newStatus } : r));

  //     const newRows = rows.map((r) =>
  //       r.id === id
  //         ? {
  //             ...r,
  //             status: newStatus,
  //             actual1: new Date().toLocaleDateString("en-US"), // Add approval date
  //           }
  //         : r
  //     );

  //     setRows(newRows);
  //     setNotice({ type: "success", message: `Decision saved: ${newStatus}` });
  //     setTimeout(() => setNotice(null), 2200);
  //   } catch (e: any) {
  //     console.error(e);
  //     setNotice({
  //       type: "error",
  //       message: e?.message || "Failed to save decision",
  //     });
  //     setTimeout(() => setNotice(null), 3500);
  //   } finally {
  //     setSubmitting((s) => ({ ...s, [id]: false }));
  //   }
  // };


  // REPLACE the entire handleApproval function with:
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

      // Find ALL items with the same Planning No
      const planningNo = item.planningNo;
      const allMatchingItems = rows.filter(r => r.planningNo === planningNo);

      // console.log(`Found ${allMatchingItems.length} items with Planning No: ${planningNo}`);

      // 1) Log decision for each item
      for (const matchingItem of allMatchingItems) {
        await logDecisionToApproval(matchingItem, newStatus as "Approved" | "Rejected");
      }

      // 2) Update UI for all matching items
      const newRows = rows.map((r) =>
        r.planningNo === planningNo
          ? {
            ...r,
            status: newStatus,
            actual1: new Date().toLocaleDateString("en-US"),
          }
          : r
      );

      setRows(newRows);
      setNotice({
        type: "success",
        message: `Decision saved: ${newStatus} (${allMatchingItems.length} items updated)`
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Approval Management
            </h1>
            <p className="text-gray-600">
              Review and approve procurement planning requests
            </p>
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


                {/* <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Serial Number
                </th> */}
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Date
                </th>
                {/* <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Requester Name
                </th> */}
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Project Name
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Firm Name
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Item Type
                </th>

                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Remarks
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  State
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Department
                </th>
                {activeTab === "pending" && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Planned
                  </th>
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
                        <button
                          className="p-1 text-blue-600 rounded transition-colors duration-200 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
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
                          onChange={(e) => {
                            const newRemarks = e.target.value;
                            const planningNo = item.planningNo;
                            // Update remarks for ALL items with same Planning No
                            setRows((prev) =>
                              prev.map((i) =>
                                i.planningNo === planningNo
                                  ? { ...i, userRemarks: newRemarks }
                                  : i
                              )
                            );
                          }}
                          className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              const planningNo = item.planningNo;
                              const allMatching = rows.filter(r => r.planningNo === planningNo);
                              allMatching.forEach(matchingItem => {
                                handleRemarksSubmit(matchingItem.id, e.currentTarget.value);
                              });
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
                        {item.userRemarks}
                      </span>
                    )}
                  </td>



                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {item.planningNo}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.vendorName}
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
                    {formatDateToDDMMYYYY(item.date)}
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

                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.itemType}
                  </td>

                  <td className="px-6 py-4 max-w-xs text-sm text-gray-900 truncate">
                    {item.remarks}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.state}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.department}
                  </td>
                  {activeTab === "pending" && (
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {item.planned}
                    </td>
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

export default Approval;
