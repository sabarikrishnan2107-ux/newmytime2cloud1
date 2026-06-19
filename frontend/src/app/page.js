"use client"

import AdminDashboard from "@/components/Dashboard/Dashboard";
import { useAuth } from "@/context/AuthContext";

const App = () => {

  const { user, loading } = useAuth();

  if (loading) return;

  // Users who reach "/" are always admin/manager (employees redirect to /staff/dashboard at login)
  return (
    <div className="p-5 bg-gray-200 dark:bg-slate-900">
      <AdminDashboard />
    </div>
  );

};

export default App;

