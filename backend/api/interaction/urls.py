from django.urls import path
from .views import CommentCreateView, VoteToggleView

urlpatterns = [
    path('idea/<int:idea_id>/comment/', CommentCreateView.as_view(), name='comment-create'),
    path('idea/<int:idea_id>/vote/', VoteToggleView.as_view(), name='vote-toggle'),
]