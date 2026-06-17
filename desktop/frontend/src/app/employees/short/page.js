import { Suspense } from "react";
import EmployeeShortListClient from "./employee-short-list-client";

export default function EmployeeShortListPage() {
  return (
    <Suspense fallback={null}>
      <EmployeeShortListClient />
    </Suspense>
  );
}
