// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import DropDown from "@/components/ui/DropDown";

import { getBranches, getRoles, createAdmin } from "@/lib/api";
import { parseApiError } from "@/lib/utils";

let defaultPayload = {
  branch_id: "",
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role_id: "",
  order: 0
};

const Create = ({ pageTitle = "Add Item", onSuccess = (e) => { e } }) => {

  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email) => {
    if (!email) { setEmailError(""); return true; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setEmailError(valid ? "" : "Invalid email format");
    return valid;
  };


  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(defaultPayload);

  useEffect(() => {
    if (open) {
      fetchBranches();
      fetchRoles();
      setForm(defaultPayload);
    }
  }, [open]);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  const fetchRoles = async () => {
    try {
      const result = await getRoles();
      setRoles(result.data || []);
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    if (form.email && !validateEmail(form.email)) {
      setGlobalError("Please enter a valid email address");
      return;
    }
    setGlobalError(null);
    setLoading(true);
    try {

      await createAdmin(form);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // inform to parent component
      onSuccess({ title: `${pageTitle} Save`, description: `${pageTitle} Save successfully` });
      setOpen(false);
    } catch (error) {
      setGlobalError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add {pageTitle}</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New {pageTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Branch</label>
              <DropDown
                placeholder="Select Branch"
                onChange={(val) => handleChange("branch_id", val)}
                value={form.branch_id}
                items={branches}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => { handleChange("email", e.target.value); validateEmail(e.target.value); }}
                className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}
              />
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) =>
                    handleChange("password_confirmation", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Role</label>
              <DropDown
                placeholder="Select Role"
                onChange={(val) => handleChange("role_id", val)}
                value={form.role_id}
                items={roles}
              />
            </div>
          </div>

          {globalError && (
            <div className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 rounded-lg" role="alert">
              {globalError}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading}
              className="bg-primary text-white"
            >
              {loading ? "Saving..." : `Create ${pageTitle}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Create;
