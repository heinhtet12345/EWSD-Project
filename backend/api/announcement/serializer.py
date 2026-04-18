from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by = serializers.IntegerField(source="posted_by.user_id", read_only=True)
    posted_by_name = serializers.SerializerMethodField()
    poster_department = serializers.SerializerMethodField()
    poster_role = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "a_id",
            "posted_by",
            "posted_by_name",
            "poster_department",
            "poster_role",
            "a_title",
            "a_content",
            "posted_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields = [
            "a_id",
            "posted_by",
            "posted_by_name",
            "poster_department",
            "poster_role",
            "posted_at",
            "updated_at",
        ]

    def get_posted_by_name(self, obj):
        full_name = f"{obj.posted_by.first_name} {obj.posted_by.last_name}".strip()
        return full_name or obj.posted_by.username

    def get_poster_department(self, obj):
        department = getattr(obj.posted_by, "department", None)
        return getattr(department, "dept_name", "") or ""

    def get_poster_role(self, obj):
        role = getattr(getattr(obj.posted_by, "role", None), "role_name", "") or ""
        return role

    def validate_a_title(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Announcement title is required.")
        return value

    def validate_a_content(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Announcement content is required.")
        return value

