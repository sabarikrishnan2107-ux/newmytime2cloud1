import { Suspense } from "react";
import ShiftCreateClient from "./shift-create-client";

export default function ShiftCreatePage() {
    return (
        <Suspense fallback={null}>
            <ShiftCreateClient />
        </Suspense>
    );
}
