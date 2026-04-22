from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from django.core.mail import BadHeaderError, send_mail
from django.db import IntegrityError, transaction
from api.models import Notification
from .models import Comment, Vote, Report
from .serializers import CommentSerializer, VoteSerializer, ReportSerializer
from api.IdeaPost.models import Idea
from api.views.admin_views import _normalized_role

User = get_user_model()


def _build_notification_email(*, title, greeting, intro, details, closing_note):
    message = (
        f"{greeting}\n\n"
        f"{intro}\n\n"
        + (
            "Details:\n\n" + "\n".join(f"{label}: {value}" for label, value in details) + "\n\n"
            if details
            else ""
        )
        + f"{closing_note}\n\n"
        "Best regards,\n"
        "RBAC Contribution Platform\n"
        "Group 5 University\n"
        "system@ewsd.edu"
    )
    details_rows = "".join(
        f"""
            <tr>
                <td style="padding:6px 0;font-weight:700;color:#475569;width:180px;">{label}:</td>
                <td style="padding:6px 0;color:#0f172a;">{value}</td>
            </tr>
        """
        for label, value in details
    )
    html_message = f"""
        <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                <div style="background:#0f766e;padding:24px 28px;color:#ffffff;">
                    <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">RBAC Contribution Platform</p>
                    <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">{title}</h1>
                </div>
                <div style="padding:28px;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">{greeting}</p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">{intro}</p>
                    {"<div style='margin:0 0 24px;padding:20px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;'><p style='margin:0 0 12px;font-size:14px;font-weight:700;color:#334155;'>Details</p><table style='width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;'>" + details_rows + "</table></div>" if details else ""}
                    <p style="margin:0;font-size:15px;line-height:1.7;">{closing_note}</p>
                </div>
                <div style="padding:20px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#475569;">
                    <p style="margin:0;font-weight:700;color:#0f172a;">Best regards,</p>
                    <p style="margin:4px 0 0;">RBAC Contribution Platform</p>
                    <p style="margin:0;">Group 5 University</p>
                    <p style="margin:0;">system@ewsd.edu</p>
                </div>
            </div>
        </div>
    """
    return message, html_message


def _manager_recipients():
    return [
        user
        for user in User.objects.select_related("role")
        if _normalized_role(user) == "qa_manager"
    ]


