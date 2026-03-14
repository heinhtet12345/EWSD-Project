from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Comment, Vote, Report
from .serializers import CommentSerializer, VoteSerializer, ReportSerializer
from api.IdeaPost.models import Idea
from api.views.admin_views import _normalized_role

class CommentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, idea_id):
        comments = Comment.objects.filter(idea_id=idea_id).select_related("user").order_by("cmt_datetime")
        serializer = CommentSerializer(comments, many=True)
        return Response(
            {
                "results": serializer.data,
                "comment_count": comments.count(),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, idea_id):
        if not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"error": "Your account is disabled. You cannot comment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Ensure the idea exists before commenting
        try:
            idea = Idea.objects.get(pk=idea_id)
        except Idea.DoesNotExist:
            return Response({"error": "Idea not found"}, status=status.HTTP_404_NOT_FOUND)
        if not getattr(idea.closurePeriod, "is_comment_open", True):
            return Response(
                {"error": "Commenting is closed for this closure period."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, idea=idea)
            comment_count = Comment.objects.filter(idea_id=idea_id).count()
            return Response(
                {"comment": serializer.data, "comment_count": comment_count},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VoteToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, idea_id):
        if not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"error": "Your account is disabled. You cannot vote."},
                status=status.HTTP_403_FORBIDDEN,
            )
        idea = Idea.objects.filter(pk=idea_id).select_related("closurePeriod").first()
        if not idea:
            return Response({"error": "Idea not found"}, status=status.HTTP_404_NOT_FOUND)
        if not getattr(idea.closurePeriod, "is_comment_open", True):
            return Response(
                {"error": "Voting is closed for this closure period."},
                status=status.HTTP_403_FORBIDDEN,
            )
        vote_type = request.data.get('vote_type') # 'UP' or 'DOWN'
        if vote_type not in ['UP', 'DOWN']:
            return Response({"error": "Invalid vote type"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if vote already exists for this (user, idea)
        vote_queryset = Vote.objects.filter(user=request.user, idea_id=idea_id)
        current_vote = None
        if vote_queryset.exists():
            existing_vote = vote_queryset.first()
            if existing_vote.vote_type == vote_type:
                # Same vote again? Delete it (Toggle off)
                existing_vote.delete()
                current_vote = None
            else:
                # Different vote? Update it
                existing_vote.vote_type = vote_type
                existing_vote.save()
                current_vote = vote_type
        else:
        # New vote
            Vote.objects.create(user=request.user, idea_id=idea_id, vote_type=vote_type)
            current_vote = vote_type

        upvotes = Vote.objects.filter(idea_id=idea_id, vote_type="UP").count()
        downvotes = Vote.objects.filter(idea_id=idea_id, vote_type="DOWN").count()
        return Response(
            {
                "message": "Vote updated" if current_vote else "Vote removed",
                "upvote_count": upvotes,
                "downvote_count": downvotes,
                "user_vote": current_vote,
            },
            status=status.HTTP_200_OK,
        )


class ReportListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _normalized_role(request.user)
        if role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        reports = Report.objects.select_related("reporter", "idea").order_by("-created_at")
        serializer = ReportSerializer(reports, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)
