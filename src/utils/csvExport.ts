import { Transaction } from '../types';

/**
 * Utility to convert transactions lists into a valid downloadable CSV string
 */
export function exportTransactionsToCSV(transactions: Transaction[]) {
  if (transactions.length === 0) {
    alert("No transactions log available to export!");
    return;
  }

  // Define headers matching our entity schemas
  const headers = ['ID', 'Type', 'Category', 'Amount', 'Date', 'Notes'];
  
  // Format rows
  const rows = transactions.map(t => [
    t.id,
    t.type.toUpperCase(),
    // Escape quotes/commas for CSV compliance
    `"${t.category.replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.date,
    t.notes ? `"${t.notes.replace(/"/g, '""')}"` : ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  // Create a blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().substring(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `financial_transactions_export_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportFullLedgerToCSV(
  transactions: Transaction[],
  holdings: any[],
  sips: any[],
  fds: any[]
) {
  let csvContent = "INVESTMANT FULL LEDGER EXPORT\n\n";

  // 1. Transactions
  csvContent += "=== TRANSACTIONS ===\n";
  csvContent += "ID,Type,Category,Amount,Date,Notes\n";
  transactions.forEach(t => {
    csvContent += `${t.id},${t.type},"${t.category.replace(/"/g, '""')}",${t.amount},${t.date},"${t.notes?.replace(/"/g, '""') || ''}"\n`;
  });

  // 2. Holdings
  csvContent += "\n=== CURRENT STOCK & MF HOLDINGS ===\n";
  csvContent += "Symbol/Code,Type,Quantity,Buy Price,Buy Date\n";
  holdings.forEach(h => {
    csvContent += `"${h.symbol || h.schemeCode}",${h.type},${h.quantity},${h.buyPrice},${h.buyDate}\n`;
  });

  // 3. SIPs
  csvContent += "\n=== ACTIVE SIPs ===\n";
  csvContent += "Name,Amount,Day of Month\n";
  sips.forEach(s => {
    csvContent += `"${s.name.replace(/"/g, '""')}",${s.amount},${s.dayOfMonth}\n`;
  });

  // 4. FDs
  csvContent += "\n=== ACTIVE FIXED DEPOSITS ===\n";
  csvContent += "Bank,Principal,Interest Rate,Maturity Date\n";
  fds.forEach(f => {
    csvContent += `"${f.bankName}",${f.principalAmount},${f.interestRate}%,${f.maturityDate}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().substring(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `investmant_full_ledger_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
