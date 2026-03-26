from django.urls import path

from .views import (
    AdminActivityLogsView,
    AdminAnalyticsSummaryView,
    AdminSystemDashboardView,
    QACoordinatorDashboardView,
    QAManagerDashboardView,
    StaffDashboardView,
    TrackActivityView,
)

urlpatterns = [
    path("track/", TrackActivityView.as_view(), name="track-activity"),
    path("summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
    path("admin-dashboard/", AdminSystemDashboardView.as_view(), name="admin-system-dashboard"),
    path("logs/", AdminActivityLogsView.as_view(), name="admin-activity-logs"),
    path("qa-manager-dashboard/", QAManagerDashboardView.as_view(), name="qa-manager-dashboard"),
    path("qa-coordinator-dashboard/", QACoordinatorDashboardView.as_view(), name="qa-coordinator-dashboard"),
    path("staff-dashboard/", StaffDashboardView.as_view(), name="staff-dashboard"),
]
