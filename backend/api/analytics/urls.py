from django.urls import path

from .views import AdminActivityLogsView, AdminAnalyticsSummaryView, TrackActivityView

urlpatterns = [
    path("track/", TrackActivityView.as_view(), name="track-activity"),
    path("summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
    path("logs/", AdminActivityLogsView.as_view(), name="admin-activity-logs"),
]