def _notify_managers_about_report(*, target_label, report_reason, reporter_username, idea, target_type):
    notification_title = "Comment reported" if target_type == "comment" else "Idea reported"
    notification_message = (
        f'{target_type.title()} "{target_label}" was reported by {reporter_username}. '
        f"Reason: {report_reason}."
    )

    for recipient in _manager_recipients():
        Notification.objects.create(
            recipient=recipient,
            title=notification_title,
            message=notification_message,
            notification_type=f"{target_type}_reported",
            idea=idea,
        )

        if recipient.email:
            try:
                message_text, html_message = _build_notification_email(
                    title=notification_title,
                    greeting="Dear QA Manager,",
                    intro="A report has been submitted in the university idea management system and requires your review.",
                    details=[
                        ("Reported Item", target_type.title()),
                        ("Item Reference", target_label),
                        ("Reported By", reporter_username),
                        ("Reason", report_reason),
                    ],
                    closing_note="Please review the reported content in the platform and take the appropriate action.",
                )
                send_mail(
                    subject=notification_title,
                    message=message_text,
                    from_email="system@ewsd.edu",
                    recipient_list=[recipient.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except (BadHeaderError, OSError):
                continue


def _notify_idea_author_about_comment(*, idea, commenter, comment):
    idea_author = getattr(idea, "user", None)
    if not idea_author or idea_author.user_id == commenter.user_id:
        return

    display_name = f"{(commenter.first_name or '').strip()} {(commenter.last_name or '').strip()}".strip()
    commenter_label = "Anonymous user" if comment.anonymous_status else (display_name or commenter.username)
    notification_title = "New comment on your idea"
    notification_message = (
        f'{commenter_label} commented on your idea "{idea.idea_title}".'
    )

    Notification.objects.create(
        recipient=idea_author,
        title=notification_title,
        message=notification_message,
        notification_type="idea_commented",
        idea=idea,
    )

    if idea_author.email:
        try:
            message_text, html_message = _build_notification_email(
                title=notification_title,
                greeting="Dear User,",
                intro="A new comment has been added to your submitted idea.",
                details=[
                    ("Idea Title", idea.idea_title),
                    ("Commented By", commenter_label),
                ],
                closing_note="Please log in to the platform to read the comment and continue the discussion.",
            )
            send_mail(
                subject=notification_title,
                message=message_text,
                from_email="system@ewsd.edu",
                recipient_list=[idea_author.email],
                html_message=html_message,
                fail_silently=True,
            )
        except (BadHeaderError, OSError):
            pass


class CommentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, idea_id):
        comments = (
            Comment.objects.filter(idea_id=idea_id, user__active_status=True, idea__user__active_status=True)
            .select_related("user")
            .order_by("cmt_datetime")
        )
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
            comment = serializer.save(user=request.user, idea=idea)
            _notify_idea_author_about_comment(idea=idea, commenter=request.user, comment=comment)
            comment_count = Comment.objects.filter(
                idea_id=idea_id,
                user__active_status=True,
                idea__user__active_status=True,
            ).count()
            return Response(
                {"comment": CommentSerializer(comment).data, "comment_count": comment_count},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, comment_id):
        if not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"error": "Your account is disabled. You cannot edit comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment = (
            Comment.objects.filter(cmt_id=comment_id)
            .select_related("idea", "idea__closurePeriod", "user")
            .first()
        )
        if not comment:
            return Response({"error": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        if comment.user_id != request.user.user_id:
            return Response(
                {"error": "You can only edit your own comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not getattr(comment.idea.closurePeriod, "is_comment_open", True):
            return Response(
                {"error": "Comment editing is closed for this closure period."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            updated_comment = serializer.save()
            comment_count = Comment.objects.filter(
                idea_id=comment.idea_id,
                user__active_status=True,
                idea__user__active_status=True,
            ).count()
            return Response(
                {
                    "comment": CommentSerializer(updated_comment).data,
                    "comment_count": comment_count,
                },
                status=status.HTTP_200_OK,
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

        reports = Report.objects.select_related("reporter", "idea", "comment", "comment__idea").order_by("-created_at")
        serializer = ReportSerializer(reports, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)

    def patch(self, request):
        role = _normalized_role(request.user)
        if role not in {"admin", "qa_manager"}:
            return Response({"message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        report_id = request.data.get("report_id")
        next_status = str(request.data.get("status", "")).strip().upper()
        allowed_statuses = {choice[0] for choice in Report.Status.choices}

        if not report_id:
            return Response({"message": "Report ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        if next_status not in allowed_statuses:
            return Response({"message": "Valid report status is required."}, status=status.HTTP_400_BAD_REQUEST)

        report = Report.objects.filter(report_id=report_id).first()
        if not report:
            return Response({"message": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

        report.status = next_status
        report.save(update_fields=["status"])

        serializer = ReportSerializer(report)
        return Response(
            {"message": "Report status updated.", "report": serializer.data},
            status=status.HTTP_200_OK,
        )


class ReportCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        role = _normalized_role(request.user)
        if role != "staff":
            return Response({"message": "Only staff can report comments."}, status=status.HTTP_403_FORBIDDEN)
        if not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"message": "Your account is disabled. You cannot report comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment = Comment.objects.filter(cmt_id=comment_id).select_related("idea", "user").first()
        if not comment:
            return Response({"message": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)
        if comment.user_id == request.user.user_id:
            return Response({"message": "You cannot report your own comment."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason", "")).strip().upper()
        details = str(request.data.get("details", "")).strip()
        allowed_reasons = {choice[0] for choice in Report.Reason.choices}
        if reason not in allowed_reasons:
            return Response({"message": "Report reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                report, created = Report.objects.get_or_create(
                    reporter=request.user,
                    comment=comment,
                    reason=reason,
                    defaults={
                        "details": details,
                        "idea": comment.idea,
                        "target_type": Report.TargetType.COMMENT,
                    },
                )
        except IntegrityError:
            report = Report.objects.filter(
                reporter=request.user,
                comment=comment,
                reason=reason,
            ).first()
            created = False

        if report and not created and details and report.details != details:
            report.details = details
            report.save(update_fields=["details"])

        if created:
            preview = (comment.cmt_content or "").strip()
            if len(preview) > 80:
                preview = f"{preview[:77]}..."
            _notify_managers_about_report(
                target_label=preview or f"Comment #{comment.cmt_id}",
                report_reason=reason,
                reporter_username=request.user.username,
                idea=comment.idea,
                target_type="comment",
            )

        return Response(
            {"message": "Comment reported successfully." if created else "You already reported this comment for that reason."},
            status=status.HTTP_200_OK,
        )
