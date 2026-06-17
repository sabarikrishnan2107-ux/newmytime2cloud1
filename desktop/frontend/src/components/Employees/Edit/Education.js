import React from 'react';
import { Plus, PlusCircle, Edit2, Trash2, Award, Cloud, CheckCircle } from 'lucide-react';
import EducationModal from './EducationModal';

const EmployeeProfileTest = () => {
  return (
    <>
      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold">Educational History</h3>
            <p className="text-sm text-slate-500">Academic degrees and qualifications</p>
          </div>
          <EducationModal />
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Degree/Level</th>
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Institution</th>
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500 hidden sm:table-cell">Major</th>
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Year</th>
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500 hidden md:table-cell">Result</th>
                <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              <EducationRow degree="Master of Business Administration" school="State University" major="Management" year="2020" result="3.9 GPA" />
              <EducationRow degree="Bachelor of Science" school="University of Technology" major="Computer Science" year="2018" result="3.8 GPA" />
              <EducationRow degree="High School Diploma" school="City High School" major="Science" year="2014" result="85%" />
            </tbody>
          </table>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold">Certifications & Skills</h3>
            <p className="text-sm text-slate-500">Professional certifications and licenses</p>
          </div>
          <button className="flex items-center justify-center rounded-lg h-10 px-5 border border-blue-600/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-sm font-bold transition-colors">
            <PlusCircle size={18} className="mr-2" />
            Add Certification
          </button>
        </div>

        <div className="p-6">
          <CertificationTable />
        </div>
      </section></>
  );
};

const EducationRow = ({ degree, school, major, year, result }) => (
  <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
    <td className="px-4 py-4 text-sm font-medium">{degree}</td>
    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{school}</td>
    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">{major}</td>
    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{year}</td>
    <td className="px-4 py-4 hidden md:table-cell">
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        {result}
      </span>
    </td>
    <td className="px-4 py-4 text-right">
      <div className="flex justify-end gap-2">
        <button className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
        <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
      </div>
    </td>
  </tr>
);

const CertificationTable = () => (
  <table className="w-full text-left border-collapse hidden md:table">
    <thead>
      <tr className="border-b border-slate-100 dark:border-slate-800">
        <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500 w-1/3">Certificate</th>
        <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Organization</th>
        <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Expiry</th>
        <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500">Status</th>
        <th className="px-4 py-3 text-xs uppercase font-semibold text-slate-500 text-right">Action</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
      <tr>
        <td className="px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><Award size={18} /></div>
          <div>
            <div className="text-sm font-medium">PMP</div>
            <div className="text-xs text-slate-500">#9482910</div>
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">PMI</td>
        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">12/2025</td>
        <td className="px-4 py-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={10} /> Active
          </span>
        </td>
        <td className="px-4 py-4 text-right">
          <button className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
        </td>
      </tr>
    </tbody>
  </table>
);

export default EmployeeProfileTest;