import { ReactNode } from "react";

// Supplier setup is now auto-provisioned via database trigger
// This component is kept for backward compatibility but always renders children
interface SupplierSetupGuardProps {
  children: ReactNode;
}

export function SupplierSetupGuard({ children }: SupplierSetupGuardProps) {
  return <>{children}</>;
}
