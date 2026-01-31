import React, { useState, useEffect } from "react";
import { Search, Eye, RotateCw, X, ChevronRight } from "lucide-react";
import { useLayout } from "../contexts/LayoutContext";
import { RiFolderReceivedFill } from "react-icons/ri";

interface POItem {
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
  // Financial fields
  "Gross Amount": number;
  "PO Amount": number;
  "Tax Amount": number;
  "Total Amount": number;
  "PO Qty": number;
  "Received Qty": number;
  Rate: number;
  status: string;
  Remarks: string;
  "Quotation No": string;
  "GST %": number;
  Discount: number;
  "Grand Total Amount": number;
  "Product Rate": number;
  poStatus: string;
  Planned: string;
  Actual: string;
  Status: string;
  GST: number;
  ReceivedQty: number;

  "Bill Type": string;
  "Bill No": string;
  "Bill Date": string;
  "Bill Amount": number;
  "Discount Amount": number;
  "Bill Image": string;
  "Transporter Name": string;
  "LR No.": string;
  TransportCharge?: number;
  _isDirty?: boolean; // Track if the row has been modified
}

type GroupedPOItem = {
  planningNo: string;
  items: POItem[];
  itemCount: number;
  displayItem: POItem;
};

const POList = () => {
  const [data, setData] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<POItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<GroupedPOItem | null>(
    null
  );
  const [groupItems, setGroupItems] = useState<POItem[]>([]);

  const [billStatus, setBillStatus] = useState("No");
  const [billNo, setBillNo] = useState("");
  const [billImage, setBillImage] = useState<File | string>("");
  const [billAmount, setBillAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [transportCharge, setTransportCharge] = useState("");

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<POItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";

  // Layout context to hide sidebar/header/footer when modal is open
  const { setAllHidden } = useLayout();

  const validateForm = (formData: POItem) => {
    const errors: Record<string, string> = {};

    // Validate numeric fields are positive numbers
    const numericFields = [
      "Gross Amount",
      "PO Amount",
      "Tax Amount",
      "Total Amount",
      "PO Qty",
      "Received Qty",
      "Rate",
      "TransportCharge", // ADD THIS
    ];
    numericFields.forEach((field) => {
      const value = formData[field as keyof POItem];
      if (
        value === null ||
        value === undefined ||
        (typeof value === "number" && value < 0)
      ) {
        errors[field] = "Must be a positive number";
      }
    });

    return errors;
  };

  const fetchHistoryData = async () => {
    try {
      setHistoryLoading(true);
      const targetUrl = `${SCRIPT_URL}?sheet=Received History`;
      const url = import.meta.env.DEV
        ? `/gas?sheet=Received History`
        : targetUrl;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      if (json.error) throw new Error(json.error);

      const headerRowIndex = 0; // Adjust based on your sheet structure
      const dataRows = json.data.slice(headerRowIndex + 1);

      const transformedData = dataRows.map((row: any[]) => ({
        "Planning No": String(row[1] || ""),
        "Bill No": String(row[5] || ""),
        "Bill Date": String(row[6] || ""),
        "Bill Amount": Number(row[7] || 0),
        "Bill Image": String(row[9] || ""),

        "PO No": String(row[12] || ""), // Adjust column index
        "Firm Name": String(row[13] || ""), // Get from PO sheet mapping
        "Vendor Name": String(row[14] || ""),
      }));

      setHistoryData(transformedData);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // console.log("Ram 1")

    if (!selectedGroup || groupItems.length === 0) return;

    // Filter items tracking changes
    const itemsToSubmit = groupItems.filter(item => item._isDirty);

    if (itemsToSubmit.length === 0) {
      alert("No changes detected to save.");
      return;
    }
    // console.log("Ram 2")

    // Validate all items in the group
    let hasErrors = false;
    const allErrors: Record<string, string> = {};

    groupItems.forEach((item, index) => {
      const errors = validateForm(item);
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
        // Add item index to error keys for identification
        Object.entries(errors).forEach(([key, value]) => {
          allErrors[`${key}-${index}`] = value;
        });
      }
    });

    setIsSubmitting(true);

    try {
      let billImageUrl = "";

      // Upload file to Google Drive if bill status is Yes and file exists
      if (billImage instanceof File) {
        try {
          // Convert file to base64
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(billImage);
          });

          const params = new URLSearchParams();
          params.append("action", "uploadFile");
          params.append("base64Data", base64Data);
          params.append("fileName", billImage.name);
          params.append("mimeType", billImage.type);
          params.append("folderId", "1k-242_owD34uWm1IQ3WoqzfD_6SFJrXm"); // Replace with actual folder ID

          const uploadResponse = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            // console.log("uploadResult", uploadResult);
            billImageUrl = uploadResult.fileUrl || "";
            // console.log("File uploaded successfully, URL:", billImageUrl);
          } else {
            const errorText = await uploadResponse.text();
            // console.error("Upload response error:", errorText);
            throw new Error(`Failed to upload file: ${uploadResponse.status}`);
          }
        } catch (uploadError) {
          // console.error("File upload error:", uploadError);
          throw new Error(
            `File upload failed: ${uploadError instanceof Error
              ? uploadError.message
              : "Unknown error"
            }`
          );
        }
      }

      // Calculate the grand total from the current items
      const calculatedGrandTotal = groupItems.reduce((total, item) => {
        return total + parseFloat(calculateTotalAmount(item));
      }, 0);

      // Submit only dirty items
      const submissionPromises = itemsToSubmit.map(async (item) => {
        const rowData = [
          new Date().toISOString(), // Timestamp (A) - column 0
          item["Planning No"], // Planning No. (B) - column 1
          item["Serial Number"], // Serial No. (C) - column 2
          billStatus || "", // Bill Type (D) - column 3
          Number(item["Received Qty"]) || 0, // Received Qty (E) - column 4
          billNo, // Bill No (F) - column 5
          billDate, // Bill Date (G) - column 6
          Number(calculatedGrandTotal.toFixed(2)), // Bill Amount (H) - column 7 (Calculated Grand Total)
          Number(discountAmount) || 0, // Discount Amount (I) - column 8
          billImageUrl || "", // Bill Image (J) - column 9
          transporterName || "", // Transporter Name (K) - column 10
          lrNo || "", // LR No. (L) - column 11
          "",
          "",
          "",
          Number(transportCharge) || 0,
        ];

        const params = new URLSearchParams();
        params.append("action", "insert");
        params.append("sheetName", "Received History"); // Your new sheet name
        params.append("rowData", JSON.stringify(rowData));
        // params.append("poNo", item["Planning No"] || "");
        // params.append("serialNo", item["Serial Number"] || "");

        const fullUrl = import.meta.env.DEV
          ? `https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec`
          : SCRIPT_URL;

        const response = await fetch(fullUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for item ${item["Serial Number"]}`
          );
        }

        const responseText = await response.text();
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error("Parse error for response:", responseText);
          result = {
            success: false,
            error: responseText || "Invalid response from server",
          };
        }

        if (result.success !== true) {
          throw new Error(
            result.error || result.message || "Failed to save data"
          );
        }

        return result;
      });

      // Wait for all submissions to complete
      const results = await Promise.all(submissionPromises);
      // Show success message
      alert(`${itemsToSubmit.length} items saved successfully!`);

      // Close the modal
      setShowModal(false);

      fetchData(true);
    } catch (error) {
      console.error("Error saving data to Google Sheets:", error);

      setFormErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please check the console for details and try again.",
      });
    } finally {
      setIsSubmitting(false);
      // console.log("[Received] Set isSubmitting to false");
    }
  };

  const handleFieldChange = (
    field: keyof POItem,
    value: string | number,
    itemIndex: number
  ) => {
    setGroupItems((prevItems) => {
      const updatedItems = [...prevItems];
      if (updatedItems[itemIndex]) {
        // For numeric fields, convert to number if not empty, otherwise set to null
        const isNumericField =
          field.includes("Amount") || field.includes("Qty") || field === "Rate";
        const numericValue =
          isNumericField && value !== "" ? Number(value) || null : value;

        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          [field]: numericValue,
          _isDirty: true, // Mark as dirty on change
        };
      }
      return updatedItems;
    });

    // Clear error for this field if it exists
    const errorKey = `${field}-${itemIndex}`;
    if (formErrors[errorKey]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleViewClick = (group: GroupedPOItem) => {
    setSelectedGroup(group);
    setGroupItems(
      group.items.map((item) => ({
        ...item,
        "Received Qty": item["Received Qty"] || 0,
        _isDirty: false, // Initialize as clean
      }))
    );

    // Prefill financial details from the first item (since they're same for all items in a group)
    const firstItem = group.items[0];
    setBillStatus(firstItem["Bill Type"] || "");
    setBillNo(firstItem["Bill No"] || "");
    setBillDate(firstItem["Bill Date"] || "");
    setBillImage(firstItem["Bill Image"] || "");
    setBillAmount(firstItem["Bill Amount"]?.toString() || "");
    setDiscountAmount(firstItem["Discount Amount"]?.toString() || "");
    setTransporterName(firstItem["Transporter Name"] || "");
    setLrNo(firstItem["LR No."] || "");
    setTransportCharge(firstItem.TransportCharge?.toString() || "");
    setShowModal(true);
  };

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      // console.log("[POList] Fetching fresh data from server...");
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
      // console.log("headerRow", headerRow);
      if (!headerRow) throw new Error("Header row not found in the data");
      const headers = headerRow.map((h: any) => String(h || "").trim());

      // Data rows start from index 6; filter out empty ones
      const dataRows = json.data
        .slice(headerRowIndex + 1)
        .filter(
          (row: any[]) =>
            row && row.some((cell) => String(cell ?? "").trim() !== "")
        );

      // console.log("dataRows", dataRows);

      // Process data in chunks to avoid blocking the main thread
      const CHUNK_SIZE = 100;
      const transformedData: POItem[] = [];

      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
        const chunk = dataRows.slice(i, i + CHUNK_SIZE);

        // console.log("transformedData", transformedData);

        const chunkData = chunk.map((row: any[]) => {
          return {
            "Planning No": String(row[1] || ""), // Planning No.
            "PO No": String(row[3] || ""), // PO No.
            "Serial Number": String(row[2] || ""), // Serial No.
            Date: row[4] ? String(row[4]) : "", // PO Date
            "Quotation No": String(row[5] || ""), // Quotation No
            "Vendor Name": String(row[6] || ""), // Vendor Name
            "Item Name": String(row[7] || ""), // Item Name
            Qty: Number(row[8] || 0), // Qty

            // YEH TEEN LINES CHANGE KARO - String se Number banao
            Rate: Number(row[9] || 0), // ✓ CHANGE: String se Number
            "GST %": Number(row[10] || 0), // ✓ CHANGE: String se Number
            Discount: String(row[11] || ""),
            "Grand Total Amount": Number(row[12] || 0), // ✓ CHANGE: String se Number

            "PO Copy": String(row[13] || ""),
            "Project Name": String(row[14] || ""), // Project Name
            "Firm Name": String(row[15] || ""), // Firm Name
            poStatus: String(row[16] || ""), // Firm Name

            "Received Qty": Number(row[19] || 0), // ✓ ADD THIS LINE
            Status: String(row[21] || ""),

            Planned: String(row[22] || 0), // ✓ ADD THIS LINE
            Actual: String(row[23] || 0), // ✓ ADD THIS LINE

            "Bill Type": String(row[25] || ""), // Bill Type
            "Bill No": String(row[26] || ""), // Bill No
            "Bill Date": String(row[27] || ""), // Bill Date
            "Bill Amount": Number(row[28] || 0), // Bill Amount
            "Discount Amount": Number(row[29] || 0), // Discount Amount
            "Bill Image": String(row[30] || ""), // Bill Image
            "Transporter Name": String(row[31] || ""), // Transporter Name
            "LR No.": String(row[32] || ""), // LR No.
            status: String(row[33] || ""), // Receiving Status
            Remarks: String(row[34] || ""), // Remarks
            TransportCharge: Number(row[15]) || 0,
            "Product Rate": Number(row[44] || 0), // Product Rate
          };
        });

        transformedData.push(...chunkData);

        // Allow UI to update between chunks
        if (i + CHUNK_SIZE < dataRows.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const approvedData = transformedData.filter(
        (item) => item.Status !== "Complete" && item.poStatus === "Approved"
      );

      // console.log("transformedData", transformedData);
      setData(approvedData);
      // console.log("[POList] Loaded", transformedData.length, "records");
    } catch (err) {
      console.error("[POList] Error:", err);
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      if (!isRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        // console.log(`[POList] Retrying in ${delay}ms... (${retryCount + 1}/3)`);
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

  // Group data by Planning No
  const groupedData = data.reduce((acc, item) => {
    const planningNo = item["Planning No"];
    if (!acc[planningNo]) {
      acc[planningNo] = [];
    }
    acc[planningNo].push(item);
    return acc;
  }, {} as Record<string, POItem[]>);

  const groupedDataArray = Object.entries(groupedData).map(
    ([planningNo, items]) => ({
      planningNo,
      items,
      itemCount: items.length,
      // Use first item's data for display in table
      displayItem: items[0],
    })
  );

  // Filter grouped data
  const filteredGroupedData = groupedDataArray.filter(
    (group: GroupedPOItem) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const item = group.displayItem;
      return (
        (item["Planning No"] || "").toLowerCase().includes(q) ||
        (item["PO No"] || "").toLowerCase().includes(q) ||
        (item["Vendor Name"] || "").toLowerCase().includes(q) ||
        (item["Item Name"] || "").toLowerCase().includes(q) ||
        (item["Project Name"] || "").toLowerCase().includes(q) ||
        (item["Firm Name"] || "").toLowerCase().includes(q)
      );
    }
  );

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

  const calculateTotalAmount = (item: POItem) => {
    const receivedQty = Number(item["Received Qty"]) || 0;
    const rate = Number(item.Rate) || 0;
    const gst = Number(item["GST %"]) || 0;
    const transportCharge = Number(item.TransportCharge) || 0;
    const baseAmount = receivedQty * rate;
    const gstAmount = baseAmount * (gst / 100);
    const total = baseAmount + gstAmount + transportCharge; // Added transport charge
    return total.toFixed(2);
  };

  // Calculate total of all items' total amounts
  const calculateGrandTotal = () => {
    return groupItems.reduce((total, item) => {
      return total + parseFloat(calculateTotalAmount(item));
    }, 0);
  };

  // console.log("selectedGroup", selectedGroup);

  return (
    <div className="space-y-6">
      {/* Search and Refresh */}
      <div className="flex flex-col gap-4 justify-between p-6 bg-white rounded-xl border border-gray-200 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search purchase orders..."
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

        <button
          onClick={() => {
            setShowHistoryModal(true);
            fetchHistoryData();
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50"
        >
          History
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
                  "Planning No",
                  "PO No",
                  "Serial Number",
                  "Date",
                  "Vendor Name",
                  "Item Name",
                  "Qty",
                  "PO Copy",
                  "Project Name",
                  "Firm Name",
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
              {filteredGroupedData.length > 0 ? (
                filteredGroupedData.map(
                  (group: GroupedPOItem, index: number) => {
                    const item = group.displayItem;
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewClick(group)}
                              className="overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl px-4 py-3 group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                              title="View All Items"
                            >
                              <div className="flex items-center justify-center">
                                {/* <Eye className="w-5 h-5 text-blue-600 mr-2 group-hover:text-blue-700 transition-colors" /> */}
                                <span className="font-medium text-blue-700 group-hover:text-blue-800">
                                  <RiFolderReceivedFill className="inline-block mr-1 mb-1" />
                                </span>
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                  {group.itemCount}
                                </span>
                                <ChevronRight className="w-4 h-4 text-blue-500 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </button>
                            {item["PO Copy"] && (
                              <button
                                onClick={() =>
                                  window.open(item["PO Copy"], "_blank")
                                }
                                className="overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl px-4 py-3 group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                title="View PO Copy"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
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
                          "Item Name",
                          "Qty",
                          "PO Copy",
                          "Project Name",
                          "Firm Name",
                        ].map((colKey) => {
                          const value = item[colKey as keyof POItem];
                          return (
                            <td
                              key={colKey}
                              className="px-4 py-3 whitespace-nowrap"
                            >
                              {colKey === "PO Copy" && value ? (
                                <a
                                  href={String(value)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 underline hover:text-blue-900"
                                  title="Click to view PO Copy"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mr-1"
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                  View Document
                                </a>
                              ) : colKey === "Serial Number" &&
                                group.itemCount > 1 ? (
                                `${value} (+${group.itemCount - 1} more)`
                              ) : typeof value === "number" ? (
                                value.toLocaleString()
                              ) : colKey === "Date" ? (
                                formatDateToDDMMYYYY(value)
                              ) : (
                                value || "-"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Search className="mx-auto w-12 h-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      No purchase orders found
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

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex justify-center items-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 opacity-75"
              onClick={() => setShowHistoryModal(false)}
            />

            <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Received History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-t-2 border-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          "Planning No",
                          "PO No",
                          "Firm Name",
                          "Vendor Name",
                          "Invoice No",
                          "Invoice Date",
                          "Bill Amount",
                          "Invoice Copy",
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">{item["Planning No"]}</td>
                          <td className="px-4 py-3">{item["PO No"]}</td>
                          <td className="px-4 py-3">{item["Firm Name"]}</td>
                          <td className="px-4 py-3">{item["Vendor Name"]}</td>
                          <td className="px-4 py-3">{item["Bill No"]}</td>
                          <td className="px-4 py-3">
                            {formatDateToDDMMYYYY(item["Bill Date"])}
                          </td>
                          <td className="px-4 py-3">
                            ₹{item["Bill Amount"]?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {item["Bill Image"] && (
                              <a
                                href={item["Bill Image"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Details Modal */}
      {showModal && selectedGroup && groupItems.length > 0 && (
        <div className="overflow-y-auto fixed inset-0 z-50">
          <div className="flex justify-center items-center px-2 pt-2 pb-4 min-h-screen text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setShowModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>

            <div className="inline-block overflow-hidden px-3 py-4 mx-2 w-full max-w-xs text-left align-bottom bg-white rounded-xl shadow-2xl transition-all transform sm:my-8 sm:align-middle sm:px-6 sm:py-6 sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl sm:mx-0">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:justify-between sm:items-center sm:mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                        Financial Details - All Items
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Planning No:{" "}
                        <span className="font-medium text-blue-600">
                          {selectedGroup?.planningNo}
                        </span>{" "}
                        ({selectedGroup?.itemCount || 1} items)
                      </p>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        PO No:{" "}
                        <span className="font-medium text-blue-600">
                          {selectedGroup?.displayItem["PO No"] || "N/A"}
                        </span>{" "}
                        ({selectedGroup?.itemCount || 1} items)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4 sm:gap-6">
                    {/* Financial Details Section */}
                    <div className="w-full">
                      {/* <h4 className="mb-3 text-base font-medium text-gray-900 sm:mb-4 sm:text-lg">
                        Financial Details - All Items ({groupItems.length})
                      </h4> */}

                      {/* FinancialDetailsTable */}

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Bill Status */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Type *
                            </label>
                            <select
                              value={billStatus}
                              onChange={(e) => setBillStatus(e.target.value)}
                              className="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            >
                              <option value="">Select Bill Type</option>
                              <option value="Tax Invoice">Tax Invoice</option>
                              <option value="Delivery Chalan">
                                Delivery Chalan
                              </option>
                            </select>
                          </div>

                          {/* Bill No - only show if Bill Status is Yes */}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill No *
                            </label>
                            <input
                              type="text"
                              value={billNo}
                              onChange={(e) => setBillNo(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter bill number"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Date *
                            </label>
                            <input
                              type="date"
                              value={billDate}
                              onChange={(e) => setBillDate(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Bill Image - only show if Bill Status is Yes */}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Image
                            </label>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Store the file object instead of just name
                                  setBillImage(file);
                                }
                              }}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            />{" "}
                          </div>

                          {/* Bill Amount - only show if Bill Status is Yes */}
                          {
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bill Amount *
                              </label>
                              <input
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          }

                          {/* Discount Amount - only show if Bill Status is Yes */}
                          {
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Amount
                              </label>
                              <input
                                type="number"
                                value={discountAmount}
                                onChange={(e) =>
                                  setDiscountAmount(e.target.value)
                                }
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          }

                          {/* Transporter Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transporter Name
                            </label>
                            <input
                              type="text"
                              value={transporterName}
                              onChange={(e) =>
                                setTransporterName(e.target.value)
                              }
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter transporter name"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* LR No */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              LR No.
                            </label>
                            <input
                              type="text"
                              value={lrNo}
                              onChange={(e) => setLrNo(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter LR number"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Vendore Name
                            </label>
                            <input
                              type="text"
                              value={
                                selectedGroup?.displayItem["Vendor Name"] || ""
                              }
                              readOnly
                              className="block px-2 py-1 w-full text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-full sm:text-sm"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transport Charge
                            </label>
                            <input
                              type="number"
                              value={transportCharge}
                              onChange={(e) =>
                                setTransportCharge(e.target.value)
                              }
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 mt-6 border-t border-gray-200 sm:flex-row sm:pt-6 sm:mt-8">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setShowModal(false)}
                        className="inline-flex order-2 justify-center px-4 py-2 w-full text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm sm:order-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex order-1 justify-center px-4 py-2 w-full text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent shadow-sm sm:order-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="mr-2 -ml-1 w-5 h-5 text-white animate-spin"
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
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>

                    {/* Basic Information Section */}
                    <div className="w-full">
                      <h4 className="mb-3 text-base font-medium text-gray-900 sm:mb-4 sm:text-lg">
                        Basic Information - All Items ({groupItems.length})
                      </h4>

                      {/* Items Table */}
                      <div className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  PO No
                                </th>
                                {/* <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Serial Number
                                </th> */}
                                {/* <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  PO No
                                </th> */}
                                {/* <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Date
                                </th> */}
                                {/* <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Vendor Name
                                </th> */}
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Item Name
                                </th>
                                {/* <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Qty
                                </th> */}
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  PO Qty
                                </th>

                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Received Qty
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Remaining Qty
                                </th>

                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Rate
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  GST
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Total Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {groupItems.map((item, itemIndex) => (
                                <tr key={itemIndex}>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <span className="text-xs font-medium text-gray-900 sm:text-sm">
                                      {item["PO No"]}
                                    </span>
                                  </td>
                                  {/* <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["Serial Number"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-10 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-10 sm:text-sm"
                                    />
                                  </td> */}
                                  {/* <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["PO No"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td> */}
                                  {/* <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={
                                        formatDateToDDMMYYYY(item["Date"]) || ""
                                      }
                                      readOnly
                                      className="block px-2 py-1 w-28 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td> */}

                                  {/* <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    
                                  </td> */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["Item Name"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["Qty"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>

                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["Received Qty"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "Received Qty",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                    />
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={
                                        item.Qty
                                          ? Number(item.Qty) -
                                          Number(item["Received Qty"] || 0)
                                          : 0
                                      }
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs bg-gray-50 border border-gray-200 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                    />
                                  </td>
                                  {/* Make Rate editable */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["Rate"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "Rate",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>

                                  {/* Make GST editable */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["GST %"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "GST %",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                      max="100"
                                    />
                                  </td>

                                  {/* Total Amount - calculated, read-only */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={calculateTotalAmount(item)}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs bg-gray-50 border border-gray-200 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Grand Total Display - ADD THIS SECTION */}
                    <div className="flex justify-end mt-4 p-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">
                          Grand Total:
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          ₹{calculateGrandTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {formErrors.submit && (
                  <div className="mt-3 text-xs text-red-600 sm:mt-4 sm:text-sm">
                    {formErrors.submit}
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

export default POList;
