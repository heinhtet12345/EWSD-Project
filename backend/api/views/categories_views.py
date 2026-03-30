from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..serializer import CategorySerializer
from rest_framework.permissions import IsAuthenticated
from ..models import Category


def _normalized_role(user) -> str:
    role_name = getattr(getattr(user, "role", None), "role_name", "") or ""
    return role_name.strip().lower().replace(" ", "_")


class AddCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Only QA Manager allowed
        if _normalized_role(request.user) != "qa_manager":
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
    
class DeleteCategoryView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, category_id):
        if _normalized_role(request.user) != "qa_manager":
            return Response(
                {"message": "Not authorized. QA Manager role required."},
                status=status.HTTP_403_FORBIDDEN
            )

        category = get_object_or_404(Category, category_id=category_id)
        if category.ideas.exists():
            return Response(
                {"message": "Category cannot be deleted because it is already used by one or more ideas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category.delete() 
        return Response(
            {"message": "Category deleted successfully"},
            status=status.HTTP_200_OK
        )
