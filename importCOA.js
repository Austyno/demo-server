require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const ChartOfAccount = require('./models/ChartOfAccount');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/payment-demo';

async function importCOA() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const filePath = path.join(__dirname, '../client/src/assets/Chart of Account Listing1.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'Sheet1';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      console.error('Sheet1 not found');
      process.exit(1);
    }

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const accounts = [];

    // Skip header rows, look for rows with code in index 3
    for (const row of data) {
      const rawName = row[2];
      const code = row[3];

      if (rawName && code && typeof code === 'string' && code.trim() !== '') {
        // Example rawName: "7000000 · Administration espenses:7010010 · Administrative fee"
        let name = rawName;
        let parentCode = null;
        let isSub = false;

        if (rawName.includes(':')) {
          isSub = true;
          const parts = rawName.split(':');
          const lastPart = parts[parts.length - 1];
          const parentPart = parts[0];

          // Extract clean name from "7010010 · Administrative fee"
          name = lastPart.includes('·') ? lastPart.split('·')[1].trim() : lastPart.trim();
          
          // Extract parent code from "7000000 · Administration espenses"
          parentCode = parentPart.includes('·') ? parentPart.split('·')[0].trim() : null;
        } else {
          // Top level: "4010000 · Grant income"
          name = rawName.includes('·') ? rawName.split('·')[1].trim() : rawName.trim();
        }

        accounts.push({
          code: code.trim(),
          name: name,
          full_name: rawName.trim(), // keeping full name for better search
          isSub: isSub,
          parentCode: parentCode
        });
      }
    }

    if (accounts.length === 0) {
      console.log('No accounts found to import.');
      process.exit(0);
    }

    console.log(`Found ${accounts.length} accounts. Clearing existing data...`);
    await ChartOfAccount.deleteMany({});
    
    console.log('Inserting accounts...');
    await ChartOfAccount.insertMany(accounts);

    console.log('Import successful!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing COA:', error);
    process.exit(1);
  }
}

importCOA();
