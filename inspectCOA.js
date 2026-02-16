const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/assets/Chart of Account Listing1.xlsx');
const workbook = XLSX.readFile(filePath);
const name = 'Sheet1';
const worksheet = workbook.Sheets[name];
if (worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`\nFirst 50 rows of sheet "${name}":`);
  const nonEmptyRows = data.filter(row => row.length > 0).slice(0, 50);
  console.log(JSON.stringify(nonEmptyRows, null, 2));
} else {
  console.log('Sheet1 not found. Available sheets:', workbook.SheetNames);
}
