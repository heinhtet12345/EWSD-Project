from django.urls import path

from .views import AnnouncementDetailView, AnnouncementHighlightsView, AnnouncementListCreateView


urlpatterns = [
    path("", AnnouncementListCreateView.as_view(), name="announcement-list-create"),
    path("highlights/", AnnouncementHighlightsView.as_view(), name="announcement-highlights"),
    path("<int:a_id>/", AnnouncementDetailView.as_view(), name="announcement-detail"),
]

