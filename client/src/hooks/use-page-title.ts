import { useEffect } from "react";

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | BaxPro`;
    } else {
      document.title = "BaxPro | Track Trade Borrow";
    }
    return () => {
      document.title = "BaxPro | Track Trade Borrow";
    };
  }, [pageTitle]);
}
