from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import update_session_auth_hash

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .serializers import ChangePasswordSerializer


@method_decorator(csrf_exempt, name='dispatch')
class ChangePasswordAPIView(APIView):
    # API only supports authenticated users
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Provide a simple message for browser access or health checks.
        return Response(
            {
                "detail": "Submit a POST request with fields old_password, new_password, and confirm_password."
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            user = serializer.save()

            # Prevent logout if using session authentication
            update_session_auth_hash(request, user)

            return Response(
                {"detail": "Password updated successfully."},
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

