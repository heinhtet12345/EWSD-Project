import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

type AnnouncementHighlight = {
  a_id: number;
  a_title: string;
  a_content: string;
};

type DashboardAnnouncementItem = {
  id: number;
  title: string;
  description: string;
  path: string;
};

export default function useAnnouncementHighlights() {
  const location = useLocation();
  const [items, setItems] = useState<AnnouncementHighlight[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchHighlights = async () => {
      try {
        const response = await axios.get<{ results?: AnnouncementHighlight[] }>("/api/announcement/highlights/");
        if (!isMounted) return;
        setItems(Array.isArray(response.data?.results) ? response.data.results : []);
      } catch {
        if (!isMounted) return;
        setItems([]);
      }
    };

    fetchHighlights();
    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo<DashboardAnnouncementItem[]>(() => {
    const roleRoot = `/${location.pathname.split("/").filter(Boolean)[0] || "staff"}/announcements`;
    return items.map((item) => ({
      id: item.a_id,
      title: item.a_title,
      description: item.a_content,
      path: roleRoot,
    }));
  }, [items, location.pathname]);
}

