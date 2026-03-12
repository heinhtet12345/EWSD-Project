from rest_framework import serializers
from .models import Comment, Vote

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