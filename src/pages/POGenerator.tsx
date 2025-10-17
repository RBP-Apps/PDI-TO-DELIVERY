import React, { useEffect, useMemo, useState } from "react";
import { generatePDFFromHTML } from "../pages/generatePDFFromHTML"; // Path adjust karna

import {
  FileText,
  RefreshCw,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
// import jsPDF from "jspdf";

// Firm data structure for dynamic header
const firmData: Record<
  string,
  { name: string; address: string; phone: string; email?: string }
> = {
  "RBP INDIA PRIVATE LIMITED": {
    name: "RBP INDIA PRIVATE LIMITED",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "info@rbpindia.com",
  },
  "RBP Energy (India) Pvt Ltd": {
    name: "RBP ENERGY (INDIA) PRIVATE LIMITED",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "energy@rbpindia.com",
  },
  "Raisoni Energy (India) Pvt Ltd": {
    name: "RAISONI ENERGY (INDIA) PRIVATE LIMITED",
    address: "456, Raisoni Campus, Nagpur, Maharashtra, 440013",
    phone: "+91 98765 43210",
    email: "contact@raisenergy.com",
  },
  "RBP Constructions": {
    name: "RBP CONSTRUCTIONS PRIVATE LIMITED",
    address: "789, Construction Zone, Raipur, Chhattisgarh, 492001",
    phone: "+91 87654 32109",
    email: "projects@rbpconstructions.com",
  },
  "RBP Infrastructure": {
    name: "RBP INFRASTRUCTURE PRIVATE LIMITED",
    address: "101, Infrastructure Hub, Raipur, Chhattisgarh, 492001",
    phone: "+91 76543 21098",
    email: "infra@rbpinfra.com",
  },

  "Varyaa Renewable Pvt Ltd": {
    name: "Varyaa Renewable Pvt Ltd",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "info@rbpindia.com",
  },
};

const getFirmData = (firmName: string) => {
  return firmData[firmName] || firmData["RBP INDIA PRIVATE LIMITED"];
};

const POGenerator = () => {
  const [selectedIndent, setSelectedIndent] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedFirm, setSelectedFirm] = useState("RBP INDIA PRIVATE LIMITED");
  const [indentOptions, setIndentOptions] = useState<string[]>([]);
  const [loadingIndents, setLoadingIndents] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsCache, setTermsCache] = useState<Record<string, string[]>>({});
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsSource, setTermsSource] = useState("");
  const [planningToFirm, setPlanningToFirm] = useState<Record<string, string>>(
    {}
  );

  // console.log("selectedFirm", selectedFirm);
  // Maps for fast lookup
  const [planningToVendor, setPlanningToVendor] = useState<
    Record<string, string>
  >({});
  const [vendorDirectory, setVendorDirectory] = useState<
    Record<string, { address: string; gstin: string; email: string }>
  >({});
  const [editingTerm, setEditingTerm] = useState<number | null>(null);
  const [terms, setTerms] = useState([
    "Payment within 30 days of delivery",
    "Goods to be delivered at the destination address mentioned",
    "GST extra as applicable",
    "Warranty period as per standard terms",
    "Any disputes subject to local jurisdiction",
    "Delivery schedule to be strictly adhered to",
  ]);
  const [billingAddress, setBillingAddress] = useState(
    "M/S RBP INDIA PRIVATE LIMITED\nVill - Belapada, PO.Uchhakapat, VIA-Bamra,\nDist. Sambalpur (Odisha)"
  );
  const [destinationAddress, setDestinationAddress] = useState(
    "M/S RBP INDIA PRIVATE LIMITED\nN-2, Civil Township, Rourkela-769004\nDist. Sundargarh (ODISHA)"
  );
  const [editingBilling, setEditingBilling] = useState(false);
  const [editingDestination, setEditingDestination] = useState(false);
  const [poData, setPoData] = useState({
    poDate: new Date().toISOString().split("T")[0],
    poNumber: "",
    quotationNo: "",
    quotationDate: "",
    enquiryNo: "",
    enquiryDate: "",
    gstNumber: "",
    supplierEmail: "",
    supplierAddress: "",
    preparedBy: "",
    approvedBy: "",
  });

  const [paymentTerms, setPaymentTerms] = useState(
    `1. Advance 5% = Rs. {advance} ; (Out of which an amount of Rs. 59,36,000.00 has been already transferred on date-21.09.2023) & balance amount of Rs.{balance} will be paid within a week.
2. Balance payment in advance against confirmation of dispatch.`
  );
  const [editingPayment, setEditingPayment] = useState(false);

  // Footer Notes state
  const [footerNotes, setFooterNotes] = useState(
    `Prices are inclusive of GST, Taxes, Freight, and Insurance- All inclusive. GST as per applicable at the time of billing.
Shipping location-To be delivered at in the state of Punjab, Haryana, Maharastra, Uttar Pradesh & Jharkhand.`
  );
  const [editingFooterNotes, setEditingFooterNotes] = useState(false);

  // Warranty state
  const [warrantyText, setWarrantyText] = useState(
    "As provided by you in your quotation, Bill of Material and sample and as per BIS and MNRE norms, Modules supplied should be strictly as per MNRE norms and Tender specification & ALMM applicability from April 2024."
  );
  const [editingWarranty, setEditingWarranty] = useState(false);

  // Product item type and state (mapped from INDENT sheet)
  type ProductItem = {
    sn: number; // Column C
    internalCode: string; // Column B - Planning Number
    itemType: string; // Column I
    product: string; // Column K - Item Name
    description: string; // Column P - Remarks
    qty: number; // Column M
    unit: string; // Column L
    rate: number; // not in sheet, default 0 or user input
    gst: number; // not in sheet, default 0 or user input
    discount: number; // not in sheet, default 0 or user input
    amount: number; // computed client-side
    quotationNo?: string; // user input
  };

  const [products, setProducts] = useState<ProductItem[]>([]);

  // console.log("selectedFirm",selectedFirm);

  // GAS endpoint routed via Vite proxy for CORS-free dev
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";

  // Generic sheet fetcher
  const fetchSheet = async (sheetName: string) => {
    const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}: ${res.status}`);
    const json = await res.json();
    return (json.data || []) as any[][];
  };

  // Load INDENT options and planning->vendor map
  useEffect(() => {
    const loadIndents = async () => {
      setLoadingIndents(true);
      setError(null);
      try {
        const data = await fetchSheet("INDENT");
        // Skip first 6 rows like other pages (headers/meta)
        const body = data.slice(6);
        // console.log("INDENT data:", data); // Debug log
        // console.log("Body after slice:", body); // Debug log

        // console.log("Body", body);

        const options: string[] = [];
        const planningVendor: Record<string, string> = {};
        const planningFirm: Record<string, string> = {};

        // console.log("body", body);

        body.forEach((r) => {
          const planningNo =
            r[22] !== "" && r[23] === "" && (r[1] ?? "").toString().trim(); // Column B
          const vendorName = (r[7] ?? "").toString().trim(); // Column H "Vendor Name"
          const firmName = (r[6] ?? "").toString().trim(); // Column G "Firm Name"

          if (planningNo) {
            options.push(planningNo);
            if (vendorName) planningVendor[planningNo] = vendorName;
            if (firmName) planningFirm[planningNo] = firmName;
          }
        });
        // De-duplicate while preserving order
        const uniqueOptions = Array.from(new Set(options));
        setIndentOptions(uniqueOptions);
        setPlanningToVendor(planningVendor);
        setPlanningToFirm(planningFirm);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load indent options");
      } finally {
        setLoadingIndents(false);
      }
    };
    loadIndents();
  }, []);

  // Fetch terms when products change - only for first product's item type
  useEffect(() => {
    if (selectedIndent && products.length > 0) {
      // Get the first product's item type
      const firstItemType = products[0].itemType;
      // console.log("First product item type:", firstItemType);

      if (firstItemType) {
        // console.log("Fetching terms for item type:", firstItemType);
        fetchTermsForItemType(firstItemType);
      }
    }
  }, [products, selectedIndent]);

  // Ensure Vendor Details directory is loaded once when needed
  const ensureVendorDirectory = async () => {
    if (Object.keys(vendorDirectory).length > 0) return vendorDirectory;
    setLoadingVendor(true);
    try {
      const vendorSheet = await fetchSheet("Vendor Details");
      // Assume header at first row; map by Vendor Name (col B index 1)
      const dir: Record<
        string,
        { address: string; gstin: string; email: string }
      > = {};
      vendorSheet.slice(1).forEach((r) => {
        const name = (r[1] ?? "").toString().trim(); // B Vendor Name
        const address = (r[2] ?? "").toString(); // C Address (assumed)
        const gstin = (r[3] ?? "").toString().trim(); // D GSTIN
        const email = (r[5] ?? "").toString().trim(); // F Email Address
        if (name) dir[name] = { address, gstin, email };
      });
      setVendorDirectory(dir);

      return dir;
    } catch (e) {
      console.error(e);
      setError("Failed to load Vendor Details");
    } finally {
      setLoadingVendor(false);
    }
  };

  const handleIndentChange = async (indentNo: string) => {
    // console.log("handleIndentChange called with:", indentNo);
    setSelectedIndent(indentNo);
    if (!indentNo) {
      setSelectedSupplier("");
      setSelectedFirm("RBP INDIA PRIVATE LIMITED"); // Default firm
      setPoData((prev) => ({
        ...prev,
        supplierAddress: "",
        gstNumber: "",
        supplierEmail: "",
      }));
      setProducts([]);
      return;
    }
    try {
      setLoadingVendor(true);
      const vendorName = planningToVendor[indentNo] || "";
      const firmName = planningToFirm[indentNo] || "RBP INDIA PRIVATE LIMITED"; // Default to main firm
      setSelectedSupplier(vendorName);
      setSelectedFirm(firmName); // Auto-select firm based on indent
      // await ensureVendorDirectory();
      const currentVendorDir = (await ensureVendorDirectory()) || {}; // <-- Get the directory
      const info = currentVendorDir[vendorName];
      // console.log("info", info);
      setPoData((prev) => ({
        ...prev,
        supplierAddress: info?.address || "",
        gstNumber: info?.gstin || "",
        supplierEmail: info?.email || "",
      }));
      // Load products for this indent from INDENT sheet
      // Columns mapping (0-indexed): B=1 planning, C=2 serial no, H=7 vendor, I=8 item type, P=15 remarks, K=10 item name, L=11 UOM, M=12 Qty
      try {
        const data = await fetchSheet("INDENT");
        const rows = data.slice(6); // skip headers/meta like elsewhere
        const mapped: ProductItem[] = rows
          .filter((r) => (r?.[1] ?? "").toString().trim() === indentNo)
          .map((r) => {
            const serialNo = Number(r?.[2] ?? 0) || 0;
            const planningNumber = (r?.[1] ?? "").toString().trim();
            const itemType = (r?.[8] ?? "").toString().trim();
            const description = (r?.[15] ?? "").toString().trim();
            const itemName = (r?.[10] ?? "").toString().trim();
            const uom = (r?.[11] ?? "").toString().trim();
            const qty = Number(r?.[12] ?? 0) || 0;
            const rate = 0;
            const gst = 0;
            const discount = 0;
            const baseAmount = rate * qty;
            const discountAmt = (baseAmount * discount) / 100;
            const amount = baseAmount - discountAmt; // GST excluded; totals add GST separately
            return {
              sn: serialNo,
              internalCode: planningNumber,
              itemType,
              product: itemName,
              description,
              qty,
              unit: uom,
              rate,
              gst,
              discount,
              amount,
            } as ProductItem;
          })
          .sort((a, b) => a.sn - b.sn);
        setProducts(mapped);
      } catch (prodErr) {
        console.error("Failed to load products for indent", prodErr);
        setProducts([]);
      }
    } finally {
      setLoadingVendor(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPoData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotals = () => {
    const subtotal = products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      return sum + (baseAmount - discountAmount);
    }, 0);

    const gstAmount = products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;
      return sum + (amountAfterDiscount * product.gst) / 100;
    }, 0);

    const grandTotal = subtotal + gstAmount;

    return { subtotal, gstAmount, grandTotal };
  };

  const savePOHistory = async (pdfLink: string) => {
    const timestamp = Date.now();
    const planningNo = selectedIndent || "AUTO-" + Date.now();
    const poNo = poData.poNumber || "AUTO-" + Date.now();
    const poDate = poData.poDate;
    const vendorName = selectedSupplier;

    const rows = products.map((item, idx) => {
      // Recalculate amounts with current values from UI
      const baseAmount = item.rate * item.qty;
      const discountAmount = (baseAmount * item.discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;
      const gstAmount = (amountAfterDiscount * item.gst) / 100;
      const finalAmount = amountAfterDiscount + gstAmount;

      const row = [
        formatDateTime(timestamp), // Column A - Timestamp
        planningNo, // Column B - Planning No
        (idx + 1).toString(), // Column C - Serial No
        poNo, // Column D - PO No
        poDate, // Column E - PO Date
        poData.quotationNo || "", // Column F - Quotation No
        vendorName, // Column G - Vendor Name
        "", // Column H - Item Name
        item.qty.toString(), // Column I - Qty
        item.rate.toString(), // Column J - Rate
        item.gst.toString(), // Column K - GST %
        item.discount.toString(), // Column L - Discount %
        Math.round(finalAmount).toString(), // Column M - Grand Total Amount
        pdfLink, // Column N - PO Copy link
        "", // Column O - placeholder
      ];

      return row;
    });

    try {
      // Use batch_insert instead of multiple insert calls
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "batch_insert",
          sheetName: "PO",
          rowsData: JSON.stringify(rows),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // console.log("PO history saved successfully");
        return { success: true };
      } else {
        console.error("Batch insert failed:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error saving PO history:", error);
      return { success: false, error: (error as any)?.message || "Save error" };
    }
  };

  const generateAndUploadImage = async () => {
    try {
      // Prepare data for PDF - reference PDF format के according
      const pdfData = {
        supplierName: selectedSupplier,
        supplierAddress: poData.supplierAddress,
        gstNumber: poData.gstNumber,
        poNumber: poData.poNumber || "AUTO-" + Date.now(),
        poDate: poData.poDate,
        products: products.map((product) => ({
          ...product,
          // Ensure proper state mapping
          description: product.description || "",
        })),
        terms: terms,
        paymentTerms: paymentTerms,
        footerNotes: footerNotes, // ADD
        warrantyText: warrantyText,
      };

      // Get firm data
      const selectedFirmData = getFirmData(selectedFirm);

      // console.log("selectedFirmData",selectedFirmData);

      // Generate and upload PDF
      const result = await generatePDFFromHTML(
        pdfData,
        selectedFirmData,
        APPS_SCRIPT_URL
      );

      return result;
    } catch (error) {
      console.error("Error in generateAndUploadImage:", error);
      return {
        success: false,
        error: error?.message || "PDF generation error",
      };
    }
  };

  // Helper function to get state from product

  const isValid = useMemo(() => {
    return Boolean(selectedIndent && selectedSupplier && poData.poDate);
  }, [selectedIndent, selectedSupplier, poData.poDate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    // console.log("PO submit started");
    e.preventDefault();
    if (!isValid) {
      setError("Please fill all required (*) fields.");
      return;
    }

    // if (!poData.supplierEmail) {
    //   alert("Supplier email is missing. Please update supplier details.");
    //   return;
    // }

    setIsSubmitting(true);
    // Generate current form as an image and upload to Drive
    const result = await generateAndUploadImage();
    if (result.success && result.fileUrl) {
      // Save PO history to Google Sheet
      const saveResult = await savePOHistory(result.fileUrl);
      if (saveResult.success) {
        alert(
          `PO generated, uploaded, and history saved successfully!\nPDF Link: ${result.fileUrl}`
        );
      } else {
        alert(
          `PO generated and uploaded, but history save failed: ${saveResult.error}\nPDF Link: ${result.fileUrl}`
        );
      }
    } else {
      alert(`Upload failed: ${result.error || "Unknown error"}`);
    }

    setIsSubmitting(false);
  };

  const fetchTermsForItemType = async (itemType: string) => {
    if (!itemType) {
      // console.log("fetchTermsForItemType called with empty itemType");
      return;
    }

    // Check cache first
    if (termsCache[itemType]) {
      // console.log("Using cached terms for:", itemType);
      setTerms(termsCache[itemType]);
      setTermsSource(`Loaded from cache for ${itemType}`);
      return;
    }

    setLoadingTerms(true);
    // console.log("Fetching terms from sheet for:", itemType);

    try {
      // Change sheet name to "PO Masters"
      const data = await fetchSheet("PO Masters");
      // console.log("Raw terms data from sheet:", data);

      const rows = data.slice(1); // Skip header row
      // console.log("Processing terms rows:", rows.length);

      // Filter by item type (column A) and map to terms (column B)
      const filteredTerms = rows
        .filter((row) => {
          const rowItemType = (row[0] || "").toString().trim();
          return rowItemType === itemType;
        })
        .map((row) => (row[1] || "").toString().trim());

      // console.log("Filtered terms:", filteredTerms);

      // Cache the terms
      setTermsCache((prev) => ({ ...prev, [itemType]: filteredTerms }));
      setTerms(filteredTerms);
      setTermsSource(`Fetched from PO Masters for ${itemType}`);
      // console.log("Terms updated successfully for:", itemType);
    } catch (error) {
      console.error(`Failed to load terms for ${itemType}:`, error);
      setTermsSource(`Failed to load terms for ${itemType}`);
      setError("Failed to load terms and conditions");
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleReset = () => {
    setSelectedIndent("");
    setSelectedSupplier("");
    setSelectedFirm("RBP INDIA PRIVATE LIMITED");
    setPoData({
      poDate: new Date().toISOString().split("T")[0],
      poNumber: "",
      quotationNo: "",
      quotationDate: "",
      enquiryNo: "",
      enquiryDate: "",
      gstNumber: "",
      supplierEmail: "",
      supplierAddress: "",
      preparedBy: "",
      approvedBy: "",
    });
  };

  // Terms & Conditions handlers
  const handleEditTerm = (index: number) => {
    setEditingTerm(index);
  };

  const handleSaveTerm = (index: number, newText: string) => {
    if (newText.trim()) {
      setTerms((prev) =>
        prev.map((term, i) => (i === index ? newText.trim() : term))
      );
    }
    setEditingTerm(null);
  };

  const handleCancelEdit = () => {
    setEditingTerm(null);
  };

  const handleDeleteTerm = (index: number) => {
    if (window.confirm("Are you sure you want to delete this term?")) {
      setTerms((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddTerm = () => {
    setTerms((prev) => {
      const newTerms = [...prev, "New term"];
      setEditingTerm(newTerms.length - 1);
      return newTerms;
    });
  };

  const numberToWords = (num: number): string => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (num === 0) return "Zero";

    const convertHundreds = (n: number): string => {
      let result = "";
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + " ";
        n = 0;
      }
      if (n > 0) {
        result += ones[n] + " ";
      }
      return result.trim();
    };

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = num % 1000;

    let result = "";
    if (crores > 0) result += convertHundreds(crores) + " Crore ";
    if (lakhs > 0) result += convertHundreds(lakhs) + " Lakh ";
    if (thousands > 0) result += convertHundreds(thousands) + " Thousand ";
    if (hundreds > 0) result += convertHundreds(hundreds);

    return result.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 space-x-3 sm:mb-0">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 sm:text-3xl">
                PO Generator
              </h1>
              <p className="text-sm font-medium text-gray-600 sm:text-base">
                Generate purchase orders from approved indents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Company Header */}
      <div className="p-8 bg-white rounded-xl border border-gray-200">
        {/* Dynamic Company Header */}
        <div className="pb-6 mb-8 text-center border-b-2 border-blue-600">
          <h1 className="mb-2 text-3xl font-bold text-blue-600">
            {firmData[selectedFirm]?.name ||
              selectedFirm ||
              "RBP INDIA PRIVATE LIMITED"}
          </h1>
          <p className="text-gray-600">
            {firmData[selectedFirm]?.address ||
              "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001"}
          </p>
          <p className="text-gray-600">
            Phone No: {firmData[selectedFirm]?.phone || "+91 92000 12400"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 gap-6 p-6 bg-gray-50 rounded-xl md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Indent No *
              </label>
              <select
                value={selectedIndent}
                onChange={(e) => handleIndentChange(e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loadingIndents}
              >
                <option value="">
                  {loadingIndents ? "Loading indents..." : "Select Indent No"}
                </option>
                {indentOptions.map((indent) => (
                  <option key={indent} value={indent}>
                    {indent}
                  </option>
                ))}
              </select>
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Supplier Name *
              </label>
              <input
                type="text"
                value={loadingVendor ? "Loading supplier..." : selectedSupplier}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                placeholder={
                  selectedIndent
                    ? "Auto-filled from indent"
                    : "Select Indent No First"
                }
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Supplier Address
              </label>
              <input
                type="text"
                value={poData.supplierAddress.replace(/\n/g, ", ")}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                PO Date *
              </label>
              <input
                type="date"
                value={poData.poDate}
                onChange={(e) => handleInputChange("poDate", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                PO Number
              </label>
              <input
                type="text"
                value={poData.poNumber}
                onChange={(e) => handleInputChange("poNumber", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PO Number manually"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Quotation No
              </label>
              <input
                type="text"
                value={poData.quotationNo}
                onChange={(e) =>
                  handleInputChange("quotationNo", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Quotation Date
              </label>
              <input
                type="date"
                value={poData.quotationDate}
                onChange={(e) =>
                  handleInputChange("quotationDate", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Our Enq No
              </label>
              <input
                type="text"
                value={poData.enquiryNo}
                onChange={(e) => handleInputChange("enquiryNo", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Enq. Date
              </label>
              <input
                type="date"
                value={poData.enquiryDate}
                onChange={(e) =>
                  handleInputChange("enquiryDate", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                GST Number
              </label>
              <input
                type="text"
                value={poData.gstNumber}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={poData.supplierEmail}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="pb-2 mb-4 text-lg font-semibold text-blue-600 border-b border-blue-600">
                Our Commercial Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value="22AAACG9223E1Z3"
                    className="px-3 py-2 w-full bg-gray-50 rounded-lg border border-gray-300"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    PAN No
                  </label>
                  <input
                    type="text"
                    value="AAACG9223E"
                    className="px-3 py-2 w-full bg-gray-50 rounded-lg border border-gray-300"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="pb-2 text-lg font-semibold text-blue-600 border-b border-blue-600">
                  Billing Address
                </h3>
                {!editingBilling ? (
                  <button
                    onClick={() => setEditingBilling(true)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBilling(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBilling(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <textarea
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${
                  editingBilling
                    ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    : "bg-gray-50"
                }`}
                rows={4}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                readOnly={!editingBilling}
              />
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="pb-2 text-lg font-semibold text-blue-600 border-b border-blue-600">
                  Destination Address
                </h3>
                {!editingDestination ? (
                  <button
                    onClick={() => setEditingDestination(true)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingDestination(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDestination(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <textarea
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${
                  editingDestination
                    ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    : "bg-gray-50"
                }`}
                rows={4}
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                readOnly={!editingDestination}
              />
            </div>
          </div>

          {/* Products Table */}
          {selectedIndent && (
            <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center p-4 text-white bg-gradient-to-r from-blue-600 to-blue-700"></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        S/N
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Internal Code
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Item Type
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Qty
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Rate
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        GST %
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Discount %
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product, index) => (
                      <tr
                        key={`${product.sn}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm">{product.sn}</td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          {product.internalCode}
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="text"
                            value={product.itemType}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-32 focus:ring-1 focus:ring-blue-500"
                            onChange={async (e) => {
                              const newType = e.target.value;
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, itemType: newType }
                                    : p
                                )
                              );

                              if (newType) {
                                await fetchTermsForItemType(newType);
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <textarea
                            value={product.product}
                            className="px-2 py-1 w-full min-h-[80px] rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 resize-y overflow-y-auto whitespace-pre-wrap"
                            onChange={(e) => {
                              const newProduct = e.target.value;
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, product: newProduct }
                                    : p
                                )
                              );
                            }}
                            placeholder="Enter product name"
                            rows={3}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {product.description}
                        </td>
                        <td className="px-4 py-3 text-sm">{product.qty}</td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          {product.unit}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            defaultValue={product.rate}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-20 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, rate: value }
                                    : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="number"
                            defaultValue={product.gst}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-16 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn ? { ...p, gst: value } : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="number"
                            defaultValue={product.discount}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-16 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, discount: value }
                                    : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          ₹
                          {(() => {
                            const base = product.rate * product.qty;
                            const afterDiscount =
                              base - (base * product.discount) / 100;
                            const total =
                              afterDiscount +
                              (afterDiscount * product.gst) / 100;
                            return Math.round(total);
                          })().toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        Total:
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ₹{calculateTotals().subtotal.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        GST Amount:
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ₹{calculateTotals().gstAmount.toLocaleString()}
                      </td>
                    </tr>

                    {/* <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        Grand Total:
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600">
                        ₹{calculateTotals().grandTotal.toLocaleString()}
                      </td>
                    </tr> */}

                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        <div className="text-right">Grand Total:</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600">
                        ₹{calculateTotals().grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div>
            <span className="text-red-900">
              ({numberToWords(Math.round(calculateTotals().grandTotal))})
            </span>{" "}
          </div>

          {/* Footer Notes Section */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900"></h4>
              {!editingFooterNotes ? (
                <button
                  onClick={() => setEditingFooterNotes(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingFooterNotes(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingFooterNotes(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${
                editingFooterNotes
                  ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-50"
              }`}
              rows={4}
              value={footerNotes}
              onChange={(e) => setFooterNotes(e.target.value)}
              readOnly={!editingFooterNotes}
              placeholder="Enter footer notes here..."
            />
          </div>

          {/* Payment Terms Section */}
          <div className="p-2 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900">
                Payment Terms
              </h4>
              {!editingPayment ? (
                <button
                  onClick={() => setEditingPayment(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPayment(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPayment(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${
                editingPayment
                  ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-50"
              }`}
              rows={4}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              readOnly={!editingPayment}
              placeholder="Enter payment terms here..."
            />
          </div>

          {/* Warranty & Specification Section */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900">
                Warranty & Specification
              </h4>
              {!editingWarranty ? (
                <button
                  onClick={() => setEditingWarranty(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingWarranty(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingWarranty(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${
                editingWarranty
                  ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-50"
              }`}
              rows={4}
              value={warrantyText}
              onChange={(e) => setWarrantyText(e.target.value)}
              readOnly={!editingWarranty}
              placeholder="Enter warranty text here..."
            />
          </div>

          {/* Terms & Conditions */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Terms & Conditions
                </h4>
                {termsSource && (
                  <p className="flex items-center text-sm text-gray-600">
                    {termsSource.includes("Failed") ? (
                      <XCircle className="mr-1 w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="mr-1 w-4 h-4 text-green-500" />
                    )}
                    {termsSource}
                  </p>
                )}
              </div>
              <button
                onClick={handleAddTerm}
                className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>
            {loadingTerms ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-2">Loading terms...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {terms.map((term, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-500 min-w-[24px]">
                      {index + 1}.
                    </span>
                    {editingTerm === index ? (
                      <div className="flex flex-1 gap-2 items-center">
                        <input
                          type="text"
                          value={term}
                          onChange={(e) =>
                            setTerms((prev) =>
                              prev.map((t, i) =>
                                i === index ? e.target.value : t
                              )
                            )
                          }
                          className="flex-1 px-3 py-1 text-sm rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTerm(index, term)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">
                          {term}
                        </span>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => handleEditTerm(index)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTerm(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-1 gap-6 pt-8 border-t border-gray-200 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Prepared By *
              </label>
              <input
                type="text"
                value={poData.preparedBy}
                onChange={(e) =>
                  handleInputChange("preparedBy", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter Prepared By"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Approved By *
              </label>
              <input
                type="text"
                value={poData.approvedBy}
                onChange={(e) =>
                  handleInputChange("approvedBy", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter Approved By"
                required
              />
            </div>

            <div className="flex items-end">
              <div className="w-full text-center">
                <p className="text-sm font-medium text-gray-700">
                  For Director
                </p>
                <p className="mb-2 text-lg font-bold text-blue-600">
                  {firmData[selectedFirm]?.name ||
                    selectedFirm ||
                    "RBP INDIA PRIVATE LIMITED"}
                </p>
                <div className="mt-8 h-12 border-b border-gray-300"></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center pt-8 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex justify-center items-center px-6 py-3 text-gray-700 rounded-lg border border-gray-300 transition-colors duration-200 hover:bg-gray-50 sm:justify-start"
            >
              <RefreshCw className="mr-2 w-5 h-5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex justify-center items-center px-8 py-3 text-white rounded-lg transition-colors duration-200 sm:justify-start ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {/* <Send className="mr-2 w-5 h-5" /> */}
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default POGenerator;
