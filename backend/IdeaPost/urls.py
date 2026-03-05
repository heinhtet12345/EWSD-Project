from django.urls import path
from .views import PostIdeaView

urlpatterns = [
    path('post/', PostIdeaView.as_view(), name='post_idea'),
]