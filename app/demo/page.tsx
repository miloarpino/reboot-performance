import { notFound } from "next/navigation";
import RebootPerformanceApp from "../reboot-performance-app";

export default function DemoPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_MODE !== "true") {
    notFound();
  }

  return <RebootPerformanceApp />;
}
