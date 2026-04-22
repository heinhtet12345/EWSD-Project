import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

type AnnouncementHighlight = {
  a_id: number;
  a_title: string;
  a_content: string;
  posted_by_name?: string;
};

export type DashboardAnnouncementItem = {
  id: string | number;
  title: string;
  description: string;
  path?: string;
  badge?: string;
  meta?: string;
  ctaLabel?: string;
};

type ActiveClosureSummary = {
  academic_year: string | null;
  idea_closure_date: string | null;
  comment_closure_date: string | null;
  is_idea_open?: boolean;
  is_comment_open?: boolean;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateOnly = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatLongDate = (value?: string | null) => {
  const date = toDateOnly(value);
  if (!date) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getDaysRemaining = (value?: string | null) => {
  const date = toDateOnly(value);
  if (!date) return null;
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((date.getTime() - todayOnly.getTime()) / MS_PER_DAY);
};

const buildDeadlineNotice = (
  id: string,
  label: "Idea Submission" | "Commenting",
  dateValue: string | null,
  isOpen?: boolean,
  path?: string,
): DashboardAnnouncementItem | null => {
  const daysRemaining = getDaysRemaining(dateValue);
  if (!dateValue || daysRemaining === null) return null;

  const formattedDate = formatLongDate(dateValue);

  if (isOpen === false || daysRemaining < 0) {
    return {
      id,
      title: `${label} Has Closed`,
      description: `${label} ended on ${formattedDate}.`,
      badge: "Closure Update",
      meta: "Deadline passed",
      ctaLabel: "View details",
      path,
    };
  }

  if (daysRemaining === 0) {
    return {
      id,
      title: `${label} Closes Today`,
      description: `${label} closes today, ${formattedDate}.`,
      badge: "Deadline Alert",
      meta: "Last day",
      ctaLabel: "View details",
      path,
    };
  }

  if (daysRemaining <= 3) {
    return {
      id,
      title: `${label} Is Ending Soon`,
      description: `${label} closes in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} on ${formattedDate}.`,
      badge: "Deadline Alert",
      meta: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
      ctaLabel: "View details",
      path,
    };
  }

  return {
    id,
    title: `${label} Is Open`,
    description: `${label} is open until ${formattedDate}.`,
    badge: "Closure Update",
    meta: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
    ctaLabel: "View details",
    path,
  };
};

export default function useAnnouncementHighlights(activeClosure?: ActiveClosureSummary | null) {
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
    const roleSegment = location.pathname.split("/").filter(Boolean)[0] || "staff";
    const announcementPath = `/${roleSegment}/announcements`;
    const closurePath =
      roleSegment === "admin" || roleSegment === "qa_manager"
        ? `/${roleSegment}/closure-period`
        : `/${roleSegment}/all-ideas`;

    const announcementItems = items.map((item) => ({
      id: item.a_id,
      title: item.a_title,
      description: item.a_content,
      path: announcementPath,
      badge: "Announcement",
      meta: item.posted_by_name ? `Posted by ${item.posted_by_name}` : undefined,
      ctaLabel: "View announcement",
    }));

    const closureItems: DashboardAnnouncementItem[] = [];
    if (activeClosure?.academic_year) {
      closureItems.push({
        id: `closure-period-${activeClosure.academic_year}`,
        title: `Closure Period Active: ${activeClosure.academic_year}`,
        description: `The current closure period for ${activeClosure.academic_year} is now active.`,
        badge: "Closure Update",
        meta: "Current period",
        ctaLabel: "View period",
        path: closurePath,
      });

      const ideaNotice = buildDeadlineNotice(
        `idea-deadline-${activeClosure.academic_year}`,
        "Idea Submission",
        activeClosure.idea_closure_date,
        activeClosure.is_idea_open,
        closurePath,
      );
      const commentNotice = buildDeadlineNotice(
        `comment-deadline-${activeClosure.academic_year}`,
        "Commenting",
        activeClosure.comment_closure_date,
        activeClosure.is_comment_open,
        closurePath,
      );

      if (ideaNotice) {
        closureItems.push(ideaNotice);
      }
      if (commentNotice) {
        closureItems.push(commentNotice);
      }
    } else {
      closureItems.push({
        id: "closure-period-none",
        title: "No Active Closure Period Right Now",
        description: "There is currently no active closure period. Watch for the next period update.",
        badge: "Closure Update",
        meta: "No active period",
        ctaLabel: "View details",
        path: closurePath,
      });
    }

    return [...announcementItems, ...closureItems];
  }, [activeClosure, items, location.pathname]);
}
