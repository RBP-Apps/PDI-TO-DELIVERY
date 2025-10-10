// ===== GOOGLE APPS SCRIPT - SUBMIT_URL (WRITING DATA) =====
// Supports INSERT, BATCH_INSERT, UPDATE (INDENT / PO / Approval), UPLOAD, EMAIL


const SPREADSHEET_ID = '1dfxIrs_9r40U0j63QfT0LiPk7Y88SihJUt6-XiwhEj8';
const DEFAULT_SHEET_NAME = 'PO';
const INITIAL_STATUS_ON_INSERT = 'Pending Review';
const DEFAULT_FOLDER_ID = '1your-default-folder-id-here';


// ========== Common Helpers ==========


function jsonResponse(obj, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return setCorsHeaders(response, statusCode);
}


function setCorsHeaders(response, statusCode = 200) {
  try {
    response.addHeader('Access-Control-Allow-Origin', '*');
    response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.addHeader('Access-Control-Max-Age', '3600');
    return response;
  } catch (e) {
    console.error('CORS Headers Error:', e);
    return response;
  }
}


function doOptions(e) {
  console.log('OPTIONS request received');
  const output = ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
  return setCorsHeaders(output);
}


function doGet(e) {
  console.log('GET request received');
  try {
    const params = e.parameter;
    const sheetName = params.sheet || params.sheetName || DEFAULT_SHEET_NAME;


    console.log('GET - Sheet:', sheetName);


    const sheet = getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();


    console.log('Retrieved', data.length, 'rows from', sheetName);


    return jsonResponse({
      success: true,
      data,
      sheetName,
      rowCount: data.length
    });


  } catch (error) {
    console.error('GET ERROR:', error);
    return jsonResponse({
      success: false,
      error: String(error),
      message: 'Failed to retrieve data'
    }, 500);
  }
}


function getSheetByName(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name || DEFAULT_SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + (name || DEFAULT_SHEET_NAME));
  return sheet;
}


function parseRowData(param) {
  if (!param) throw new Error('Missing rowData');
  let data = param;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      throw new Error('rowData must be a JSON array string');
    }
  }
  if (!Array.isArray(data)) throw new Error('rowData must be an array');
  return data;
}


// ========== Main POST Endpoint ==========


