const puppeteer = require('puppeteer');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const generateRequestPdf = async (requestData, clerkName) => {
    const browser = await puppeteer.launch({ headless: 'new' }); // Use new headless mode
    const page = await browser.newPage();

    // Construct the HTML content (reuse the VoucherLayout logic or similar)
    const content = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
            .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
            .pv-ref { text-align: right; }
            .title { text-align: center; font-weight: bold; margin-bottom: 2rem; font-size: 18px; }
            .grid { display: grid; grid-template-columns: auto 1fr; gap: 10px; max-width: 600px; margin: 0 auto 2rem auto; }
            .field-label { font-weight: bold; }
            .field-value { border-bottom: 1px dotted #ccc; padding-left: 5px; }
            .amount-box { border: 1px solid #000; padding: 10px; margin-bottom: 2rem; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; border: 1px solid #000; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f3f4f6; text-align: center; font-size: 12px; }
            
            /* Rich text content style */
            .rich-text { margin-bottom: 2rem; padding: 10px; border: 1px solid #eee; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">ISDAO</div>
            <div class="pv-ref">PV ${requestData.beneficiary || 'AVIENTI'}</div>
        </div>

        <div class="title">Bon de paiement // Payment Voucher</div>

        <div class="grid">
            <div class="field-label">Nom de la banque // Bank name:</div>
            <div class="field-value">${requestData.bankName || ''}</div>
            
            <div class="field-label">Numéro de référence // Reference number:</div>
            <div class="field-value">${requestData.referenceNumber || ''}</div>

            <div class="field-label">Numéro de compte // Account number:</div>
            <div class="field-value">${requestData.accountNumber || ''}</div>

            <div class="field-label">Date // Date:</div>
            <div class="field-value">${new Date(requestData.requestDate).toLocaleDateString()}</div>
        </div>

        <div style="margin-bottom: 1rem;">
            <strong>BENEFICAIRE // PAYEE:</strong> <span style="font-weight: bold; font-size: 1.1em;">${requestData.beneficiary || ''}</span>
        </div>

        <div class="amount-box">
            <div><strong>MONTANT EN ${requestData.currency} // AMOUNT IN ${requestData.currency}</strong>: ${Number(requestData.totalAmount || requestData.amount).toLocaleString()}</div>
            <div style="font-style: italic; margin-top: 5px;">${requestData.amountInWords || ''}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Détail du paiement // Particulars of payment</th>
                    <th>Montant (${requestData.currency})</th>
                    <th>Nom du compte // Account name</th>
                    <th>Code source // Source Code</th>
                    <th>Code QuickBooks</th>
                </tr>
            </thead>
            <tbody>
                ${(requestData.items && requestData.items.length > 0) 
                    ? requestData.items.map(item => `
                        <tr>
                            <td>${item.particulars || ''}</td>
                            <td style="text-align: right;">${Number(item.amount || 0).toLocaleString()}</td>
                            <td>${item.accountName || ''}</td>
                            <td>${item.fundingSourceCode || ''}</td>
                            <td>${item.quickBooksCode || ''}</td>
                        </tr>
                    `).join('')
                    : `
                        <tr>
                            <td>
                                <div>${requestData.descriptionFr || ''}</div>
                                <div style="margin-top:5px;">${requestData.descriptionEn || ''}</div>
                            </td>
                            <td style="text-align: right;">${Number(requestData.amount || 0).toLocaleString()}</td>
                            <td>${requestData.accountName || ''}</td>
                            <td>${requestData.fundingSourceCode || ''}</td>
                            <td>${requestData.quickBooksCode || ''}</td>
                        </tr>
                    `
                }
                 <tr>
                    <td style="font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="font-weight: bold; text-align: right;">${Number(requestData.totalAmount || requestData.amount || 0).toLocaleString()}</td>
                    <td colspan="3"></td>
                </tr>
            </tbody>
        </table>

        <!-- Render Rich Text Body -->
        <div class="rich-text">
            <h4>Payment Request Details:</h4>
            ${requestData.paymentRequestBody || ''}
        </div>

    </body>
    </html>
    `;

    await page.setContent(content);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Now post-process with pdf-lib to add form fields
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Add "Prepared By" text
    firstPage.drawText(`Prepared By: ${clerkName}`, {
        x: 50,
        y: 100,
        size: 10
    });
    firstPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: 85,
        size: 10
    });

    // Create Form Fields for Manager
    // Approved By Field
    firstPage.drawText('Approved By:', { x: 300, y: 100, size: 10 });
    const approvedByField = form.createTextField('approvedBy');
    approvedByField.setText(' '); // Empty initially
    approvedByField.addToPage(firstPage, { x: 300, y: 80, width: 150, height: 20 });
    // approvedByField.enableReadOnly(); // Make read-only initially? No, manager needs to fill/sign, actually manager fills it via system action? 
    // Plan says: "Server fills/stamps" on approval. So these can be just placeholders or form fields that we fill programmatically later.
    // Let's keep them as form fields so they "look" like a form.

    // Signature Field (Placeholder)
    firstPage.drawText('Signature:', { x: 470, y: 100, size: 10 });
    const sigField = form.createTextField('signature'); // Using text field for simplicity as signature placeholder
    sigField.setText(' ');
    sigField.addToPage(firstPage, { x: 470, y: 80, width: 100, height: 20 });

    // Mark Prepared By info as embedded text (already done via drawText)

    // Save
    const uploadDir = path.join(__dirname, '../uploads/pdfs');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Use timestamp + random string for unique filename
    const filename = `request_${requestData._id || Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const filePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filePath, await pdfDoc.save());
    
    // Return relative path for DB
    return `uploads/pdfs/${filename}`;
};

const signAndLockPdf = async (relativeFilePath, managerName) => {
    const fullPath = path.join(__dirname, '../', relativeFilePath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error('PDF file not found');
    }

    const pdfBytes = fs.readFileSync(fullPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Get fields
    const approvedByField = form.getTextField('approvedBy');
    const sigField = form.getTextField('signature');

    // Fill fields
    if (approvedByField) approvedByField.setText(managerName);
    
    // Simulating a signature with a creative font or just text for now
    // In a real app we might overlay a signature image
    const font = await pdfDoc.embedFont(StandardFonts.ZapfDingbats); // Or just HelveticaOblique
    const sigFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    if (sigField) {
        sigField.setText(`Signed by ${managerName}`);
        sigField.updateAppearances(sigFont);
    }
    
    // Flatten form to make it read-only
    form.flatten();
    
    // Save updated PDF
    fs.writeFileSync(fullPath, await pdfDoc.save());

    return relativeFilePath;
};

module.exports = {
    generateRequestPdf,
    signAndLockPdf
};
