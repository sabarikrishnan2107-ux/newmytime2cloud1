// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, ExternalLink, Lock, File } from "lucide-react";
import { getCompanyDocuments, getCompanyId, uploadCompanyDocument } from "@/lib/api";
import { SuccessDialog } from "../SuccessDialog";

const CompanyDocument = ({ companyId = 43 }) => {
  const [documentsPopup, setDocumentsPopup] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [documentItems, setDocumentItems] = useState([
    { title: "", file: null },
  ]);
  const [documentList, setDocumentList] = useState([]);

  // ---- fetch list on mount / companyId change ----
  useEffect(() => {
    if (!companyId) return;
    getInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const getInfo = async () => {
    try {
      setLoading(true);

      let result = await getCompanyDocuments() || [];

      console.log(result);


      setDocumentList(result);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // simple permission placeholder (since Vue version returned true)
  const can = (_perm) => true;

  const openDocumentPopup = () => {
    setDocumentsPopup(true);
  };

  const closeDocumentPopup = () => {
    setDocumentsPopup(false);
    setErrors({});
    setDocumentItems([{ title: "", file: null }]);
  };

  const addDocumentInfo = () => {
    setDocumentItems((prev) => [...prev, { title: "", file: null }]);
  };

  const removeItem = (index) => {
    setDocumentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTitleChange = (index, value) => {
    setDocumentItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, title: value } : item
      )
    );
  };

  const handleFileChange = (index, file) => {
    setDocumentItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, file } : item
      )
    );
  };

  const saveDocumentInfo = async () => {
    if (!documentItems.length) return;

    setLoading(true);
    setErrors({});

    const payload = new FormData();

    documentItems.forEach((item) => {
      console.log(item);
      payload.append("items[][key]", item.title || "");
      payload.append("items[][value]", item.file || new Blob());
    });

    let company_id = await getCompanyId();

    console.log(company_id);

    payload.append(`company_id`, company_id);


    try {

      let data = await uploadCompanyDocument(payload);

      console.log(data);


      if (!data.status) {
        // backend sends {status:false, errors:{...}}
        setErrors(data.errors || {});
      } else {
        setErrors({});
        setResponse(data.message || "Documents uploaded successfully.");
        setSnackbarOpen(true);
        await getInfo();
        setDocumentItems([{ title: "", file: null }]);
        closeDocumentPopup();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id) => {
    const ok = window.confirm(
      "Are you sure you wish to delete this document? This action cannot be undone."
    );
    if (!ok) return;

    try {
      setLoading(true);
      const { data } = await axios.delete(`/document/${id}`);
      if (!data.status) {
        setErrors(data.errors || {});
      } else {
        setErrors({});
        setResponse(data.message || "Document deleted successfully.");
        setSnackbarOpen(true);
        await getInfo();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">

      <SuccessDialog
        open={snackbarOpen}
        onOpenChange={setSnackbarOpen}
        title={response}
        description={response}
      />

      {/* Add Document button + table */}
      <div className="flex justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <File className="mr-3 h-6 w-6 text-primary" />
          Document Information
        </h2>
        {can("document_create") && (
          <Button
            size="sm"
            className="bg-primary text-white"
            onClick={openDocumentPopup}
          >
            Add Document +
          </Button>
        )}
      </div>

      {can("document_view") && (
        <div className="overflow-hidden rounded-lg bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full  border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                <th className="border border-slate-200 dark:border-slate-700 px-3 py-2">
                  Title
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-3 py-2">
                  File
                </th>
                <th className="border border-slate-200 dark:border-slate-700 px-3 py-2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {documentList.map((d, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-950/40"}
                >
                  <td className="border border-slate-200 dark:border-slate-800 px-3 py-2">
                    {d.key}
                  </td>
                  <td className="border border-slate-200 dark:border-slate-800 px-3 py-2">
                    <a
                      href={d.value}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="ml-1 h-5 w-5" />
                    </a>
                  </td>
                  <td className="border border-slate-200 dark:border-slate-800 px-3 py-2">
                    {can("document_delete") && (
                      <button
                        type="button"
                        onClick={() => deleteDocument(d.id)}
                        className="inline-flex items-center justify-center rounded-full p-1 hover:bg-gray-500 dark:hover:bg-gray-900/30"
                      >
                        <Trash2 className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {documentList.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-sm text-slate-500"
                  >
                    0 documents are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog for Upload Document */}
      <Dialog open={documentsPopup} onOpenChange={setDocumentsPopup}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {documentItems.map((d, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
              >
                {/* Title */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium mb-1">
                    Title <span className="text-gray-500">*</span>
                  </label>
                  <Input
                    value={d.title}
                    onChange={(e) =>
                      handleTitleChange(index, e.target.value)
                    }
                    className="text-sm"
                  />
                  {errors?.title && (
                    <p className="mt-1 text-xs text-gray-500">
                      {errors.title[0]}
                    </p>
                  )}
                </div>

                {/* File */}
                <div className="md:col-span-6">
                  <label className="block text-xs font-medium mb-1">
                    File <span className="text-gray-500">*</span>
                  </label>
                  <Input
                    type="file"
                    onChange={(e) =>
                      handleFileChange(
                        index,
                        e.target.files?.[0] || null
                      )
                    }
                    className="text-sm"
                  />
                  {errors?.value && (
                    <p className="mt-1 text-xs text-gray-500">
                      {errors.value[0]}
                    </p>
                  )}
                  {d.file && (
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      Selected: {d.file.name}
                    </p>
                  )}
                </div>

                {/* Add / Remove */}
                <div
                  className="
    md:col-span-2
    flex
    items-end
    justify-end
    mt-6
  "
                >
                  {documentItems.length - 1 === index ? (
                    <button
                      type="button"
                      onClick={addDocumentInfo}
                      className="inline-flex items-center text-primary hover:text-primary/80"
                      aria-label="Add document row"
                    >
                      <PlusCircle className="h-6 w-6" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center text-gray-600 hover:text-gray-700"
                      aria-label="Remove document row"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={closeDocumentPopup}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-white"
              disabled={!documentItems.length || loading}
              onClick={saveDocumentInfo}
            >
              {loading ? "Saving..." : "Save and Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDocument;
