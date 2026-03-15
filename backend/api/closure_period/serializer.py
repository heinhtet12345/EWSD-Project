from rest_framework import serializers
from .models import ClosurePeriod


class ClosurePeriodSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = ClosurePeriod
        fields = [
            "id",
            "start_date",
            "idea_closure_date",
            "comment_closure_date",
            "academic_year",
            "is_active",
        ]
        read_only_fields = ["id", "start_date"]

    def get_is_active(self, obj):
        return bool(getattr(obj, "is_comment_open", True))

    def validate(self, data):
        start_date = data.get("start_date")
        idea_closure_date = data.get("idea_closure_date")
        comment_closure_date = data.get("comment_closure_date")
        academic_year = data.get("academic_year")

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
