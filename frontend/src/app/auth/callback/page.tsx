import { Suspense } from "react";
import { AuthCallback } from "./auth-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
