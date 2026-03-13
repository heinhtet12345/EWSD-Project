from django.urls import path
from .views import CommentListCreateView, VoteToggleView

urlpatterns = [
    path('idea/<int:idea_id>/comment/', CommentListCreateView.as_view(), name='comment-create'),
    path('idea/<int:idea_id>/comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('idea/<int:idea_id>/vote/', VoteToggleView.as_view(), name='vote-toggle'),
]
