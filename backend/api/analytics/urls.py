from django.urls import path

from .views import AdminActivityLogsView, AdminAnalyticsSummaryView, QAManagerDashboardView, TrackActivityView

urlpatterns = [
    path("track/", TrackActivityView.as_view(), name="track-activity"),
    path("summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
    path("logs/", AdminActivityLogsView.as_view(), name="admin-activity-logs"),
    path("qa-manager-dashboard/", QAManagerDashboardView.as_view(), name="qa-manager-dashboard"),
]
