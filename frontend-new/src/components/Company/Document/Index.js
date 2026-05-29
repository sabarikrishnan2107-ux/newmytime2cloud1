import React, { useEffect, useState } from 'react';
import {
  Plus, FileType, Image as ImageIcon, Trash2, Eye, Printer,
} from 'lucide-react';
import DocumentUploadModal from './DocumentModal';
import { deleteDocument, getDocuments } from '@/lib/api';

const buildFileUrl = (attachment) => {
  if (!attachment) return "";
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";
  return `${baseUrl}/documents/0/${attachment}`;
};

const onView = (doc) => {
  const url = buildFileUrl(doc.attachment);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};

const onPrint = (doc) => {
  const url = buildFileUrl(doc.attachment);
  if (!url) return;
  const win = window.open("", "_blank");
  if (!win) return;
  const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(doc.attachment);
  const title = (doc.title || "Document").replace(/[<>"]/g, "");
  if (isImage) {
    win.document.write(
      `<html><head><title>${title}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%;max-height:100vh;object-fit:contain}@media print{body{display:block}img{max-width:100%;max-height:none}}</style></head><body><img src="${url}" onload="setTimeout(function(){window.focus();window.print();},100)" /></body></html>`
    );
    win.document.close();
  } else {
    win.location.href = url;
    win.addEventListener("load", () => { try { win.focus(); win.print(); } catch (_) {} });
  }
};

const EmployeeDocuments = ({ employee_id = 0 }) => {

  const [documents, setDocuments] = useState([]);

  const fetchDocuments = async (employee_id) => {
    setDocuments(await getDocuments(employee_id));
  }

  useEffect(() => {
    fetchDocuments(employee_id);
  }, [employee_id]);


  const onDelete = async (id) => {
    try {
      await deleteDocument(id);
      fetchDocuments(employee_id);
    } catch (err) {
    } finally {
    }
  };

  // const documents = [
  //   { id: 1, name: 'passport_scan_front.pdf', size: '1.2 MB', category: 'ID / Passport', uploadDate: 'Oct 24, 2023', issueDate: 'Jan 10, 2020', expiryDate: 'Jan 10, 2030', type: 'pdf' },
  //   { id: 2, name: 'visa_copy.png', size: '845 KB', category: 'Visa', uploadDate: 'Oct 26, 2023', issueDate: 'Feb 15, 2023', expiryDate: 'Feb 14, 2025', type: 'image' },
  //   { id: 3, name: 'degree_cert.pdf', size: '2.4 MB', category: 'Education', uploadDate: 'Oct 28, 2023', issueDate: 'May 20, 2018', expiryDate: 'N/A', type: 'pdf' },
  // ];

  return (
    <>
      <main className="flex-1 flex flex-col overflow-hidden  relative">
        <div className="md:col-span-8 lg:col-span-9">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uploaded Documents</h3>
            <DocumentUploadModal employee_id={employee_id} onSuccess={(e) => fetchDocuments(e)} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <TableHead label="Document Name" />
                  <TableHead label="Upload Date" />
                  <TableHead label="Issue Date" />
                  <TableHead label="Expiry Date" />
                  <TableHead label="Actions" align="right" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded ${doc.type === 'pdf' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {doc.type === 'pdf' ? <FileType size={20} /> : <ImageIcon size={20} />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{doc.attachment}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{doc.created_at}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{doc.issue_date_display}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.expiryDate === 'N/A' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">N/A</span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-300">{doc.expiry_date_display}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="inline-flex items-center gap-3">
                        <button onClick={() => onView(doc)} title="View" className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => onPrint(doc)} title="Print" className="text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition">
                          <Printer size={18} />
                        </button>
                        <button onClick={() => onDelete(doc.id)} title="Delete" className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
};

const TableHead = ({ label, align = 'left' }) => (
  <th className={`px-6 py-3 text-${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
    {label}
  </th>
);

export default EmployeeDocuments;