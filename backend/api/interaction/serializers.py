from rest_framework import serializers
from .models import Comment, Vote, Report

class CommentSerializer(serializers.ModelSerializer):
    # These fields are filled automatically by the view
    user = serializers.ReadOnlyField(source='user.username')
    user_id = serializers.ReadOnlyField(source='user.user_id')
    
    class Meta:
        model = Comment
        fields = ['cmt_id', 'cmt_content', 'anonymous_status', 'cmt_datetime', 'user', 'user_id', 'idea']
        read_only_fields = ['cmt_id', 'cmt_datetime', 'user', 'idea']

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['vote_id', 'vote_type', 'vote_datetime', 'user', 'idea']
        read_only_fields = ['vote_id', 'vote_datetime', 'user', 'idea']


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.SerializerMethodField()
    idea_title = serializers.SerializerMethodField()
    comment_content = serializers.SerializerMethodField()
    target_type = serializers.SerializerMethodField()
    target_label = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'report_id',
            'reason',
            'details',
            'status',
            'created_at',
            'reporter',
            'reporter_username',
            'idea',
            'idea_title',
            'comment',
            'comment_content',
            'target_type',
            'target_label',
        ]
        read_only_fields = [
            'report_id',
            'created_at',
            'reporter',
            'idea',
            'comment',
            'reporter_username',
            'idea_title',
            'comment_content',
            'target_type',
            'target_label',
        ]

    def get_reporter_username(self, obj):
        return obj.reporter.username if obj.reporter else None

    def get_idea_title(self, obj):
        return obj.idea.idea_title if obj.idea else None

    def get_comment_content(self, obj):
        return obj.comment.cmt_content if obj.comment else None

    def get_target_type(self, obj):
        return obj.target_type

    def get_target_label(self, obj):
        if obj.comment_id:
            preview = (obj.comment.cmt_content or "").strip()
            if len(preview) > 80:
                preview = f"{preview[:77]}..."
            return preview or f"Comment #{obj.comment_id}"
        if obj.idea_id:
            return obj.idea.idea_title
        return None
