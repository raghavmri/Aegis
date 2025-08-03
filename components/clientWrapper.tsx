"use client";

import { useEffect } from "react";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      import("../utils/registerServiceWorker").then(
        ({ registerServiceWorker }) => {
          registerServiceWorker();
        }
      );
    }
  }, []);

  return <>{children}</>;
}
