import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportToCSV(data: Record<string, any>[], filename: string, headers?: Record<string, string>) {
  if (data.length === 0) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  const csvContent = [
    headerRow.join(","),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key] ?? "";
        return typeof val === "string" && (val.includes(",") || val.includes('"'))
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(data: Record<string, any>[], filename: string, sheetName = "Dados", headers?: Record<string, string>) {
  if (data.length === 0) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;

  const rows = data.map(row => keys.map(key => row[key] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headerLabels, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, any>[],
  filename: string,
  title: string,
  headers?: Record<string, string>
) {
  if (data.length === 0) return;

  const doc = new jsPDF();
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;

  doc.setFontSize(16);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Exportado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);

  doc.autoTable({
    startY: 36,
    head: [headerLabels],
    body: data.map(row => keys.map(key => String(row[key] ?? "-"))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  doc.save(`${filename}.pdf`);
}

export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, any>[]; headers?: Record<string, string> }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data, headers }) => {
    if (data.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([["Sem dados"]]);
      XLSX.utils.book_append_sheet(wb, ws, name);
      return;
    }
    const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
    const headerLabels = headers ? Object.values(headers) : keys;
    const rows = data.map(row => keys.map(key => row[key] ?? ""));
    const ws = XLSX.utils.aoa_to_sheet([headerLabels, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
