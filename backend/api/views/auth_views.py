from os import name
from unicodedata import category
from urllib import request

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..serializer import LoginSerializer, UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']

            #generate token jwt
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # to get user info
            user_data = UserSerializer(user).data

            return Response({
                "message": "Login successful",
                "user_id": user.user_id,
                "username": user.username,
                "role": user_data.get("role_name", "No Role Assigned"),
                "department": user_data.get("department_name", "No Department Assigned"),
                "profile_image": user_data.get("profile_image", None),
                "access": access_token,
                "refresh": refresh_token,
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)