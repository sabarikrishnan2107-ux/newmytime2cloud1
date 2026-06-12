import { Suspense } from "react";
import EmployeeEditClient from "./employee-edit-client";

export default function EmployeeEditPage() {
  return (
    <Suspense fallback={null}>
      <EmployeeEditClient />
    </Suspense>
  );
}
