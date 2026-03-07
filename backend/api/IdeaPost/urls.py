from django.urls import path
from .views import PostIdeaView, ListIdeasView

urlpatterns = [
    path('post/', PostIdeaView.as_view(), name='post_idea'),
    path('list/', ListIdeasView.as_view(), name='list_ideas'),
]