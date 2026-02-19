from os import name
from unicodedata import category
from urllib import request

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializer import LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from .models import Category
from .serializer import CategorySerializer

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

class AddCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Only QA Manager allowed
        if not request.user.groups.filter(name="QA_Manager").exists():
            return Response(
                {"message": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )

        name = request.data.get("name")
        description = request.data.get("description")

        if not name or not description:
            return Response(
                {"message": "Name and description are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        category = Category.objects.create(
            category_name=name,
            category_desc=description
        )

        return Response({
            "id": category.id,
            "name": category.category_name,
            "description": category.category_desc
        }, status=status.HTTP_201_CREATED)

class ViewCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)

        return Response({
            "results": serializer.data
        })
