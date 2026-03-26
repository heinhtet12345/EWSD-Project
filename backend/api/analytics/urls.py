from django.urls import path

from .views import AdminActivityLogsView, AdminAnalyticsSummaryView, AnonymousIdeasWithCommentsAPIView, ContributorsByDepartmentAPIView, IdeaCountAPIView, IdeaCountByDepartmentAPIView, IdeaPercentageByDepartmentAPIView, IdeasWithoutCommentsAPIView, LatestIdeaByDepartmentAPIView, PopularIdeaByDepartmentAPIView, TrackActivityView, ActiveUserCountAPIView

urlpatterns = [
    path("track/", TrackActivityView.as_view(), name="track-activity"),
    path("summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
    path("logs/", AdminActivityLogsView.as_view(), name="admin-activity-logs"),
    path('active_users_count/', ActiveUserCountAPIView.as_view()),
    path('ideas_count/', IdeaCountAPIView.as_view()),
    path('ideas_count_by_department/', IdeaCountByDepartmentAPIView.as_view()),
    path('ideas_percentage_by_department/', IdeaPercentageByDepartmentAPIView.as_view()),
    path('ideas_contributors_by_department/', ContributorsByDepartmentAPIView.as_view()),
    path('ideas_anonymous_with_comments/', AnonymousIdeasWithCommentsAPIView.as_view()),
    path('ideas_without_comments/', IdeasWithoutCommentsAPIView.as_view()),
    path('ideas_popular_by_department/', PopularIdeaByDepartmentAPIView.as_view()),
    path('ideas/latest-by-department/', LatestIdeaByDepartmentAPIView.as_view()),
]
