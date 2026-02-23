from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated



from .serializer import ClosurePeriodSerializer
from .models import ClosurePeriod


class AddClosurePeriodView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, "role") or request.user.role.role_name != "QA_Manager":
            return Response(
                {"message": "Not authorized. QA Manager role required."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ClosurePeriodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class ViewClosurePeriodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        closureperiod = ClosurePeriod.objects.all()
        serializer = ClosurePeriodSerializer(closureperiod, many=True)

        return Response({
            "results": serializer.data
        }) 