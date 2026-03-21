from django.urls import path
from .views import (
    PostIdeaView,
    ListIdeasView,
    ReportIdeaView,
    IdeaDetailView,
    DownloadAllIdeasDataView,
)

urlpatterns = [
    path('post/', PostIdeaView.as_view(), name='post_idea'),
    path('list/', ListIdeasView.as_view(), name='list_ideas'),
    path('<int:idea_id>/report/', ReportIdeaView.as_view(), name='report_idea'),
    path('idea/<int:idea_id>/', IdeaDetailView.as_view(), name='idea-detail'),
    path('download/all/', DownloadAllIdeasDataView.as_view(), name='download_all_ideas'),
]

