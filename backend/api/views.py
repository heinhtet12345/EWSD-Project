from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializer import LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import isAuthenticated

class ProtectedView(APIView):
    permission_classes = [isAuthenticated]

    def get(self, request):
        return Response({"message": "This is a protected view", "user": request.user.username})

class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']

            #generate token jwt
            refresh = RefreshToken.for_user(user)

            # to get user roles
            groups = user.groups.all()
            role = groups[0].name if groups.exists() else None

            return Response({
                "message": "Login successful",
                "username": user.username,
                "role": role,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
