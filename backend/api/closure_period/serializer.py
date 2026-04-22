from django.utils import timezone
from rest_framework import serializers
from .models import ClosurePeriod


class ClosurePeriodSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()
    can_extend_idea_deadline = serializers.SerializerMethodField()
    can_extend_comment_deadline = serializers.SerializerMethodField()

    class Meta:
        model = ClosurePeriod
        fields = [
            "id",
            "start_date",
            "idea_closure_date",
            "comment_closure_date",
            "academic_year",
            "is_active",
            "can_extend_idea_deadline",
            "can_extend_comment_deadline",
        ]
        read_only_fields = ["id", "start_date"]

    def get_is_active(self, obj):
        return bool(getattr(obj, "is_comment_open", True))

    def get_can_extend_idea_deadline(self, obj):
        return timezone.now().date() < obj.idea_closure_date

    def get_can_extend_comment_deadline(self, obj):
        return timezone.now().date() < obj.comment_closure_date

    def validate(self, data):
        instance = getattr(self, "instance", None)
        today = timezone.now().date()

        start_date = data.get("start_date") or getattr(instance, "start_date", None)
        idea_closure_date = data.get("idea_closure_date") or getattr(instance, "idea_closure_date", None)
        comment_closure_date = data.get("comment_closure_date") or getattr(instance, "comment_closure_date", None)
        academic_year = data.get("academic_year") or getattr(instance, "academic_year", None)

        if instance:
            if "idea_closure_date" in data and not (today < instance.idea_closure_date):
                raise serializers.ValidationError(
                    {"idea_closure_date": "Idea closure date has already passed and cannot be extended."}
                )
            if "idea_closure_date" in data and data["idea_closure_date"] <= instance.idea_closure_date:
                raise serializers.ValidationError(
                    {"idea_closure_date": "New idea closure date must be later than the current idea closure date."}
                )
            if "comment_closure_date" in data and not (today < instance.comment_closure_date):
                raise serializers.ValidationError(
                    {"comment_closure_date": "Comment closure date has already passed and cannot be extended."}
                )
            if "comment_closure_date" in data and data["comment_closure_date"] <= instance.comment_closure_date:
                raise serializers.ValidationError(
                    {"comment_closure_date": "New comment closure date must be later than the current comment closure date."}
                )

        # Only validate if all fields are present
        if start_date and idea_closure_date and academic_year:
            if start_date > idea_closure_date:
                raise serializers.ValidationError(
                    {"idea_closure_date": "Idea closure date must be after start date."}
                )

        if idea_closure_date and comment_closure_date and academic_year:
            if idea_closure_date > comment_closure_date:
                raise serializers.ValidationError(
                    {"comment_closure_date": "Comment closure date must be after idea closure date."}
                )

        return data
