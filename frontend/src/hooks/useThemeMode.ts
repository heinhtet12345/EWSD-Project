import { useEffect, useState } from "react";

const readTheme = () => {
  if (typeof document === "undefined") {
    return false;
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (rootTheme === "dark") return true;
  if (rootTheme === "light") return false;

  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
};

export default function useThemeMode() {
  const [isDarkMode, setIsDarkMode] = useState(readTheme);

  useEffect(() => {
    const updateTheme = () => setIsDarkMode(readTheme());

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", updateTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  return isDarkMode;
}
