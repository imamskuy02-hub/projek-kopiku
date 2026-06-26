import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default function LoginLayout({ children }) {
  const headersList = headers();
  const userAgent = headersList.get("user-agent") || "";

  // Only allow access if the User-Agent contains our custom app signature
  if (!userAgent.includes("KopikuAdminApp")) {
    notFound();
  }

  return <>{children}</>;
}
