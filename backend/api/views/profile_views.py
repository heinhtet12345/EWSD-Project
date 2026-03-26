from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from ..password_rules import validate_custom_password_rules
from ..serializer import UserProfileSerializer


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not old_password or not new_password or not confirm_password:
            return Response(
                {'message': 'Old password, new password, and confirm password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(old_password):
            return Response({'message': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'message': 'New password and confirm password do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        custom_error = validate_custom_password_rules(new_password)
        if custom_error:
            return Response({'message': custom_error}, status=status.HTTP_400_BAD_REQUEST)

        known_bad_passwords = {'password', '123456', '12345678', 'qwerty', 'abc123', 'password123'}
        if new_password.lower() in known_bad_passwords:
            return Response(
                {'message': 'This password is too common or unsafe. Please choose a stronger password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response({'message': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
