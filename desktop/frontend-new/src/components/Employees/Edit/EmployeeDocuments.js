import React, { useState } from 'react';
import {
  Plus, FileType, Image as ImageIcon, Trash2,
} from 'lucide-react';

const EmployeeDocuments = () => {
  const documents = [
    { id: 1, name: 'passport_scan_front.pdf', size: '1.2 MB', category: 'ID / Passport', uploadDate: 'Oct 24, 2023', issueDate: 'Jan 10, 2020', expiryDate: 'Jan 10, 2030', type: 'pdf' },
    { id: 2, name: 'visa_copy.png', size: '845 KB', category: 'Visa', uploadDate: 'Oct 26, 2023', issueDate: 'Feb 15, 2023', expiryDate: 'Feb 14, 2025', type: 'image' },
    { id: 3, name: 'degree_cert.pdf', size: '2.4 MB', category: 'Education', uploadDate: 'Oct 28, 2023', issueDate: 'May 20, 2018', expiryDate: 'N/A', type: 'pdf' },
  ];

  return (
    <>
      <main className="flex-1 flex flex-col overflow-hidden  relative">
        <div className="md:col-span-8 lg:col-span-9">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Uploaded Documents</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus size={18} />
              <span>Add New Document</span>
            </button>
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
                  <DocumentRow key={doc.id} doc={doc} />
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

const DocumentRow = ({ doc }) => (
  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded ${doc.type === 'pdf' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
          {doc.type === 'pdf' ? <FileType size={20} /> : <ImageIcon size={20} />}
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{doc.size} • {doc.category}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{doc.uploadDate}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{doc.issueDate}</td>
    <td className="px-6 py-4 whitespace-nowrap">
      {doc.expiryDate === 'N/A' ? (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">N/A</span>
      ) : (
        <span className="text-sm text-gray-500 dark:text-gray-300">{doc.expiryDate}</span>
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <button className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition">
        <Trash2 size={18} />
      </button>
    </td>
  </tr>
);

export default EmployeeDocuments;