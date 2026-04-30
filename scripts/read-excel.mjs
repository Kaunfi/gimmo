import XLSX from 'xlsx';

const wb = XLSX.readFile('docs/cartographie_fiscale_immobiliere_2026.xlsx');

console.log('=== FEUILLES ===');
wb.SheetNames.forEach(name => console.log(' -', name));

for (const sheetName of wb.SheetNames) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FEUILLE: ${sheetName}`);
  console.log('='.repeat(60));
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Print first 80 rows
  data.slice(0, 80).forEach((row, i) => {
    if (row.some(cell => cell !== '')) {
      console.log(`R${i+1}: ${row.map(c => String(c).substring(0, 50)).join(' | ')}`);
    }
  });
  if (data.length > 80) {
    console.log(`... (${data.length - 80} lignes supplémentaires)`);
    // Also print last 20 rows
    data.slice(-20).forEach((row, i) => {
      if (row.some(cell => cell !== '')) {
        console.log(`R${data.length - 20 + i + 1}: ${row.map(c => String(c).substring(0, 50)).join(' | ')}`);
      }
    });
  }
}
