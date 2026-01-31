import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Building,
  Truck,
  Package,
  MapPin,
  FileText,
} from "lucide-react";

interface PlanningFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Add this
}

interface Product {
  id: string;
  packingDetail: string;
  itemName: string;
  uom: string;
  qty: number;
  qtySet: number;
  totalQty: number;
  remarks: string;
}

interface FormData {
  date: string;
  requesterName: string;
  projectName: string;
  firmName: string;
  vendorName: string;
  itemType: string;
  state: string;
  department: string;
  packingDetailSelect: string;
  masterQuantity: string;
}

const PlanningForm: React.FC<PlanningFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Google Apps Script endpoints
  // Fetch data from one deployment and submit to another as requested
  const FETCH_URL =
    "https://script.google.com/macros/s/AKfycbxd5D0iUhdclpesrjgoZpHxAhpJxMqlPoyfD1AIrFKAmIPR9UE6bmFAQdQsCroAyshD/exec";
  const SUBMIT_URL =
    "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec";
  const TAB_GIDS: { [key: string]: string } = {
    "Project Name": "REPLACE_WITH_GID", // gid for 'Project Name' tab in SHEET1_ID
    "Our Firm Details": "REPLACE_WITH_GID", // gid for 'Our Firm Details' tab in SHEET1_ID
    "Vendor Details": "REPLACE_WITH_GID", // gid for 'Vendor Details' tab in SHEET1_ID
    "State And District": "REPLACE_WITH_GID", // gid for 'State And District' tab in SHEET1_ID
    "PO Masters": "REPLACE_WITH_GID", // gid for 'PO Masters' tab in SHEET2_ID
  };
  const SHEET_NAME = "INDENT"; // updated to target 'INDENT' sheet/tab
  const SHEET1_ID = "1cdlib-3gMY4BKxVks0fLmB36C1IRiJWZkFhIU3v4088"; // Provided
  const SHEET2_ID = "1dfxIrs_9r40U0j63QfT0LiPk7Y88SihJUt6-XiwhEj8"; // Provided
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split("T")[0],
    requesterName: "",
    projectName: "",
    firmName: "",
    vendorName: "",
    itemType: "",
    state: "",
    department: "",
    packingDetailSelect: "",
    masterQuantity: "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Dropdown dynamic options and loading states
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [firmOptions, setFirmOptions] = useState<string[]>([]);
  const [vendorOptionsFlat, setVendorOptionsFlat] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [departmentOptionsFlat, setDepartmentOptionsFlat] = useState<string[]>(
    []
  );
  const [itemTypeOptions, setItemTypeOptions] = useState<string[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState<boolean>(false);
  const [dropdownError, setDropdownError] = useState<string | null>(null);
  const [packingDetailOptions, setPackingDetailOptions] = useState([
    "Standard Pack",
    "Custom Pack",
    "Bulk Pack",
    "Individual Pack",
  ]);
  const [itemData, setItemData] = useState<{
    [key: string]: { qtySet: number; uom: string };
  }>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [itemTypeToVendors, setItemTypeToVendors] = useState<
    Record<string, string[]>
  >({});
  const [stateToDepartments, setStateToDepartments] = useState<
    Record<string, string[]>
  >({});
  const [enhancedMappingsLoaded, setEnhancedMappingsLoaded] = useState(false);
  // Master Items for cascading dropdown (non-BOS)
  const [masterItems, setMasterItems] = useState<
    { name: string; group: string; uom: string }[]
  >([]);
  const [masterItemsLoading, setMasterItemsLoading] = useState(false);
  const [masterItemsError, setMasterItemsError] = useState<string | null>(null);

  // All Master Items (loaded once, filtered by item type in UI) - similar to BOS approach
  const [allMasterItems, setAllMasterItems] = useState<
    { name: string; group: string; uom: string }[]
  >([]);

  // Helper to compute next Planning Number from sheet data (column B, 0-indexed as 1)
  const computeNextPlanningNumber = (data: any[][]) => {
    let maxNum = 0;
    // console.log("[ComputePN] Processing", data.length, "rows");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // console.log(`[ComputePN] Row ${i}:`, row);

      // Check column B (index 1) for Planning Number
      const pn = (row[1] || "").toString().trim();
      // console.log(`[ComputePN] Found PN in column B: "${pn}"`);

      if (/^PN-\d{2,}$/.test(pn)) {
        const n = parseInt(pn.split("-")[1], 10);
        // console.log(`[ComputePN] Parsed number: ${n}`);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
          // console.log(`[ComputePN] New max: ${maxNum}`);
        }
      }
    }

    const next = "PN-" + (maxNum + 1).toString().padStart(2, "0");
    // console.log(`[ComputePN] Final next PN: ${next}`);
    return next;
  };

  // Preload critical dropdown data when form opens
  useEffect(() => {
    if (isOpen && !dropdownLoading) {
      loadDropdowns();
    }
  }, [isOpen]); // Only depend on isOpen to avoid unnecessary reloads

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Dynamic packing detail options based on item type (BOS) - Optimized
  useEffect(() => {
    if (normalizeStr(formData.itemType) === "bos") {
      // Immediately set default packing options while loading from sheet
      setPackingDetailOptions([
        "Standard Pack",
        "Custom Pack",
        "Bulk Pack",
        "Individual Pack",
      ]);

      // Fetch packing detail options from sheet (async, non-blocking)
      fetchValues(SHEET1_ID, "'BOS BOM'!E:E")
        .then((values) => {
          if (values.length > 0) {
            setPackingDetailOptions(values);
          }
        })
        .catch(() => {
          // Keep default options if API fails
        });

      // Start loading products immediately
      loadBOSProducts();
    } else {
      // Reset BOS-specific state when switching away from BOS
      setPackingDetailOptions([
        "Standard Pack",
        "Custom Pack",
        "Bulk Pack",
        "Individual Pack",
      ]);
      setAllProducts([]);
      setItemData({});
      setProducts([]);
      if (formData.packingDetailSelect) {
        setFormData((prev) => ({ ...prev, packingDetailSelect: "" }));
      }
    }
  }, [formData.itemType]);

  // BOS Products Loading Function (moved outside useEffect)
  const loadBOSProducts = async () => {
    try {
      // Load all columns in parallel for maximum performance
      const [snos, partNames, qtySets, uoms, packingDetails] =
        await Promise.all([
          fetchColumnRaw(SHEET1_ID, "'BOS BOM'!A:A"), // S.No
          fetchColumnRaw(SHEET1_ID, "'BOS BOM'!B:B"), // Part Name
          fetchColumnRaw(SHEET1_ID, "'BOS BOM'!C:C"), // Qty/Set
          fetchColumnRaw(SHEET1_ID, "'BOS BOM'!D:D"), // UOM
          fetchColumnRaw(SHEET1_ID, "'BOS BOM'!E:E"), // Packing Detail
        ]);

      const fetchedProducts: Product[] = [];
      const maxLength = Math.max(
        snos.length,
        partNames.length,
        qtySets.length,
        uoms.length,
        packingDetails.length
      );

      // Skip header row and process more efficiently
      for (let i = 1; i < maxLength; i++) {
        const partName = partNames[i]?.trim();
        if (partName) {
          fetchedProducts.push({
            id: `bom-${i}-${Date.now()}`,
            packingDetail: packingDetails[i] || "Standard Pack",
            itemName: partName,
            uom: uoms[i] || "",
            qty: 0,
            qtySet: parseFloat(qtySets[i]) || 0,
            totalQty: 0,
            remarks: "",
          });
        }
      }

      // console.log("fetchedProducts",fetchedProducts);

      setAllProducts(fetchedProducts);

      // Create item data mapping efficiently
      const tempItemData: {
        [key: string]: { qtySet: number; uom: string };
      } = {};
      for (let i = 1; i < partNames.length; i++) {
        const partName = partNames[i]?.trim();
        if (partName) {
          tempItemData[partName] = {
            qtySet: parseFloat(qtySets[i]) || 0,
            uom: uoms[i] || "",
          };
        }
      }
      setItemData(tempItemData);

      // If no products were loaded, show message in products table
      if (fetchedProducts.length === 0) {
        // This will be handled by the products table showing empty state
      }
    } catch (err) {
      // Load fallback BOS products if API fails
      const fallbackProducts: Product[] = [
        {
          id: `fallback-1-${Date.now()}`,
          packingDetail: "Standard Pack",
          itemName: "Solar Panel 250W",
          uom: "Pieces",
          qty: 0,
          qtySet: 1,
          totalQty: 0,
          remarks: "BOS fallback item",
        },
        {
          id: `fallback-2-${Date.now()}`,
          packingDetail: "Standard Pack",
          itemName: "Mounting Structure",
          uom: "Sets",
          qty: 0,
          qtySet: 1,
          totalQty: 0,
          remarks: "BOS fallback item",
        },
        {
          id: `fallback-3-${Date.now()}`,
          packingDetail: "Standard Pack",
          itemName: "DC Cable 4mm",
          uom: "Meters",
          qty: 0,
          qtySet: 100,
          totalQty: 0,
          remarks: "BOS fallback item",
        },
      ];

      setAllProducts(fallbackProducts);
    }
  };

  // Load ALL Master Items once (not filtered by item type) - similar to BOS approach
  useEffect(() => {
    const loadAllMasterItems = async () => {
      if (allMasterItems.length > 0) return; // Already loaded

      setMasterItemsLoading(true);
      setMasterItemsError(null);

      try {
        // Fetch all columns in parallel for better performance
        const [colA, colB, colC] = await Promise.all([
          fetchColumnRaw(SHEET1_ID, "'Master Items'!A:A"), // Group Head
          fetchColumnRaw(SHEET1_ID, "'Master Items'!B:B"), // Product Name
          fetchColumnRaw(SHEET1_ID, "'Master Items'!C:C"), // UOM
        ]);

        // Process all items (no filtering here - we'll filter in the UI)
        const allItems: { name: string; group: string; uom: string }[] = [];

        for (let i = 0; i < colA.length; i++) {
          const group = colA[i]?.trim();
          const name = colB[i]?.trim();
          const uom = colC[i]?.trim();

          if (name && group) {
            allItems.push({
              name: name,
              group: group,
              uom: uom || "",
            });
          }
        }

        // console.log("[DEBUG] Processed allMasterItems:", allItems.length);
        // console.log("[DEBUG] Sample processed items:", allItems.slice(0, 3));

        // Count items by group
        const groupCounts: Record<string, number> = {};
        allItems.forEach((item) => {
          groupCounts[item.group] = (groupCounts[item.group] || 0) + 1;
        });
        // console.log("[DEBUG] Items by group:", groupCounts);

        // Check for BOS items specifically
        const bosItems = allItems.filter(
          (item) => normalizeStr(item.group) === "bos"
        );
        // console.log("[DEBUG] BOStems data:", bosItems);

        setAllMasterItems(allItems);
      } catch (error) {
        setMasterItemsError("Failed to load master items");
      } finally {
        setMasterItemsLoading(false);
      }
    };

    loadAllMasterItems();
  }, []); // Load once on component mount

  // Reset vendor when item type changes
  useEffect(() => {
    if (formData.itemType !== "") {
      // Don't reset vendor name when item type changes, but ensure it's valid for the new item type
      const availableVendors = getVendorOptions();
      if (!availableVendors.includes(formData.vendorName)) {
        setFormData((prev) => ({ ...prev, vendorName: "" }));
      }
    }
  }, [formData.itemType, itemTypeToVendors]);

  // Get filtered items for dropdown based on item type (BOS vs non-BOS)
  const getFilteredItemsForDropdown = () => {
    if (normalizeStr(formData.itemType) === "bos") {
      // For BOS items, try different variations of BOS group name
      const bosVariations = ["bos", "BOS", "cil", "CIL", "b.o.s", "C.O.S"];
      let bosItems: { name: string; group: string; uom: string }[] = [];

      for (const variation of bosVariations) {
        const items = allMasterItems.filter(
          (item) => normalizeStr(item.group) === normalizeStr(variation)
        );
        if (items.length > 0) {
          bosItems = items;
          break;
        }
      }

      // If no BOS items found, return fallback items
      if (bosItems.length === 0) {
        return [
          { name: "Solar Panel 250W", group: "BOS", uom: "Pieces" },
          { name: "Inverter 5kW", group: "BOS", uom: "Units" },
          { name: "Mounting Structure", group: "BOS", uom: "Sets" },
          { name: "DC Cable 4mm", group: "BOS", uom: "Meters" },
        ];
      }

      return bosItems;
    } else {
      // For non-BOS items, filter allMasterItems by item type
      const normalizedType = normalizeStr(formData.itemType);
      return allMasterItems.filter(
        (item) => normalizeStr(item.group) === normalizedType
      );
    }
  };

  // Filter products by selected packing detail
  useEffect(() => {
    const isBOS = normalizeStr(formData.itemType) === "bos";

    if (isBOS) {
      const sel = normalizeStr(formData.packingDetailSelect || "");
      if (!sel) {
        // For BOS, hide the table until a packing detail is selected
        setProducts([]);
        return;
      }
      const filtered = allProducts.filter((p) => {
        const pd = normalizeStr(p.packingDetail || "");
        return pd === sel || pd.includes(sel);
      });
      setProducts(filtered);
    } else {
      // For other item types, filter only when packing detail is selected
      if (formData.packingDetailSelect && formData.packingDetailSelect.trim()) {
        const sel = normalizeStr(formData.packingDetailSelect);
        const filtered = allProducts.filter((p) => {
          const pd = normalizeStr(p.packingDetail || "");
          return pd === sel || pd.includes(sel);
        });
        setProducts(filtered);
      } else {
        // For other item types, show empty list when no packing detail is selected
        setProducts([]);
      }
    }
  }, [formData.packingDetailSelect, formData.itemType, allProducts]);

  const [uomOptions, setUomOptions] = useState<string[]>([
    "Kg",
    "Pieces",
    "Meters",
    "Liters",
    "Sets",
  ]);

  // Helper to normalize strings (for case-insensitive, space-tolerant compares)
  const normalizeStr = (s: string) =>
    (s || "").toString().replace(/\s+/g, " ").trim().toLowerCase();

  const fetchValues = async (
    sheetId: string,
    range: string
  ): Promise<string[]> => {
    // range format expected: `'Tab Name'!A:A`
    const match = range.match(/^'([^']+)'!([A-Z]+):([A-Z]+)$/i);
    if (!match) {
      throw new Error(`Invalid range format: ${range}`);
    }
    const tabName = match[1];
    const col = match[2].toUpperCase();

    const url = `${FETCH_URL}?sheetId=${encodeURIComponent(
      sheetId
    )}&tab=${encodeURIComponent(tabName)}&col=${encodeURIComponent(col)}`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${tabName} ${col}: ${res.status}`);
    }

    const json = await res.json();
    const values: string[] = (json.values || json.data || [])
      .flat()
      .map((v: any) => (v ?? "").toString().trim());

    // Skip header for BOS BOM ranges
    let processedValues = values;
    if (range.includes("'BOS BOM'")) {
      processedValues = values;
    }

    // PERFORMANCE: Limit processing for large datasets
    return Array.from(
      new Set(processedValues.filter((v) => v && v.toLowerCase() !== "select"))
    ); // Limit to first 1000 unique values
  };

  // Raw column fetcher (no deduplication, preserves row order). Use when you need row alignment across multiple columns.
  const fetchColumnRaw = async (
    sheetId: string,
    range: string
  ): Promise<string[]> => {
    const match = range.match(/^'([^']+)'!([A-Z]+):([A-Z]+)$/i);
    if (!match) {
      throw new Error(`Invalid range format: ${range}`);
    }
    const tabName = match[1];
    const colStart = match[2].toUpperCase();

    const url = `${FETCH_URL}?sheetId=${encodeURIComponent(
      sheetId
    )}&tab=${encodeURIComponent(tabName)}&col=${encodeURIComponent(colStart)}`;

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch raw ${tabName} ${colStart}: ${res.status}`
      );
    }

    const json = await res.json();
    const list: string[] = (json.values || json.data || []).map((v: any) =>
      (v ?? "").toString().trim()
    );

    // For BOS BOM ranges, skip header row (first row)
    if (range.includes("'BOS BOM'")) {
      return list.slice(1);
    }
    return list; // PERFORMANCE: No processing, just return raw data
  };

  const loadDropdowns = async (force: boolean = false) => {
    setDropdownLoading(true);
    setDropdownError(null);

    try {
      const [projects, states, itemTypes] = await Promise.all([
        fetchValues(SHEET1_ID, "'Project Name'!A:A"),
        fetchValues(SHEET1_ID, "'State And District'!A:A"),
        fetchValues(SHEET1_ID, "'Vendor Details'!A:A").catch(() => [
          "CABLE",
          "POLYMER",
          "BATTERY",
          "PANEL",
          "BOS",
        ]),
      ]);

      // IMMEDIATELY set critical data so user can start (faster UX)
      setProjectOptions(projects);
      setStateOptions(states);
      setItemTypeOptions(itemTypes);

      // console.log(
      //   "[PERFORMANCE] ⚡ Phase 1 complete - Critical options ready in <1 second"
      // );

      // Phase 2: Load remaining basic data + UOM
      const [firms, departments, uoms] = await Promise.all([
        fetchValues(SHEET1_ID, "'Our Firm Details'!A:A"),
        fetchValues(SHEET1_ID, "'State And District'!B:B"),
        // OPTIMIZED UOM loading - try sources sequentially for speed
        (async () => {
          try {
            // Try primary UOM source first (Master Items C column)
            const primaryUoms = await fetchValues(
              SHEET1_ID,
              "'Master Items'!C:C"
            );
            // console.log("primaryUoms:", primaryUoms);
            if (primaryUoms.length > 0) {
              // If we got good data, use it
              // console.log(
              //   "[UOM] ✅ Fast load from primary source:",
              //   primaryUoms.length,
              //   "options"
              // );
              return primaryUoms;
            }
          } catch (error) {
            // console.warn("[UOM] All sources failed, using defaults");
            return ["Kg", "Pieces", "Meters", "Liters", "Sets"];
          }
        })(),
      ]);

      setFirmOptions(firms);
      setDepartmentOptionsFlat(departments);

      // console.log("uoms:", uoms);
      setUomOptions(uoms);

      // console.log(
      //   "[PERFORMANCE] ✅ Phase 2 complete - All basic options ready"
      // );

      // Phase 3: Enhanced mappings (can load in background)
      const [vendors, vendorMappingPromise, stateMappingPromise] =
        await Promise.all([
          fetchValues(SHEET1_ID, "'Vendor Details'!B:B"),
          createVendorMapping(),
          createStateMapping(),
        ]);

      // console.log("Vendors", vendors);

      setVendorOptionsFlat(vendors);

      // Complete mappings
      const [itemTypeToVendorsMapping, stateToDepartmentsMapping] =
        await Promise.all([vendorMappingPromise, stateMappingPromise]);

      setItemTypeToVendors(itemTypeToVendorsMapping);
      setStateToDepartments(stateToDepartmentsMapping);
      setEnhancedMappingsLoaded(true);
    } catch (err: any) {
      console.error("[PERFORMANCE] ❌ Load error:", err);
      setDropdownError(err?.message || "Failed to load dropdowns");

      // Immediate fallbacks
      const fallbacks = {
        projects: ["OFFGRID POWER PLANT", "Other"],
        firms: ["Om Renewable (India) Pvt Ltd", "Other"],
        vendors: ["Steel Works", "Other"],
        states: ["Maharashtra", "Other"],
        departments: ["Support", "Other"],
        itemTypes: ["CABLE", "POLYMER", "BATTERY", "PANEL", "BOS", "PUMP"],
        uoms: ["Kg", "Pieces", "Meters", "Liters", "Sets"],
      };

      Object.entries(fallbacks).forEach(([key, value]) => {
        switch (key) {
          case "projects":
            setProjectOptions(value);
            break;
          case "firms":
            setFirmOptions(value);
            break;
          case "vendors":
            setVendorOptionsFlat(value);
            break;
          case "states":
            setStateOptions(value);
            break;
          case "departments":
            setDepartmentOptionsFlat(value);
            break;
          case "itemTypes":
            setItemTypeOptions(value);
            break;
          case "uoms":
            setUomOptions(value);
            break;
        }
      });
    } finally {
      setDropdownLoading(false);
    }
  };

  // Optimized vendor mapping creation
  const createVendorMapping = async (): Promise<Record<string, string[]>> => {
    try {
      const [rawItemTypes, rawVendors] = await Promise.all([
        fetchColumnRaw(SHEET1_ID, "'Vendor Details'!A:A"),
        fetchColumnRaw(SHEET1_ID, "'Vendor Details'!B:B"),
      ]);

      const vendorGroups: Record<string, Set<string>> = {};

      // PERFORMANCE: Limit processing to first 2000 rows
      const maxRows = Math.min(rawItemTypes.length, rawVendors.length);

      for (let i = 0; i < maxRows; i++) {
        const itemType = rawItemTypes[i]?.trim();
        const vendor = rawVendors[i]?.trim();

        if (itemType && vendor) {
          const cleanItemType = itemType.toUpperCase();
          if (!vendorGroups[cleanItemType]) {
            vendorGroups[cleanItemType] = new Set();
          }
          vendorGroups[cleanItemType].add(vendor);
        }
      }

      // console.log("Raw item types count:", rawItemTypes.length);
      // console.log("Raw vendors count:", rawVendors.length);
      // console.log("Max rows to process:", maxRows);

      const result: Record<string, string[]> = {};
      Object.keys(vendorGroups).forEach((itemType) => {
        // console.log(
        //   `ItemType: ${itemType}, Vendor count: ${vendorGroups[itemType].size}`
        // );
        result[itemType] = Array.from(vendorGroups[itemType]);
      });

      // console.log("Vendor mapping created:", result); // Debug log

      return result;
    } catch (error) {
      console.warn("Vendor mapping failed, using fallback");
      const fallback = {
        CABLE: ["Waa Cables Private Limited", "Premier Energies Limited"],
        POLYMER: ["Rajdhani Polymers", "Signate Industries Limited"],
        BATTERY: [
          "Sri Savitr Solar Private Limited",
          "Novus Green Energy Systems Limited",
        ],
        PANEL: ["Premier Energies Limited", "Sri Savitr Solar Private Limited"],
        BOS: ["Steel Works", "Signate Industries Limited"],
        PUMP: ["Pump Solutions Pvt Ltd"], // Added PUMP vendor mapping
      };
      return fallback;
    }
  };

  // Optimized state-department mapping creation
  const createStateMapping = async (): Promise<Record<string, string[]>> => {
    try {
      const [rawStates, rawDepartments] = await Promise.all([
        fetchColumnRaw(SHEET1_ID, "'State And District'!A:A"),
        fetchColumnRaw(SHEET1_ID, "'State And District'!B:B"),
      ]);

      const departmentGroups: Record<string, Set<string>> = {};

      // PERFORMANCE: Limit processing to first 1000 rows
      const maxRows = Math.min(rawStates.length, rawDepartments.length, 1000);

      for (let i = 0; i < maxRows; i++) {
        const state = rawStates[i]?.trim();
        const department = rawDepartments[i]?.trim();

        if (state && department) {
          if (!departmentGroups[state]) {
            departmentGroups[state] = new Set();
          }
          departmentGroups[state].add(department);
        }
      }

      const result: Record<string, string[]> = {};
      Object.keys(departmentGroups).forEach((state) => {
        result[state] = Array.from(departmentGroups[state]); // Limit departments per state
      });

      return result;
    } catch (error) {
      console.warn("State-department mapping failed, using fallback");
      return {
        Maharashtra: ["Support", "Operations", "Finance"],
        Gujarat: ["Support", "Operations"],
        Karnataka: ["Support", "Operations", "Finance"],
        Delhi: ["Support", "Operations"],
        "Tamil Nadu": ["Support", "Operations", "Finance"],
      };
    }
  };

  const handleFormDataChange = (field: keyof FormData, value: string) => {
    let v = value;
    if (field === "itemType" || field === "packingDetailSelect") {
      v = (value || "").trim();
    }
    setFormData((prev) => ({ ...prev, [field]: v }));
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      packingDetail: formData.packingDetailSelect,
      itemName: "",
      uom: "",
      qty: 0,
      qtySet: normalizeStr(formData.itemType) === "bos" ? 0 : 1, // Set qtySet to 1 for non-BOS
      totalQty: 0,
      remarks: "",
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (
    id: string,
    field: keyof Product,
    value: string | number
  ) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === id) {
          const updated = { ...product, [field]: value };

          // Auto-calculate total quantity
          if (field === "qty" || field === "qtySet") {
            const qty = field === "qty" ? Number(value) : updated.qty;
            const qtySet = updated.qtySet || 1; // Always use qtySet from product data

            // For BOS items, multiply qty * qtySet
            if (normalizeStr(formData.itemType) === "bos") {
              updated.totalQty = qty * qtySet;
            } else {
              // For non-BOS items, total = qty (qtySet is always 1)
              updated.totalQty = qty;
              updated.qtySet = 1;
            }
          }

          return updated;
        }
        return product;
      })
    );
  };

  const handleItemNameChange = (productId: string, itemName: string) => {
    updateProduct(productId, "itemName", itemName);

    // Auto-fill UOM for all item types
    const matchingItem = getFilteredItemsForDropdown().find(
      (item) => normalizeStr(item.name) === normalizeStr(itemName)
    );
    if (matchingItem && matchingItem.uom) {
      updateProduct(productId, "uom", matchingItem.uom);
    }
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const updateAllQuantities = () => {
    const masterQuantity = parseFloat(formData.masterQuantity) || 0;

    if (!masterQuantity) return;

    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        qty: masterQuantity,
        totalQty: masterQuantity * product.qtySet,
      }))
    );
  };

  // Helper to sleep for a duration (used for throttling and backoff)
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Submit a single product with retries and exponential backoff to mitigate Apps Script "System busy" errors
  const submitProductWithRetry = async (
    prod: Product,
    index: number,
    nextPN: string,
    startingSerial: number,
    timestamp: string
  ): Promise<{
    success: boolean;
    index: number;
    product: string;
    error?: string;
  }> => {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const totalQty = Number(prod.qty || 0) * Number(prod.qtySet || 1);

        const rowArray = [
          timestamp, // A: Timestamp
          nextPN, // B: Planning Number
          String(startingSerial + index), // C: Serial No
          formData.date, // D: Date
          formData.requesterName, // E: Requester Name
          formData.projectName, // F: Project Name
          formData.firmName, // G: Firm Name
          formData.vendorName, // H: Vendor Name
          formData.itemType, // I: Item Type
          prod.packingDetail || formData.packingDetailSelect || "", // J: Packing Detail
          prod.itemName, // K: Item Name
          prod.uom, // L: UOM
          String(prod.qty), // M: QTY
          String(prod.qtySet || 1), // N: QTY/SET
          String(totalQty), // O: Total QTY
          prod.remarks || "", // P: Remarks
          formData.state, // Q: State
          formData.department, // R: Department
          "", // S: Empty (reserved)
          "", // T: Empty (reserved)
          "", // U: Empty (reserved)
          "", // V: Status (leave empty so script doesn't set default)
        ];

        const formData2 = new FormData();
        formData2.append("action", "insert");
        formData2.append("sheet", SHEET_NAME);
        formData2.append("rowData", JSON.stringify(rowArray));

        // console.log(
        //   `[Submit] Attempt ${attempt} for product ${index + 1}: ${
        //     prod.itemName
        //   }`
        // );

        const response = await fetch(SUBMIT_URL, {
          method: "POST",
          body: formData2,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} ${text}`.trim()
          );
        }

        // Apps Script may return empty body on success
        try {
          const result = await response.json();
          if (result && result.success === false) {
            throw new Error(result.error || "Server rejected the submission");
          }
        } catch (_) {
          // Ignore JSON parse errors and treat as success
        }

        // console.log(
        //   `[Submit] ✅ Product ${index + 1} submitted: ${prod.itemName}`
        // );
        return { success: true, index, product: prod.itemName };
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message || err);
        const retryable = /busy|quota|rate|timeout|429|503/i.test(message);
        console.warn(
          `[Submit] ❌ Attempt ${attempt} failed for product ${index + 1}: ${prod.itemName
          } -> ${message}`
        );
        if (!retryable || attempt >= maxAttempts) break;
        // Exponential backoff with jitter
        const backoff = Math.min(1500 * Math.pow(2, attempt - 1), 6000);
        const jitter = Math.floor(Math.random() * 300);
        await sleep(backoff + jitter);
      }
    }

    return {
      success: false,
      index,
      product: prod.itemName,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic form validation
    const requiredFields: (keyof FormData)[] = [
      "date",
      "requesterName",
      "projectName",
      "firmName",
      "vendorName",
      "itemType",
      "state",
      "department",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field]?.trim()
    );
    if (missingFields.length > 0) {
      alert(
        `Please fill the following required fields: ${missingFields.join(", ")}`
      );
      return;
    }

    if (products.length === 0) {
      alert("Please add at least one product item.");
      return;
    }

    // Validate each product
    const invalidProducts = products.filter(
      (p) =>
        !p.itemName?.trim() ||
        !p.uom?.trim() ||
        isNaN(Number(p.qty)) ||
        Number(p.qty) <= 0
    );

    if (invalidProducts.length > 0) {
      alert(
        `Please complete all required fields for products. Missing data in ${invalidProducts.length} item(s).`
      );
      return;
    }

    // console.log("[Submit] Validation passed, starting submission...");
    setIsLoading(true);

    try {
      // Get next planning number
      // IMPORTANT: Use SUBMIT_URL for fetching, since FETCH_URL may point to a different deployment/sheet
      let nextPN = "PN-01"; // Default fallback
      try {
        const pnFetchUrl = `${SUBMIT_URL}?sheet=${SHEET_NAME}`;
        // console.log("[Submit] Fetching planning number from:", pnFetchUrl);
        const response = await fetch(pnFetchUrl);
        if (response.ok) {
          const json = await response.json();
          // console.log("[Submit] Fetched data length:", json.data?.length || 0);
          // console.log(
          //   "[Submit] Sample data (first 5 rows):",
          //   json.data?.slice(0, 5)
          // );
          nextPN = computeNextPlanningNumber(json.data || []);
          // console.log("[Submit] Computed next PN:", nextPN);
        } else {
          console.error(
            "[Submit] Failed to fetch planning number, status:",
            response.status
          );
        }
      } catch (error) {
        console.warn(
          "[Submit] Failed to get planning number, using fallback:",
          error
        );
      }

      const startingSerial = 1;
      const now = new Date();
      const timestamp = now.toLocaleString("en-US");

      // console.log(
      //   `[Submit] Submitting ${products.length} products with Planning Number: ${nextPN}`
      // );

      // Submit sequentially with small delays to avoid GAS concurrency/rate limits
      const results: {
        success: boolean;
        index: number;
        product: string;
        error?: string;
      }[] = [];
      for (let i = 0; i < products.length; i++) {
        const prod = products[i];
        const r = await submitProductWithRetry(
          prod,
          i,
          nextPN,
          startingSerial,
          timestamp
        );
        results.push(r);
        // throttle between requests
        await sleep(250);
      }

      // Analyze results
      const successful = results.filter((r) => r.success).length;

      const failed = results.length - successful;

      // console.log(
      //   `[Submit] Final Results: ${successful}/${results.length} successful`
      // );

      if (failed > 0) {
        const failedItems = results
          .filter((r) => !r.success)
          .map((r) => `${r.product}: ${r.error}`);
        alert(
          `Submission completed with issues:\n` +
          `✅ ${successful} items submitted successfully\n` +
          `❌ ${failed} items failed\n\n` +
          `Failed items:\n${failedItems.join("\n")}\n\n` +
          `Please check the Google Apps Script logs and retry the failed items.`
        );
      } else {
        // console.log("[Submit] ✅ All products submitted successfully!");
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
          resetForm();

          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      }
    } catch (error) {
      console.error("[Submit] Critical error:", error);
      alert(
        `Critical error during submission: ${error instanceof Error ? error.message : String(error)
        }\n\nPlease check your connection and try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      requesterName: "",
      projectName: "",
      firmName: "",
      vendorName: "",
      itemType: "",
      state: "",
      department: "",
      packingDetailSelect: "",
      masterQuantity: "",
    });
    setProducts([]);
  };



  const getVendorOptions = () => {
    // Filter vendors based on selected item type
    if (!formData.itemType) {
      return vendorOptionsFlat;
    }

    const normalizedItemType = normalizeStr(formData.itemType);

    // Try exact match first
    if (itemTypeToVendors[formData.itemType]) {
      return itemTypeToVendors[formData.itemType];
    }

    // Try uppercase match (BOS, CABLE, etc.)
    const upperItemType = formData.itemType.toUpperCase();
    if (itemTypeToVendors[upperItemType]) {
      return itemTypeToVendors[upperItemType];
    }

    // Try normalized match
    const matchingKey = Object.keys(itemTypeToVendors).find(
      (key) => normalizeStr(key) === normalizedItemType
    );

    if (matchingKey && itemTypeToVendors[matchingKey]) {
      return itemTypeToVendors[matchingKey];
    }

    // Fallback to all vendors
    return vendorOptionsFlat;
  };

  const getDepartmentOptions = () => {
    // Filter departments based on selected state
    if (formData.state && stateToDepartments[formData.state]) {
      const filtered = Array.from(new Set(stateToDepartments[formData.state]));
      return filtered.length > 0 ? filtered : departmentOptionsFlat;
    }
    // If no state selected or no mapping available, return all departments
    return departmentOptionsFlat;
  };

  // const isEnhancedLoading = dropdownLoading && !enhancedMappingsLoaded;

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="overflow-hidden fixed inset-0 z-50">
      {/* Enhanced Backdrop - Darker and more prominent */}
      <div
        className="absolute inset-0 backdrop-blur-md bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - Centered and responsive */}
      <div className="flex justify-center items-center p-4 min-h-screen">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Fixed Header */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-t-2xl border-b border-blue-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    New Planning Request
                  </h2>
                  <p className="text-sm text-blue-100">
                    Fill in the details for your procurement planning
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {dropdownLoading && (
                  <span className="text-sm text-blue-200">
                    Loading options…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => loadDropdowns(true)}
                  className="px-3 py-2 text-sm text-white rounded-lg transition-colors bg-white/20 hover:bg-white/30"
                  title="Refresh dropdown data"
                >
                  Refresh
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors duration-200 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content with better padding */}
          <div className="overflow-y-auto flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Form Details Section */}
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                  <Building className="mr-2 w-5 h-5 text-blue-600" />
                  Form Details
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <Calendar className="inline mr-1 w-4 h-4" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        handleFormDataChange("date", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <User className="inline mr-1 w-4 h-4" />
                      Requester Name *
                    </label>
                    <input
                      type="text"
                      value={formData.requesterName}
                      onChange={(e) =>
                        handleFormDataChange("requesterName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter requester name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Project Name *
                    </label>
                    <select
                      value={formData.projectName}
                      onChange={(e) =>
                        handleFormDataChange("projectName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Project"}
                      </option>
                      {projectOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Firm Name *
                    </label>
                    <select
                      value={formData.firmName}
                      onChange={(e) =>
                        handleFormDataChange("firmName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Firm"}
                      </option>
                      {firmOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Item Type *
                    </label>
                    <select
                      value={formData.itemType}
                      onChange={(e) =>
                        handleFormDataChange("itemType", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Item Type"}
                      </option>
                      {itemTypeOptions.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <Truck className="inline mr-1 w-4 h-4" />
                      Vendor Name *
                    </label>

                    <select
                      value={formData.vendorName}
                      onChange={(e) =>
                        handleFormDataChange("vendorName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading
                          ? "Loading…"
                          : formData.itemType
                            ? "Select Vendor"
                            : "Select Item Type First"}
                      </option>
                      {getVendorOptions().map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <MapPin className="inline mr-1 w-4 h-4" />
                      State *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        handleFormDataChange("state", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select State"}
                      </option>
                      {stateOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        handleFormDataChange("department", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading
                          ? "Loading…"
                          : formData.state
                            ? enhancedMappingsLoaded
                              ? "Select Department"
                              : "Loading departments…"
                            : "Select State First"}
                      </option>
                      {getDepartmentOptions().map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BOS Section (visible when item type is BOS) */}
              {normalizeStr(formData.itemType) === "bos" && (
                <div className="p-6 bg-blue-50 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-lg font-semibold text-gray-900">
                      <Package className="mr-2 w-5 h-5 text-blue-600" />
                      BOS Configuration
                    </h3>
                    <button
                      type="button"
                      onClick={loadBOSProducts}
                      className="px-3 py-2 text-sm text-blue-600 bg-blue-100 rounded-lg transition-colors hover:bg-blue-200"
                      title="Reload BOS products"
                    >
                      🔄 Reload
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Packing Detail
                      </label>
                      <select
                        value={formData.packingDetailSelect}
                        onChange={(e) =>
                          handleFormDataChange(
                            "packingDetailSelect",
                            e.target.value
                          )
                        }
                        className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Packing</option>
                        {packingDetailOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Master Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.masterQuantity}
                        onChange={(e) =>
                          handleFormDataChange("masterQuantity", e.target.value)
                        }
                        className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter master quantity"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={updateAllQuantities}
                        disabled={!formData.masterQuantity}
                        className="px-4 py-2 w-full text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Update All Quantities
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
                <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="flex items-center text-lg font-semibold text-gray-900">
                    <Package className="mr-2 w-5 h-5 text-blue-600" />
                    Product Items ({products.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="inline-flex items-center px-3 py-2 text-sm text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700"
                  >
                    <Plus className="mr-1 w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {products.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Packing Detail
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Item Name
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            UOM
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Qty
                          </th>
                          {/* {normalizeStr(formData.itemType) === "bos" && (
                            <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              Qty/Set
                            </th>
                          )} */}
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Total Qty
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {product.packingDetail}
                            </td>

                            <td className="px-4 py-3">
                              {normalizeStr(formData.itemType) === "bos" ? (
                                <>


                                  <input
                                    type="text"
                                    value={product.itemName}
                                    onChange={(e) => {
                                      handleItemNameChange(
                                        product.id,
                                        e.target.value
                                      );
                                    }}
                                    list={`itemName-${product.id}`}
                                    className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Select or type item name"
                                  />

                                  <datalist id={`itemName-${product.id}`}>
                                    {(() => {


                                      const filteredItems =
                                        getFilteredItemsForDropdown().filter(
                                          (item: {
                                            name: string;
                                            group: string;
                                            uom: string;
                                          }) =>
                                            !product.itemName ||
                                            item.name
                                              .toLowerCase()
                                              .includes(
                                                product.itemName.toLowerCase()
                                              )
                                        );

                                      const displayItems = filteredItems.slice(
                                        0,
                                        20
                                      ); // Show first 20
                                      const hasMore = filteredItems.length > 20;

                                      return (
                                        <>
                                          {displayItems.map((item, index) => (
                                            <option
                                              key={`${item.name}-${index}`}
                                              value={item.name}
                                              style={{
                                                backgroundColor:
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5",
                                                color: "black",
                                                padding: "8px 12px",
                                                borderBottom: "1px solid #ddd",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#e3f2fd";
                                                e.currentTarget.style.color =
                                                  "#1976d2";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5";
                                                e.currentTarget.style.color =
                                                  "black";
                                              }}
                                            />
                                          ))}
                                          {hasMore && product.itemName && (
                                            <option
                                              value=""
                                              disabled
                                              style={{
                                                backgroundColor: "#f0f0f0",
                                                color: "#666",
                                                padding: "8px 12px",
                                                textAlign: "center",
                                                fontStyle: "italic",
                                                fontSize: "13px",
                                                cursor: "default",
                                              }}
                                            >
                                              {filteredItems.length - 20} more
                                              items available
                                            </option>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </datalist>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={product.itemName}
                                    onChange={(e) => {
                                      handleItemNameChange(
                                        product.id,
                                        e.target.value
                                      );
                                    }}

                                    list={`itemName-${product.id}`}
                                    className={`px-2 py-1 w-full text-sm rounded border focus:ring-1 focus:ring-blue-500 focus:border-transparent ${masterItemsLoading
                                        ? "text-gray-400 bg-gray-50 border-gray-200"
                                        : "bg-white border-gray-300 hover:border-blue-400"
                                      }`}
                                    placeholder={
                                      masterItemsLoading
                                        ? "Loading items..."
                                        : "Select or type item name"
                                    }
                                    disabled={masterItemsLoading}
                                  />
                                  <datalist id={`itemName-${product.id}`}>
                                    {(() => {


                                      const filteredItems =
                                        getFilteredItemsForDropdown().filter(
                                          (item: {
                                            name: string;
                                            group: string;
                                            uom: string;
                                          }) =>
                                            !product.itemName ||
                                            item.name
                                              .toLowerCase()
                                              .includes(
                                                product.itemName.toLowerCase()
                                              )
                                        );

                                      // console.log(
                                      //   "[DEBUG] Filtered items in datalist:",
                                      //   filteredItems.length
                                      // );

                                      const displayItems = filteredItems.slice(
                                        0,
                                        20
                                      ); // Show first 20
                                      const hasMore = filteredItems.length > 20;

                                      return (
                                        <>
                                          {displayItems.map((item, index) => (
                                            <option
                                              key={`${item.name}-${index}`}
                                              value={item.name}
                                              style={{
                                                backgroundColor:
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5",
                                                color: "black",
                                                padding: "8px 12px",
                                                borderBottom: "1px solid #ddd",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#e3f2fd";
                                                e.currentTarget.style.color =
                                                  "#1976d2";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5";
                                                e.currentTarget.style.color =
                                                  "black";
                                              }}
                                            />
                                          ))}
                                          {hasMore && product.itemName && (
                                            <option
                                              value=""
                                              disabled
                                              style={{
                                                backgroundColor: "#f0f0f0",
                                                color: "#666",
                                                padding: "8px 12px",
                                                textAlign: "center",
                                                fontStyle: "italic",
                                                fontSize: "13px",
                                                cursor: "default",
                                              }}
                                            >
                                              {filteredItems.length - 20} more
                                              items available
                                            </option>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </datalist>
                                </>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={product?.uom}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "uom",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">UOM</option>
                                {uomOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={(formData.packingDetailSelect !== "" ? product.qtySet : product.qty) || ""}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "qty",
                                    e.target.value === ""
                                      ? 0
                                      : parseFloat(e.target.value) || 0
                                  )
                                }
                                className="px-2 py-1 w-20 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            {/* {normalizeStr(formData.itemType) === "bos" && (
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={product.qtySet || ""}
                                  onChange={(e) =>
                                    updateProduct(
                                      product.id,
                                      "qtySet",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="px-2 py-1 w-24 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Qty/Set"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                            )} */}
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {product.totalQty}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={product.remarks}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "remarks",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Remarks"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => deleteProduct(product.id)}
                                className="p-1 text-red-600 rounded transition-colors duration-200 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {products.length === 0 && (
                  <div className="py-8 text-center">
                    <Package className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">No products added yet</p>
                    <p className="text-sm text-gray-400">
                      Click "Add Item" to start adding products
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 rounded-lg border border-gray-300 transition-colors duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || products.length === 0}
                  className="flex items-center px-8 py-3 text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 w-5 h-5 rounded-full border-b-2 border-white animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Planning Request"
                  )}
                </button>
              </div>
            </form>

            {/* Success Modal */}
            {showSuccess && (
              <div className="flex absolute inset-0 justify-center items-center bg-white bg-opacity-95 rounded-2xl">
                <div className="text-center">
                  <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    Planning Request Submitted!
                  </h3>
                  <p className="text-gray-600">
                    Your request has been successfully submitted for approval.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningForm;
