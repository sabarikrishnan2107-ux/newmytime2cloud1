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

import { getBranches, getRoles, updateGroupLogin } from "@/lib/api";
import { parseApiError } from "@/lib/utils";
import MultiDropDown from "../ui/MultiDropDown";

const EditAdminFormDialog = ({
  pageTitle = "item",
  initialData = {},
  onSuccess = () => { },
  controlledOpen,
  controlledSetOpen,
}) => {
  const isControlled = controlledOpen !== undefined;
  const [open, setOpen] = useState(false);
  const actualOpen = isControlled ? controlledOpen : open;
  const actualSetOpen = isControlled ? controlledSetOpen : setOpen;

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email) => {
    if (!email) { setEmailError(""); return true; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setEmailError(valid ? "" : "Invalid email format");
    return valid;
  };

  const [form, setForm] = useState(initialData);

  const fetchDepartments = async () => {
    try {
      setDepartments(await getDepartments(form.branch_id));


      // if editing, keep the selected department_ids
      if (initialData.department_ids) {
        const validIds = data
          .filter((d) => initialData.department_ids.includes(d.id))
          .map((d) => d.id);

        handleChange("department_ids", validIds);
      }
    } catch (error) {
      setGlobalError(parseApiError(error));
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [form.branch_id]);

  useEffect(() => {
    if (actualOpen) {
      fetchBranches();
      fetchRoles();
      setForm(initialData);
    }
  }, [actualOpen, initialData]);

  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const fetchRoles = async () => {
    try {
      const result = await getRoles();
      setRoles(result.data || []);
    } catch (error) {
      setError(parseApiError(error));
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async () => {
    if (form.email && !validateEmail(form.email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await updateAdmin(initialData.id, form);
      onSuccess({ title: `${pageTitle} Saved`, description: `${pageTitle} Saved successfully` }); actualSetOpen(false);
    } catch (error) {
      setError(parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={actualOpen} onOpenChange={actualSetOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Admin</DialogTitle>
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
            <label className="block text-xs font-medium mb-1">Departments</label>
            <MultiDropDown
              placeholder={'Select Department'}
              items={departments}
              value={form.department_ids}
              onChange={(val) => handleChange("department_ids", val)}
              badgesCount={1}
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
                Password
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Leave blank to keep same"
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

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => actualSetOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
            className="bg-primary text-white"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAdminFormDialog;
