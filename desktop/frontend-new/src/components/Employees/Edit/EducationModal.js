import React, { useState } from 'react';
import { X, ChevronDown, Calendar, UploadCloud, Check } from 'lucide-react';

const EducationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    degree: '',
    institution: '',
    major: '',
    year: '',
    gpa: '',
    university: ''
  });

  const toggleModal = () => setIsOpen(!isOpen);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Data Submitted:", formData);
    setIsOpen(false);
  };

  return (
    <div className="p-8 flex justify-center">
      {/* Trigger Button - Kept inside the component */}
      <button
        onClick={toggleModal}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
      >
        + Add Education Record
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          
          {/* Modal Container */}
          <div className="relative w-full max-w-[840px] max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
                Add Education
              </h3>
              <button
                onClick={toggleModal}
                className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
              <form id="education-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  
                  {/* Field 1: Degree/Level */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Degree/Level</label>
                    <div className="relative">
                      <select 
                        className="w-full h-12 px-4 pr-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer outline-none transition-all"
                        value={formData.degree}
                        onChange={(e) => setFormData({...formData, degree: e.target.value})}
                      >
                        <option value="" disabled>Select Degree</option>
                        <option value="phd">PhD</option>
                        <option value="masters">Master's Degree</option>
                        <option value="bachelors">Bachelor's Degree</option>
                        <option value="diploma">Diploma</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500" size={20} />
                    </div>
                  </div>

                  {/* Field 2: Institution Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Institution Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Field 3: Major */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Major/Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Field 4: Year */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Year of Passing</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="YYYY"
                        className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} />
                    </div>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="mt-2">
                  <label className="text-slate-900 dark:text-slate-200 text-sm font-semibold mb-2 block">
                    Upload Marksheet/Certificate
                  </label>
                  <div className="group relative flex flex-col md:flex-row items-center gap-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 px-6 py-4 transition-all cursor-pointer">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <UploadCloud size={20} />
                    </div>
                    <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left">
                      <p className="text-slate-900 dark:text-white text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-slate-500 text-xs mt-1">PDF, JPG or PNG (max. 5MB)</p>
                    </div>
                    <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
                      Browse
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <button
                onClick={toggleModal}
                className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="education-form"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Check size={18} />
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationModal;