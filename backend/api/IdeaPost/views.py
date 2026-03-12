from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.mail import send_mail
from django.core.mail import BadHeaderError
from django.contrib.auth import get_user_model
from api.closure_period.models import ClosurePeriod
from api.models import Notification
from .serializer import IdeaCreateSerializer, IdeaListSerializer, IdeaDetailSerializer
from .models import Idea, UploadedDocument

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

        active_period = ClosurePeriod.objects.filter(is_active=True).first()
        
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

        idea = Idea.objects.filter(idea_id=idea_id).select_related("department", "user").first()
        if not idea:
            return Response({"message": "Idea not found."}, status=status.HTTP_404_NOT_FOUND)
        if idea.user_id == request.user.user_id:
            return Response({"message": "You cannot report your own idea."}, status=status.HTTP_400_BAD_REQUEST)

        recipients = [
            user
            for user in User.objects.select_related("role")
            if _normalized_role(user) in {"admin", "qa_manager"}
        ]

        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title="Idea reported",
                message=f'"{idea.idea_title}" was reported by {request.user.username}.',
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