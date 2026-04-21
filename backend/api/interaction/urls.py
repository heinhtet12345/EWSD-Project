from django.urls import path
from .views import CommentDetailView, CommentListCreateView, VoteToggleView, ReportCommentView, ReportListView

urlpatterns = [
    path('idea/<int:idea_id>/comment/', CommentListCreateView.as_view(), name='comment-create'),
    path('idea/<int:idea_id>/comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('comment/<int:comment_id>/', CommentDetailView.as_view(), name='comment-detail'),
    path('idea/<int:idea_id>/vote/', VoteToggleView.as_view(), name='vote-toggle'),
    path('comment/<int:comment_id>/report/', ReportCommentView.as_view(), name='comment-report'),
    path('reports/', ReportListView.as_view(), name='report-list'),
]
