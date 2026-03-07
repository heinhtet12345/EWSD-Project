from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from api.closure_period.models import ClosurePeriod
from .serializer import IdeaCreateSerializer
from .models import Idea, UploadedDocument

User = get_user_model()

class PostIdeaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
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

                self.send_coordinator_notification(idea)

                return Response(IdeaCreateSerializer(idea).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {"message": f"An error occurred while saving the idea: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_coordinator_notification(self, idea):
        """Finds the QA Coordinator in the same department and sends email via Papercut."""
        coordinator = User.objects.filter(
            role__role_name="QA_Coordinator",
            department=idea.department 
        ).first()

        if coordinator:
            send_mail(
                subject=f"New Idea Submitted: {idea.idea_title}",
                message=f"Staff {idea.user.username} submitted an idea in {idea.department.dept_name}.",
                from_email="system@ewsd.edu",
                recipient_list=[coordinator.email],
                fail_silently=False, # Set to False to catch errors in terminal
            )