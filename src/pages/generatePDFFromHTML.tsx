import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReactDOM from "react-dom/client";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// PDF Template Component
const PDFTemplate = ({ data, firmData }) => {
  // console.log("FirmData", firmData);
  // console.log("data", data);
  if (!data || !firmData) {
    return <div>Error: Missing data for PDF generation</div>;
  }

  const calculateTotals = () => {
    const subtotal = data.products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      return sum + (baseAmount - discountAmount);
    }, 0);

    const gstAmount = data.products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;
      return sum + (amountAfterDiscount * product.gst) / 100;
    }, 0);

    const grandTotal = subtotal + gstAmount;

    const totalDiscount = data.products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      return sum + discountAmount;
    }, 0);

    return { subtotal, gstAmount, grandTotal, totalDiscount };
  };

  const numberToWords = (num) => {
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

    const convertHundreds = (n) => {
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

  const totals = calculateTotals();
  const advanceAmount = totals.grandTotal * 0.05;
  const alreadyPaid = 5936000;
  const balanceAdvance = advanceAmount - alreadyPaid;

  // Helper function to get state from product description
  const getStateFromProduct = (product) => {
    if (product.description && product.description.includes("Maharashtra"))
      return "Maharashtra";
    if (
      product.description &&
      (product.description.includes("Punjab") ||
        product.description.includes("Haryana") ||
        product.description.includes("Jharkhand"))
    )
      return "Punjab, Haryana & Jharkhand";
    if (product.description && product.description.includes("Uttar Pradesh"))
      return "Uttar Pradesh";
    return "Various States";
  };

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "white",
        fontFamily: "Arial, sans-serif",
        fontSize: "10pt",
        lineHeight: "1.4",
        color: "#000",
      }}
    >
      {/* === COMPANY HEADER === */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "15px",
          borderBottom: "2px solid #000",
          paddingBottom: "5px",
        }}
      >
        {/* ADD LOGO HERE */}
        <div style={{ marginBottom: "10px" }}>
          <img
            src={
              firmData.name === "Varyaa Renewable Pvt Ltd"
                ? "/Images/VaryaaLogo.PNG"
                : "/Images/RBPLogo.jpeg"
            }
            alt="Company Logo"
            style={{
              height: "50px",
              width: "auto",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>

        {/* <h1
          style={{
            margin: "0",
            fontSize: "14pt",
            fontWeight: "bold",
            color: "#000",
            textTransform: "uppercase",
          }}
        >
          {firmData.name}
        </h1>
        <p style={{ margin: "2px 0", fontSize: "8pt" }}>{firmData.address}</p>
        <p style={{ margin: "2px 0", fontSize: "8pt" }}>
          <span style={{color: "green"}}>t</span>{firmData.phone} <span style={{color: "#HEXCODE"}}>e</span>{firmData.email} <span style={{color: "#HEXCODE"}}>w</span>ww.rbpindia.com
        </p> */}
        <h2
          style={{
            margin: "10px",
            fontSize: "12pt",
            fontWeight: "bold",
            textDecoration: "underline",
          }}
        >
          PURCHASE ORDER
        </h2>
      </div>

      {/* === HEADER SECTION - Supplier & PO Info === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
          fontSize: "9pt",
        }}
      >
        {/* Left Column - Supplier Info */}
        <div style={{ width: "60%" }}>
          <p style={{ margin: "2px 0", fontWeight: "bold" }}>
            M/s {data.supplierName}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>Address-</strong> {data.supplierAddress}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>GSTIN-</strong> {data.gstNumber}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>Contact Person-</strong> {data.supplierName}
          </p>
        </div>

        {/* Right Column - PO Info */}
        <div style={{ width: "35%", textAlign: "left" }}>
          <p style={{ margin: "2px 0" }}>
            <strong>PO No:</strong> {data.poNumber}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>PO Date:</strong> {data.poDate}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>GSTIN:</strong> {data.gstNumber}
          </p>
        </div>
      </div>

      {/* === MAIN TITLE === */}
      {/* <div style={{
        padding: '5px 0',
        marginBottom: '5px',
        fontWeight: 'bold',
        fontSize: '9pt',
        borderBottom: '1px solid #000'
      }}>
        <span style={{ backgroundColor: '#d3d3d3', padding: '2px 5px' }}>
          Solar Energy Equipment & Component - Solar PV Modules :
        </span>
      </div> */}

      {/* === PRODUCTS TABLE === */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "8pt",
          marginBottom: "5px",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "5%",
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              Sl.No.
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "50%",
                textAlign: "left",
                backgroundColor: "#fff",
              }}
            >
              Material Description
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "15%",
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              QTY
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "15%",
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              Unit Rate (Rs)
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "15%",
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              GST %
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "15%",
                textAlign: "center",
                backgroundColor: "#fff",
              }}
            >
              Discount %
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: "5px",
                width: "15%",
                textAlign: "right",
                backgroundColor: "#fff",
              }}
            >
              Amount(Rs)
            </th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((product, index) => {
            const wattage = product.product.includes("mm")
              ? parseInt(product.product.match(/\d+/)?.[0] || "500") * 10
              : 500;
            const state = getStateFromProduct(product);

            const baseAmount = product.rate * product.qty;
            const discountAmount = (baseAmount * product.discount) / 100;
            const amountAfterDiscount = baseAmount - discountAmount;
            const gstAmount = (amountAfterDiscount * product.gst) / 100;
            const finalAmount = amountAfterDiscount + gstAmount;
            const unit = product.unit;
            const quantityMW = (product.qty / 1000).toFixed(1);
            const ratePerWp = (product.rate / 1000).toFixed(2);

            return (
              <tr key={index}>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  {index + 1}
                </td>

                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    verticalAlign: "top",
                  }}
                >
                  {product.product} (
                  {product.description && product.description})
                </td>

                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  {product.qty.toLocaleString("en-IN")}
                  <br />({unit})
                </td>

                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  {product.rate.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <br />
                </td>

                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  {product.gst}
                  <br />
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  {product.discount}
                  <br />
                </td>

                <td
                  style={{
                    border: "1px solid #000",
                    padding: "5px",
                    textAlign: "right",
                    verticalAlign: "top",
                  }}
                >
                  {finalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* === SPECIFICATION AND TOTALS === */}
      <div style={{ marginBottom: "10px" }}>
        {/* <p style={{ fontSize: '7pt', margin: '5px 0', fontStyle: 'italic' }}>
          (Specification – As per Tender Reference No. SECI/C&P/MI/00/0010/2022-23 Dated 31.12.2022 PM-KUSUM scheme of MNRE)
        </p> */}

        <div style={{ textAlign: "right", fontSize: "9pt", marginTop: "5px" }}>
          <div style={{ marginBottom: "3px" }}>
            <span style={{ marginRight: "50px" }}>Total</span>
            <span
              style={{
                display: "inline-block",
                width: "120px",
                textAlign: "right",
              }}
            >
              {totals.subtotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div style={{ marginBottom: "3px" }}>
            <span style={{ marginRight: "50px" }}>GST</span>
            <span
              style={{
                display: "inline-block",
                width: "120px",
                textAlign: "right",
              }}
            >
              {totals.gstAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div style={{ marginBottom: "3px" }}>
            <span style={{ marginRight: "50px" }}>Discount</span>
            <span
              style={{
                display: "inline-block",
                width: "120px",
                textAlign: "right",
              }}
            >
              -
              {totals.totalDiscount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div style={{ marginBottom: "5px", fontWeight: "bold" }}>
            <span style={{ marginRight: "50px" }}>
              Grand Total Amount (Rs.)
            </span>
            <span
              style={{
                display: "inline-block",
                width: "120px",
                textAlign: "right",
              }}
            >
              {totals.grandTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <p style={{ fontSize: "9pt", fontWeight: "bold", margin: "8px 0" }}>
          In Word- Rupees {numberToWords(Math.round(totals.grandTotal))} Only
        </p>
      </div>

      {/* === FOOTER NOTES === */}
      <div
        style={{
          fontSize: "8pt",
          marginBottom: "10px",
          paddingTop: "5px",
          whiteSpace: "pre-line",
        }}
      >
        {data.footerNotes || "No footer notes specified"}
      </div>

      <div
        style={{
          borderTop: "1px solid #000",
          margin: "10px 0",
        }}
      ></div>

      {/* === PAYMENT TERMS === */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{ fontWeight: "bold", fontSize: "9pt", margin: "5px 0" }}>
          Payment Terms:
        </p>
        <div
          style={{
            fontSize: "8pt",
            paddingLeft: "5px",
            whiteSpace: "pre-line",
          }}
        >
          {data.paymentTerms || "No payment terms specified"}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #000",
          margin: "10px 0",
        }}
      ></div>

      {/* === TERMS & CONDITIONS === */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{ fontWeight: "bold", fontSize: "9pt", margin: "5px 0" }}>
          Terms & Conditions:
        </p>
        <div style={{ fontSize: "8pt", paddingLeft: "5px" }}>
          {data.terms &&
            data.terms.map((term, index) => (
              <p key={index} style={{ margin: "3px 0" }}>
                {index + 1}. {term}
              </p>
            ))}
        </div>
      </div>

      {/* === WARRANTY & SPECIFICATION === */}
      <div style={{ marginBottom: "15px", fontSize: "8pt" }}>
        <p style={{ margin: "3px 0" }}>
          <strong>Warranty & Specification:</strong>{" "}
          {data.warrantyText || "No warranty text specified"}
        </p>
      </div>

      {/* === CLOSING SECTION === */}
      <div style={{ marginTop: "20px" }}>
        <p style={{ fontSize: "9pt", margin: "3px 0" }}>Thanking you,</p>
        <p style={{ fontSize: "9pt", margin: "3px 0" }}>For,</p>
        <p style={{ fontSize: "9pt", margin: "3px 0", fontWeight: "bold" }}>
          {firmData.name}
        </p>
        <p
          style={{
            fontSize: "9pt",
            margin: "30px 0 3px 0",
            fontWeight: "bold",
          }}
        >
          Authorized Signatory
        </p>
      </div>

      {/* === COMPANY FOOTER === */}
      <div
        style={{
          marginTop: "30px",
          paddingTop: "10px",
          borderTop: "1px solid #000",
          textAlign: "center",
          fontSize: "8pt",
        }}
      >
        <p style={{ margin: "2px 0", fontWeight: "bold" }}>{firmData.name}</p>
        <p style={{ margin: "2px 0" }}>{firmData.address}</p>
        <p style={{ margin: "2px 0" }}>
          t {firmData.phone} e {firmData.email} www.rbpindia.com
        </p>
      </div>
    </div>
  );
};

// Main function to generate PDF
export const generatePDFFromHTML = async (data, firmData, APPS_SCRIPT_URL) => {
  try {
    // Create a temporary container
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    // Render the PDF template
    const root = ReactDOM.createRoot(container);
    await new Promise((resolve) => {
      root.render(<PDFTemplate data={data} firmData={firmData} />);
      setTimeout(resolve, 100); // Wait for rendering
    });

    // Generate canvas from HTML
    const canvas = await html2canvas(container.firstChild, {
      scale: 5, // ✅ Reduce from 2 to 1.5 (30% faster)
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true, // ✅ Add this
      imageTimeout: 0, // ✅ Add this (skip image loading timeout)
      removeContainer: false, // ✅ Add this
    });

    // Create PDF 1st in one page not auto paginate


  
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");



    // Create PDF with auto-pagination
    // const pdf = new jsPDF("p", "mm", "a4");
    // const imgData = canvas.toDataURL("image/jpeg", 1.0); // ✅ Use JPEG with maximum quality
    // const imgWidth = pdf.internal.pageSize.getWidth();
    // const imgHeight = (canvas.height * imgWidth) / canvas.width; // ✅ Calculate actual height
    // const pageHeight = pdf.internal.pageSize.getHeight();

    // let heightLeft = imgHeight;
    // let position = 0;

    // // ✅ Add first page
    // pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    // heightLeft -= pageHeight;

    // // ✅ Add additional pages if content overflows
    // while (heightLeft > 0) {
    //   position = heightLeft - imgHeight;
    //   pdf.addPage();
    //   pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    //   heightLeft -= pageHeight;
    // }



    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 1 }));
    pdf.restoreGraphicsState();

    // Cleanup
    document.body.removeChild(container);

    // Get PDF as base64
    const pdfBase64 = pdf.output("dataurlstring").split(",")[1];

    // Upload to Google Drive
    const fileName = `PO_${Date.now()}.pdf`;
    const mimeType = "application/pdf";
    const folderId = "1x8zdRdbZn-rTL769dkgUdBHpDPpRiLDZ";

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "uploadFile",
        base64Data: pdfBase64,
        fileName,
        mimeType,
        folderId,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, fileUrl: result.fileUrl };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error?.message || "PDF generation error",
    };
  }
};

