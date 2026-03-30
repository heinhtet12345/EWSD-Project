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
from api.interaction.views import _notify_managers_about_report
from .serializer import IdeaCreateSerializer, IdeaListSerializer, IdeaDetailSerializer
from .models import Idea, UploadedDocument

import csv
import os
import zipfile
from io import BytesIO, StringIO
from django.http import HttpResponse
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.core.paginator import Paginator

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
        search = str(request.query_params.get('search', '')).strip()
        category_id = request.query_params.get('category_id')
        department_id = request.query_params.get('department_id')
        open_filter = str(request.query_params.get('open_filter', 'all')).strip().lower()
        highlight_idea_id = request.query_params.get('highlight_idea_id')

        try:
            page = int(request.query_params.get('page', 1))
        except (TypeError, ValueError):
            page = 1
        page = max(1, page)

        try:
            page_size = int(request.query_params.get('page_size', 5))
        except (TypeError, ValueError):
            page_size = 5
        page_size = max(1, min(page_size, 50))

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

        department_options = list(
            ideas.exclude(department__isnull=True)
            .values('department_id', 'department__dept_name')
            .distinct()
            .order_by('department__dept_name')
        )

        if search:
            ideas = ideas.filter(
                Q(idea_title__icontains=search)
                | Q(idea_content__icontains=search)
                | Q(user__username__icontains=search)
                | Q(department__dept_name__icontains=search)
            )

        if category_id and str(category_id).isdigit():
            ideas = ideas.filter(categories__category_id=int(category_id))

        if department_id and str(department_id).isdigit():
            ideas = ideas.filter(department_id=int(department_id))

        if open_filter == 'open':
            ideas = ideas.filter(closurePeriod__idea_closure_date__gt=timezone.now().date())
        elif open_filter == 'closed':
            ideas = ideas.filter(closurePeriod__idea_closure_date__lte=timezone.now().date())

        ideas = (
            ideas.select_related('user', 'department', 'closurePeriod')
            .prefetch_related('categories', 'documents')
            .annotate(
                upvote_count=Count('votes', filter=Q(votes__vote_type='UP'), distinct=True),
                downvote_count=Count('votes', filter=Q(votes__vote_type='DOWN'), distinct=True),
                comment_count=Count('comments', filter=Q(comments__user__active_status=True), distinct=True),
            )
            .distinct()
            .order_by('-submit_datetime')
        )

        if highlight_idea_id and str(highlight_idea_id).isdigit():
            highlighted_ids = list(ideas.values_list('idea_id', flat=True))
            try:
                highlighted_index = highlighted_ids.index(int(highlight_idea_id))
            except ValueError:
                highlighted_index = None
            if highlighted_index is not None:
                page = highlighted_index // page_size + 1

        paginator = Paginator(ideas, page_size)
        page_obj = paginator.get_page(page)

        serializer = IdeaListSerializer(page_obj.object_list, many=True, context={"request": request, "viewer_role": role})
        return Response({
            "results": serializer.data,
            "count": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "department_options": [
                {
                    "department_id": item["department_id"],
                    "department_name": item["department__dept_name"],
                }
                for item in department_options
            ],
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

        try:
            with transaction.atomic():
                _, created = Report.objects.get_or_create(
                    reporter=request.user,
                    idea=idea,
                    reason=reason,
                    defaults={"details": details, "target_type": Report.TargetType.POST},
                )
        except IntegrityError:
            created = False

        if created:
            _notify_managers_about_report(
                target_label=idea.idea_title,
                report_reason=reason,
                reporter_username=request.user.username,
                idea=idea,
                target_type="idea",
            )

        return Response(
            {"message": "Idea reported successfully." if created else "You already reported this idea for that reason."},
            status=status.HTTP_200_OK,
        )

class IdeaDetailView(APIView):
    def get(self, request, idea_id):
        try:
            idea = Idea.objects.select_related('user',      'department', 'closurePeriod') \
                           .prefetch_related('votes', 'documents', 'categories') \
                           .get(pk=idea_id)
            if not bool(getattr(idea.user, "active_status", True)):
                return Response({"error": "Idea not found"}, status=status.HTTP_404_NOT_FOUND)
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
        export_type = str(request.query_params.get("export_type", "all")).strip().lower()
        if export_type not in {"all", "report", "documents"}:
            return Response({"message": "Invalid export type."}, status=status.HTTP_400_BAD_REQUEST)

        filename_label = None
        if academic_year:
            filename_label = academic_year
        elif closure_period_id:
            filename_label = (
                ClosurePeriod.objects.filter(id=closure_period_id).values_list("academic_year", flat=True).first()
                or f"closure_{closure_period_id}"
            )
        safe_filename_label = (
            str(filename_label).strip().replace(" ", "_").replace("/", "-")
            if filename_label
            else None
        )

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

        if export_type == "report":
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
            for idea in ideas:
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

            response = HttpResponse(csv_io.getvalue(), content_type="text/csv")
            filename = f"{safe_filename_label}_report.csv" if safe_filename_label else "Report_Only.csv"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

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
            flatten_documents_zip = export_type == "documents" and len(closure_periods) == 1
            # Group ideas by closure period and create foldered bundles.
            for closure_period in closure_periods:
                closure_id = closure_period.id
                closure_ideas = ideas_by_closure.get(closure_id, [])
                academic_label = getattr(closure_period, "academic_year", "") or f"Closure_{closure_id or 'unknown'}"
                folder_name = academic_label.replace(" ", "_").replace("/", "-")

                if export_type == "all":
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

                if export_type in {"all", "documents"}:
                    documents = UploadedDocument.objects.select_related("idea").filter(idea__in=closure_ideas)
                    for document in documents:
                        try:
                            file_path = document.file.path
                        except (ValueError, AttributeError):
                            continue
                        if not os.path.exists(file_path):
                            continue
                        if flatten_documents_zip:
                            arcname = f"{document.doc_id}_{os.path.basename(document.file.name)}"
                        else:
                            arcname = os.path.join(
                                folder_name, "documents", f"{document.doc_id}_{os.path.basename(document.file.name)}"
                            )
                        with open(file_path, "rb") as f:
                            zipf.writestr(arcname, f.read())

        zip_buffer.seek(0)
        if export_type == "documents" and safe_filename_label:
            filename = f"{safe_filename_label}_documents.zip"
        elif export_type == "all" and safe_filename_label:
            filename = f"{safe_filename_label}_all.zip"
        else:
            export_base_names = {
                "all": "Data_Report",
                "documents": "Documents_Only",
            }
            base_name = export_base_names.get(export_type, "Data_Report")
            filename = f"{base_name}.zip"

        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


