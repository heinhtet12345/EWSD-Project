from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializer import LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated


class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data['user']

            #generate token jwt
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # to get user roles
            groups = user.groups.all()
            role = groups[0].name if groups.exists() else None

            profile_image = None
            if hasattr(user, "profile") and user.profile.profile_image:
                profile_image = request.build_absolute_uri(
                    user.profile.profile_image.url
                )

            return Response({
                "message": "Login successful",
                "user_id": user.id,
                "username": user.username,
                "role": role,
                "profile_image": profile_image,
                "access": access_token,
                "refresh": refresh_token,
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