// Demo Component
export default function PDFGeneratorDemo() {
  const [status, setStatus] = useState("");

  const sampleData = {
    supplierName: "Novasys Greenergy Pvt. Ltd.",
    supplierAddress:
      "Khasra No. 185, Mouza- Mahalgaon, Teh-Kamptee, Nagpur-441202, Maharastra BHARAT",
    gstNumber: "27AABCJ4808K1ZF",
    poNumber: "RBP/NGPL/PO/23-24/001",
    poDate: "28-11-2023",
    products: [
      {
        product: "500mm Module",
        description: "For Maharashtra",
        qty: 7500,
        unit: "kW",
        rate: 20750,
        gst: 12,
        discount: 0,
      },
      {
        product: "500mm Module",
        description: "For Punjab, Haryana & Jharkhand",
        qty: 2000,
        unit: "kW",
        rate: 20950,
        gst: 12,
        discount: 0,
      },
    ],
    terms: [
      "Acceptance of advance will be considered acceptance of all terms and conditions.",
      "Time is the essence of this contract.",
      "Materials must be in good condition and checked before Dispatch.",
    ],
  };

  const sampleFirmData = {
    name: "RBP RENEWABLE (INDIA) PVT. LTD.",
    address: "303 Guru Ghasidas Plaza, Amapara, G.E Road, Raipur (C.G) 492 001",
    phone: "7999160491",
    email: "ea.gaurav@rbpindia.com",
  };

  const handleGenerate = async () => {
    setStatus("Generating PDF...");
    const result = await generatePDFFromHTML(
      sampleData,
      sampleFirmData,
      "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec"
    );

    if (result.success) {
      setStatus("PDF generated successfully!");
    } else {
      setStatus(`Error: ${result.error}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">PDF Generator Demo</h1>
      <button
        onClick={handleGenerate}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Generate Sample PDF
      </button>
      {status && <p className="mt-4 text-sm">{status}</p>}

      <div
        className="mt-8 border rounded-lg p-4 bg-white shadow-lg overflow-auto"
        style={{ maxHeight: "600px" }}
      >
        <h2 className="text-xl font-semibold mb-4">Preview:</h2>
        <div
          style={{
            transform: "scale(0.7)",
            transformOrigin: "top left",
            width: "142%",
          }}
        >
          <PDFTemplate data={sampleData} firmData={sampleFirmData} />
        </div>
      </div>
    </div>
  );
}