function doPost(e) {
  try {
    console.log('doPost called');


    if (!e || !e.parameter) {
      console.log('Missing parameters');
      return jsonResponse({ success: false, error: 'Missing parameters' }, 400);
    }


    const params = e.parameter;
    console.log('Received params:', Object.keys(params));


    const sheetName = params.sheetName || params.sheet || DEFAULT_SHEET_NAME;
    const action = params.action || 'insert';


    console.log('Action:', action, 'Sheet:', sheetName);


    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (eLock) {
      console.error('Could not obtain lock:', eLock);
      return jsonResponse({
        success: false,
        error: 'System busy, please try again',
        message: 'Could not obtain exclusive access to sheet'
      }, 503);
    }


    try {
      const sheet = getSheetByName(sheetName);


      // ===== INSERT =====
      if (action === 'insert') {
        console.log('Starting INSERT action');


        const rowData = parseRowData(params.rowData);
        console.log('Parsed rowData length:', rowData.length);
        console.log('Row preview (A..D):', {
          A: rowData[0],
          B: rowData[1],
          C: rowData[2],
          D: rowData[3],
        });


        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        console.log('Insert at row:', newRowNumber);


        // For Approval sheet allow 5+, otherwise keep 15+ minimum
        if (sheetName === 'Approval') {
          if (rowData.length < 5) {
            throw new Error('Row data too short for Approval: need >= 5 cols');
          }
        } else {
          if (rowData.length < 15) {
            throw new Error(`Row data too short: ${rowData.length} < 15` );
          }
        }


        sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);


        // Set status in V/22 only if provided in rowData (no default)
        try {
          const statusColumn = 22;
          if (rowData.length >= statusColumn) {
            const providedStatus = rowData[statusColumn - 1];
            if (providedStatus && String(providedStatus).trim() !== '') {
              sheet.getRange(newRowNumber, statusColumn).setValue(providedStatus);
              console.log('Set status in Column V:', providedStatus);
            } else {
              console.log('No status provided in rowData, leaving Column V empty');
              // Do not set default status - leave it empty
            }
          }
        } catch (statusErr) {
          console.log('Warning: Failed to set status:', statusErr);
        }


        const insertedPreview = sheet.getRange(newRowNumber, 1, 1, Math.min(5, rowData.length)).getValues()[0];
        console.log('Inserted preview (A..E):', insertedPreview);


        return jsonResponse({
          success: true,
          message: 'Row inserted successfully',
          debug: {
            sheetName,
            insertedAtRow: newRowNumber,
            rowDataLength: rowData.length,
            insertedPreview
          }
        });
      }


      // ===== BATCH INSERT =====
      if (action === 'batch_insert') {
        console.log('Starting BATCH INSERT action');


        let rowsData;
        try {
          rowsData = JSON.parse(params.rowsData);
          console.log('Parsed rowsData length:', rowsData.length);
        } catch (parseError) {
          console.log('Failed to parse rowsData:', parseError);
          throw new Error('Invalid rowsData format for batch insert');
        }


        if (!Array.isArray(rowsData) || rowsData.length === 0) {
          throw new Error('rowsData must be a non-empty array');
        }


        const results = [];
        let successCount = 0;
        let errorCount = 0;
        let currentLastRow = sheet.getLastRow();


        for (let i = 0; i < rowsData.length; i++) {
          try {
            const rowData = rowsData[i];
            const targetRow = currentLastRow + 1 + i;


            sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);


            if (sheetName !== 'Approval') {
              sheet.getRange(targetRow, 22).setValue(INITIAL_STATUS_ON_INSERT);
            }


            results.push({
              index: i,
              success: true,
              rowNumber: targetRow,
              preview: (rowData || []).slice(0, 5)
            });
            successCount++;


            if (i < rowsData.length - 1) Utilities.sleep(30);


          } catch (rowError) {
            console.error(`Failed to insert batch row ${i + 1}:` , rowError);
            results.push({ index: i, success: false, error: rowError.message });
            errorCount++;
          }
        }


        console.log('Batch done:', { successCount, errorCount, total: rowsData.length });


        return jsonResponse({
          success: true,
          message: `Batch insert completed: ${successCount} successful, ${errorCount} failed` ,
          debug: {
            sheetName,
            totalRows: rowsData.length,
            successCount,
            errorCount,
            results
          }
        });
      }


      // ===== UPDATE =====
      if (action === 'update') {
        console.log('Starting UPDATE action for sheet:', sheetName);


        const poNo = params.poNo;
        console.log('Identifier param (poNo/planningNo):', `"${poNo}"` );


        if (!poNo) {
          throw new Error('Missing poNo/planningNo for update');
        }


        const data = sheet.getDataRange().getValues();
        console.log('Rows in sheet:', data.length);


        // Find matching rows by identifier
        const matchingRows = [];
        if (sheetName === 'INDENT') {
          // Planning No in Column B (index 1)
          for (let i = 0; i < data.length; i++) {
            if (String(data[i][1] || '').trim() === String(poNo).trim()) {
              matchingRows.push({ rowIndex: i + 1, identifierType: 'Planning No', identifier: data[i][1] });
            }
          }
        } else if (sheetName === 'PO') {
          // PO No in Column C (index 2)
          for (let i = 0; i < data.length; i++) {
            if (String(data[i][2] || '').trim() === String(poNo).trim()) {
              matchingRows.push({ rowIndex: i + 1, identifierType: 'PO No', identifier: data[i][2] });
            }
          }
        } else if (sheetName === 'Approval') {
          // Planning No in Column B (index 1)
          for (let i = 0; i < data.length; i++) {
            if (String(data[i][1] || '').trim() === String(poNo).trim()) {
              matchingRows.push({ rowIndex: i + 1, identifierType: 'Planning No', identifier: data[i][1] });
            }
          }
        } else {
          // Fallback: try Column B identifier
          for (let i = 0; i < data.length; i++) {
            if (String(data[i][1] || '').trim() === String(poNo).trim()) {
              matchingRows.push({ rowIndex: i + 1, identifierType: 'Col B ID', identifier: data[i][1] });
            }
          }
        }


        console.log('Matching rows:', matchingRows.length, matchingRows);
        if (matchingRows.length === 0) {
          throw new Error(`${sheetName === 'INDENT' ? 'Planning No' : 'PO No'} "${poNo}" not found` );
        }


        let rowData;
        try {
          rowData = JSON.parse(params.rowData);
          console.log('Parsed rowData length:', rowData.length);
        } catch (parseErr) {
          console.log('Failed to parse rowData:', parseErr);
          throw new Error('Invalid rowData format');
        }


        // Field mappings
        let fieldUpdates = {};
        if (sheetName === 'INDENT') {
          // Status V/22, Actual Date T/20
          fieldUpdates = {
            'Status': { rowDataIndex: 17, column: 22 },
            'Actual Date': { rowDataIndex: 19, column: 20 },
          };
        } else if (sheetName === 'PO') {
          // R–X (amounts), Z (payment date), AB–AF (payment fields)
          fieldUpdates = {
            'DataGross Amount': { rowDataIndex: 17, column: 18 }, // R
            'PO Amount':        { rowDataIndex: 18, column: 19 }, // S
            'Tax Amount':       { rowDataIndex: 19, column: 20 }, // T
            'Amount':           { rowDataIndex: 20, column: 21 }, // U
            'PO Qty':           { rowDataIndex: 21, column: 22 }, // V
            'Received Qty':     { rowDataIndex: 22, column: 23 }, // W
            'Rate':             { rowDataIndex: 23, column: 24 }, // X


            'Payment Date':     { rowDataIndex: 25, column: 26 }, // Z (optional)


            // SHIFTED MAPPINGS (AB..AF come from indices 26..30)
            'Status':           { rowDataIndex: 26, column: 28 }, // AB
            'Payment Mode':     { rowDataIndex: 27, column: 29 }, // AC
            'Amount (Payment)': { rowDataIndex: 28, column: 30 }, // AD
            'Reason':           { rowDataIndex: 29, column: 31 }, // AE
            'Reference No':     { rowDataIndex: 30, column: 32 }, // AF
          };
        } else if (sheetName === 'Approval') {
          fieldUpdates = {
            'Status': { rowDataIndex: 3, column: 4 }, // D
            'Remarks': { rowDataIndex: 4, column: 5 }, // E
          };
        }


        let totalUpdated = 0;
        const allUpdates = [];


        matchingRows.forEach((rowInfo, idx) => {
          const currentRow = data[rowInfo.rowIndex - 1];
          let rowUpdated = 0;
          const rowChanges = [];


          Object.entries(fieldUpdates).forEach(([fieldName, mapping]) => {
            const newValue = rowData[mapping.rowDataIndex];


            if (newValue !== null && newValue !== undefined && newValue !== '') {
              const currentValue = currentRow[mapping.column - 1];
              console.log(`[Update] ${fieldName} Row:${rowInfo.rowIndex} Col:${mapping.column} Current:"${currentValue}" New:"${newValue}"` );


              if (String(currentValue) !== String(newValue)) {
                sheet.getRange(rowInfo.rowIndex, mapping.column).setValue(newValue);
                rowChanges.push(`${fieldName}: "${currentValue}" → "${newValue}"` );
                rowUpdated++;
                console.log(`[Update] Wrote ${fieldName}` );
              } else {
                console.log(`[Update] Skip ${fieldName} - no change` );
              }
            } else {
              console.log(`[Update] Skip ${fieldName} - empty new value` );
            }
          });


          if (rowUpdated > 0) {
            totalUpdated += rowUpdated;
            allUpdates.push(`Row ${rowInfo.rowIndex}: ${rowChanges.join(', ')}` );
          }
        });


        return jsonResponse({
          success: true,
          message: `Updated ${totalUpdated} fields across ${matchingRows.length} rows`,
          debug: {
            sheetName,
            identifier: poNo,
            matchingRows: matchingRows.length,
            totalFieldsUpdated: totalUpdated,
            changes: allUpdates
          }
        });
      }


      // ===== FILE UPLOAD =====
      if (action === 'uploadFile') {
        console.log('Starting uploadFile action');


        const fileName = params.fileName;
        const base64Data = params.base64Data;
        const mimeType = params.mimeType;
        const folderId = params.folderId || DEFAULT_FOLDER_ID;


        if (!base64Data || !fileName || !mimeType || !folderId) {
          return jsonResponse({
            success: false,
            error: 'Missing required parameters for file upload',
            diagnostics: {
              hasBase64Data: !!base64Data,
              hasFileName: !!fileName,
              hasMimeType: !!mimeType,
              hasFolderId: !!folderId,
            }
          }, 400);
        }


        const fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
        if (!fileUrl) throw new Error('Failed to upload file to Drive');


        return jsonResponse({ success: true, fileUrl, fileName });
      }


      // ===== SEND EMAIL =====
      if (action === 'sendEmail') {
        console.log('Starting email send action');


        const to = params.to;
        const subject = params.subject;
        const body = params.body;


        if (!to || !subject || !body) {
          throw new Error('Missing required parameters for email');
        }


        GmailApp.sendEmail(to, subject, body);
        return jsonResponse({ success: true, message: 'Email sent successfully', to, subject });
      }


      throw new Error('Unknown action: ' + action);


    } finally {
      lock.releaseLock();
    }


  } catch (error) {
    console.error('POST ERROR:', error);
    return jsonResponse({
      success: false,
      error: String(error),
      message: 'Failed to process request'
    }, 500);
  }
}


// ========== File Upload Helper ==========


function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }


    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);


    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);


    const fileUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    console.log('File uploaded successfully:', fileUrl);
    return fileUrl;


  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}