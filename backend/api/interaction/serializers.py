from rest_framework import serializers
from .models import Comment, Vote, Report

class CommentSerializer(serializers.ModelSerializer):
    # These fields are filled automatically by the view
    user = serializers.ReadOnlyField(source='user.username') 
    
    class Meta:
        model = Comment
        fields = ['cmt_id', 'cmt_content', 'anonymous_status', 'cmt_datetime', 'user', 'idea']
        read_only_fields = ['cmt_id', 'cmt_datetime', 'user', 'idea']

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['vote_id', 'vote_type', 'vote_datetime', 'user', 'idea']
        read_only_fields = ['vote_id', 'vote_datetime', 'user', 'idea']


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.SerializerMethodField()
    idea_title = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'report_id',
            'reason',
            'details',
            'created_at',
            'reporter',
            'reporter_username',
            'idea',
            'idea_title',
        ]
        read_only_fields = ['report_id', 'created_at', 'reporter', 'idea']

    def get_reporter_username(self, obj):
        return obj.reporter.username if obj.reporter else None

    def get_idea_title(self, obj):
        return obj.idea.idea_title if obj.idea else None
