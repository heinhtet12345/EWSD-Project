from os import name
from unicodedata import category
from urllib import request

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..serializer import CategorySerializer
from rest_framework.permissions import IsAuthenticated
from ..models import Category

class AddCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Only QA Manager allowed
        if not request.user.role or request.user.role.role_name != "QA_Manager":
            return Response(
                {"message": "Not authorized. QA Manager role required."},
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
            "id": category.category_id,
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
