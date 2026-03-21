from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.mail import send_mail
from django.core.mail import BadHeaderError
from django.contrib.auth import get_user_model
from api.closure_period.models import ClosurePeriod
from django.utils import timezone
from api.models import Notification
from api.interaction.models import Report
from .serializer import IdeaCreateSerializer, IdeaListSerializer, IdeaDetailSerializer
from .models import Idea, UploadedDocument

import csv
import os
import zipfile
from io import BytesIO, StringIO
from django.http import HttpResponse
from django.db.models import Count, Q

User = get_user_model()


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


class PostIdeaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        role = _normalized_role(request.user)
        if role == "staff" and not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"message": "Your account is disabled. You cannot submit ideas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.now().date()
        active_period = (
            ClosurePeriod.objects.filter(start_date__lte=today, comment_closure_date__gt=today)
            .order_by("-start_date")
            .first()
        )
        
        if not active_period or not active_period.is_idea_open:
            return Response(
                {"message": "Submissions are closed for the current academic year."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not request.user.department:
            return Response(
                {"message": "User must be assigned to a department to submit ideas."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = IdeaCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                idea = serializer.save(
                    user=request.user,             # From Login Token
                    department=request.user.department,   # From User Model
                    closurePeriod=active_period           
                )

                files = request.FILES.getlist('documents') 
                for f in files:
                    UploadedDocument.objects.create(
                        idea=idea,
                        file=f,
                        file_name=f.name 
                    )

                # Do not fail idea submission if SMTP server is unavailable.
                try:
                    self.send_coordinator_notification(idea)
                except Exception:
                    pass

                return Response(IdeaCreateSerializer(idea).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {"message": f"An error occurred while saving the idea: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_coordinator_notification(self, idea):
        """Notify QA coordinators in the same department (in-app + optional email)."""
        coordinators = [
            user
            for user in User.objects.filter(department=idea.department).select_related('role')
            if _normalized_role(user) == 'qa_coordinator'
        ]

        for coordinator in coordinators:
            Notification.objects.create(
                recipient=coordinator,
                title='New idea submitted',
                message=f'{idea.user.username} submitted "{idea.idea_title}" in {idea.department.dept_name}.',
                notification_type='idea_submitted',
                idea=idea,
            )

            if coordinator.email:
                try:
                    send_mail(
                        subject=f"New Idea Submitted: {idea.idea_title}",
                        message=f"Staff {idea.user.username} submitted an idea in {idea.department.dept_name}.",
                        from_email="system@ewsd.edu",
                        recipient_list=[coordinator.email],
                        fail_silently=True,
                    )
                except (BadHeaderError, OSError):
                    # Ignore mail transport issues to keep core submission flow reliable.
                    continue

class ListIdeasView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Only allow staff and QA coordinators to view ideas
        role = _normalized_role(request.user)
        if role not in ['staff', 'qa_coordinator', 'qa_manager', 'admin']:
            return Response(
                {"message": "Not authorized to view ideas."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        mine_only = str(request.query_params.get('mine', 'false')).lower() == 'true'
        my_department_only = str(request.query_params.get('my_department', 'false')).lower() == 'true'

        active_ideas = Idea.objects.filter(user__active_status=True)

        # Filter ideas based on user role and requested scope
        if role == 'staff':
            ideas = active_ideas.filter(user=request.user) if mine_only else active_ideas
        elif role == 'qa_coordinator':
            # QA Coordinators can see ideas from their department
            ideas = active_ideas.filter(department=request.user.department)
        elif role == 'qa_manager' and my_department_only:
            ideas = active_ideas.filter(department=request.user.department) if request.user.department else Idea.objects.none()
        else:
            # QA Managers and Admins can see all ideas
            ideas = active_ideas

        # Order ideas from newest to oldest by submission time.
        ideas = ideas.order_by('-submit_datetime')

        serializer = IdeaListSerializer(ideas, many=True, context={"request": request, "viewer_role": role})
        return Response({
            "results": serializer.data
        })


class ReportIdeaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, idea_id):
        role = _normalized_role(request.user)
        if role != "staff":
            return Response({"message": "Only staff can report ideas."}, status=status.HTTP_403_FORBIDDEN)
        if not bool(getattr(request.user, "active_status", True)):
            return Response(
                {"message": "Your account is disabled. You cannot report ideas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        idea = Idea.objects.filter(idea_id=idea_id).select_related("department", "user").first()
        if not idea:
            return Response({"message": "Idea not found."}, status=status.HTTP_404_NOT_FOUND)
        if idea.user_id == request.user.user_id:
            return Response({"message": "You cannot report your own idea."}, status=status.HTTP_400_BAD_REQUEST)

        reason = str(request.data.get("reason", "")).strip().upper()
        details = str(request.data.get("details", "")).strip()
        allowed_reasons = {choice[0] for choice in Report.Reason.choices}
        if reason not in allowed_reasons:
            return Response({"message": "Report reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        Report.objects.get_or_create(
            reporter=request.user,
            idea=idea,
            reason=reason,
            defaults={"details": details},
        )

        recipients = [
            user
            for user in User.objects.select_related("role")
            if _normalized_role(user) in {"admin", "qa_manager"}
        ]

        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title="Idea reported",
                message=f'"{idea.idea_title}" was reported by {request.user.username}. Reason: {reason}.',
                notification_type="idea_reported",
                idea=idea,
            )

        return Response({"message": "Idea reported successfully."}, status=status.HTTP_200_OK)

class IdeaDetailView(APIView):
    def get(self, request, idea_id):
        try:
            idea = Idea.objects.select_related('user',      'department', 'closurePeriod') \
                           .prefetch_related('comments', 'votes', 'documents', 'categories') \
                           .get(pk=idea_id)
            serializer = IdeaDetailSerializer(idea)
            return Response(serializer.data)
        except Idea.DoesNotExist:
            return Response({"error": "Idea not found"},        status=status.HTTP_404_NOT_FOUND)


class DownloadAllIdeasDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = _normalized_role(request.user)
        if role not in {"qa_manager", "admin"}:
            return Response({"message": "Not authorized to download all data."}, status=status.HTTP_403_FORBIDDEN)

        closure_period_id = request.query_params.get("closure_period_id")
        academic_year = request.query_params.get("academic_year")

        ideas = (
            Idea.objects.select_related("user", "department", "closurePeriod")
            .prefetch_related("categories")
            .annotate(
                upvote_count=Count("votes", filter=Q(votes__vote_type="UP")),
                downvote_count=Count("votes", filter=Q(votes__vote_type="DOWN")),
                comment_count=Count("comments"),
            )
            .order_by("-submit_datetime")
        )

        if closure_period_id:
            ideas = ideas.filter(closurePeriod_id=closure_period_id)
        if academic_year:
            ideas = ideas.filter(closurePeriod__academic_year=academic_year)

        # Closure periods to include in ZIP:
        if closure_period_id or academic_year:
            cp_qs = ClosurePeriod.objects.all()
            if closure_period_id:
                cp_qs = cp_qs.filter(id=closure_period_id)
            if academic_year:
                cp_qs = cp_qs.filter(academic_year=academic_year)
            closure_periods = list(cp_qs.order_by("id"))
        else:
            # No filters: include all closure periods, even if they have zero ideas.
            closure_periods = list(ClosurePeriod.objects.all().order_by("id"))

        # Seed mapping so empty periods still get a folder/CSV.
        ideas_by_closure = {cp.id: [] for cp in closure_periods}
        for idea in ideas:
            closure_id = getattr(idea.closurePeriod, "id", None)
            ideas_by_closure.setdefault(closure_id, []).append(idea)

        # Seed dict with all closure periods to ensure empty periods still get a folder and CSV.
        ideas_by_closure = {cp.id: [] for cp in closure_periods}
        for idea in ideas:
            closure_id = getattr(idea.closurePeriod, "id", None)
            ideas_by_closure.setdefault(closure_id, []).append(idea)

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
            # Group ideas by closure period and create foldered bundles.
            for closure_period in closure_periods:
                closure_id = closure_period.id
                closure_ideas = ideas_by_closure.get(closure_id, [])
                academic_label = getattr(closure_period, "academic_year", "") or f"Closure_{closure_id or 'unknown'}"
                folder_name = academic_label.replace(" ", "_").replace("/", "-")

                # CSV per closure period
                csv_io = StringIO()
                writer = csv.writer(csv_io)
                writer.writerow(
                    [
                        "Idea ID",
                        "Title",
                        "Content",
                        "Anonymous",
                        "Submit Datetime",
                        "Poster Username",
                        "Department",
                        "Closure Period",
                        "Categories",
                        "Start Date",
                        "Idea Closure Date",
                        "Comment Closure Date",
                        "Upvote Count",
                        "Downvote Count",
                        "Comment Count",
                        "URL_Document (Optional)",
                    ]
                )
                for idea in closure_ideas:
                    category_names = ", ".join(idea.categories.values_list("category_name", flat=True))
                    closure = idea.closurePeriod
                    doc_urls = [
                        doc.file.url
                        for doc in UploadedDocument.objects.filter(idea=idea)
                        if getattr(doc, "file", None)
                    ]
                    writer.writerow(
                        [
                            idea.idea_id,
                            idea.idea_title,
                            idea.idea_content,
                            idea.anonymous_status,
                            idea.submit_datetime,
                            getattr(idea.user, "username", ""),
                            getattr(idea.department, "dept_name", ""),
                            getattr(closure, "academic_year", ""),
                            category_names,
                            getattr(closure, "start_date", ""),
                            getattr(closure, "idea_closure_date", ""),
                            getattr(closure, "comment_closure_date", ""),
                            getattr(idea, "upvote_count", 0),
                            getattr(idea, "downvote_count", 0),
                            getattr(idea, "comment_count", 0),
                            "; ".join(doc_urls),
                        ]
                    )
                csv_filename = f"{academic_label.replace('/', '-')} (Report).csv"
                zipf.writestr(os.path.join(folder_name, csv_filename), csv_io.getvalue())

                # Documents under each closure folder
                documents = UploadedDocument.objects.select_related("idea").filter(idea__in=closure_ideas)
                for document in documents:
                    try:
                        file_path = document.file.path
                    except (ValueError, AttributeError):
                        continue
                    if not os.path.exists(file_path):
                        continue
                    arcname = os.path.join(
                        folder_name, "documents", f"{document.doc_id}_{os.path.basename(document.file.name)}"
                    )
                    with open(file_path, "rb") as f:
                        zipf.writestr(arcname, f.read())

        zip_buffer.seek(0)
        base_name = "Data_Report"
        filename_suffix = ""
        if academic_year:
            filename_suffix = f"_{academic_year.replace(' ', '_')}"
        elif closure_period_id:
            filename_suffix = f"_closure_{closure_period_id}"

        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename=\"{base_name}{filename_suffix}.zip\"'
        return response


