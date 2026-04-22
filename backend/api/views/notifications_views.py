from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from ..models import Notification
from ..serializer import NotificationSerializer


class ListNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(recipient=request.user).order_by('-created_at')
        serializer = NotificationSerializer(queryset[:30], many=True)
        unread_count = queryset.filter(is_read=False).count()
        return Response(
            {
                'results': serializer.data,
                'unread_count': unread_count,
            },
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        updated = Notification.objects.filter(
            notification_id=notification_id,
            recipient=request.user,
        ).update(is_read=True)

        if not updated:
            return Response(
                {'message': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'}, status=status.HTTP_200_OK)
