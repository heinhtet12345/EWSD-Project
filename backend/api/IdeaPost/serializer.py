from rest_framework import serializers
from .models import Idea, UploadedDocument
from api.models import Category
from api.interaction.models import Comment, Vote
from api.interaction.serializers import CommentSerializer, VoteSerializer
from pathlib import Path

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",
    ".odt",
    ".csv",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
}


def validate_uploaded_document(file):
    extension = Path(file.name or "").suffix.lower()
    if extension not in ALLOWED_DOCUMENT_EXTENSIONS:
        allowed_types = ", ".join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))
        raise serializers.ValidationError(
            f"Only document files are allowed: {allowed_types}"
        )
    return file

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDocument
        fields = ['doc_id', 'file', 'file_name', 'upload_time']

class IdeaCreateSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), source='categories'
    )

    documents = DocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Idea
        fields = [
            'idea_id', 'idea_title', 'idea_content', 
            'anonymous_status', 'category_ids', 'terms_accepted', 'submit_datetime', 'user', 'department', 'closurePeriod', 'documents'
        ]
        read_only_fields = ['idea_id', 'submit_datetime', 'user', 'department', 'closurePeriod', 'documents']

    def validate_terms_accepted(self, value):
        if value is not True:
            raise serializers.ValidationError("You must accept the terms and conditions before submitting an idea.")
        return value

    def validate_category_ids(self, value):
        if not value:
            raise serializers.ValidationError("You must select at least one category before submitting an idea.")
        return value

class IdeaListSerializer(serializers.ModelSerializer):
    category_ids = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.dept_name', read_only=True)
    closure_period_academic_year = serializers.CharField(source='closurePeriod.academic_year', read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    poster_username = serializers.SerializerMethodField()
    poster_name = serializers.SerializerMethodField()
    poster_profile_image = serializers.SerializerMethodField()
    closure_period_idea_open = serializers.SerializerMethodField()
    closure_period_comment_open = serializers.SerializerMethodField()
    upvote_count = serializers.SerializerMethodField()
    downvote_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = Idea
        fields = [
            'idea_id', 'idea_title', 'idea_content', 
            'anonymous_status', 'category_ids', 'terms_accepted', 'submit_datetime', 'user', 'department', 'department_name', 'closurePeriod', 'closure_period_academic_year', 'documents', 'poster_username', 'poster_name', 'poster_profile_image',
            'upvote_count', 'downvote_count', 'comment_count', 'user_vote',
            'closure_period_idea_open', 'closure_period_comment_open'
        ]
    
    def get_category_ids(self, obj):
        return list(obj.categories.values_list('category_id', flat=True))

    def _can_view_poster_identity(self, obj) -> bool:
        viewer_role = str(self.context.get('viewer_role', '')).strip().lower()
        if viewer_role in {'admin', 'qa_manager', 'qa_coordinator'}:
            return True
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and request.user == obj.user:
            return True
        return not obj.anonymous_status

    def get_poster_username(self, obj):
        return obj.user.username if self._can_view_poster_identity(obj) else None

    def get_poster_name(self, obj):
        if not self._can_view_poster_identity(obj):
            return None
        first_name = (obj.user.first_name or '').strip()
        last_name = (obj.user.last_name or '').strip()
        full_name = f"{first_name} {last_name}".strip()
        return full_name or obj.user.username

    def get_poster_profile_image(self, obj):
        if not self._can_view_poster_identity(obj):
            return None
        profile_image = getattr(obj.user, 'profile_image', None)
        if not profile_image:
            return None
        try:
            return profile_image.url
        except Exception:
            return None

    def get_upvote_count(self, obj):
        return getattr(obj, 'upvote_count', obj.votes.filter(vote_type='UP').count())

    def get_downvote_count(self, obj):
        return getattr(obj, 'downvote_count', obj.votes.filter(vote_type='DOWN').count())

    def get_comment_count(self, obj):
        return getattr(obj, 'comment_count', obj.comments.filter(user__active_status=True).count())

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        vote = obj.votes.filter(user=request.user).first()
        return vote.vote_type if vote else None

    def get_closure_period_idea_open(self, obj):
        return bool(getattr(obj.closurePeriod, "is_idea_open", True))

    def get_closure_period_comment_open(self, obj):
        return bool(getattr(obj.closurePeriod, "is_comment_open", True))

class IdeaDetailSerializer(serializers.ModelSerializer):
    comments = serializers.SerializerMethodField()
    documents = DocumentSerializer(many=True, read_only=True)
    
    user_name = serializers.ReadOnlyField(source='user.username')
    department_name = serializers.ReadOnlyField(source='department.dept_name')
    closure_info = serializers.ReadOnlyField(source='closurePeriod.name')
    category_names = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field='category_name', source='categories'
    )

    # Counts
    upvote_count = serializers.SerializerMethodField()
    downvote_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Idea
        fields = [
            'idea_id', 'idea_title', 'idea_content', 'anonymous_status', 
            'submit_datetime', 'user_name', 'department_name', 'category_names',
            'closure_info', 'upvote_count', 'downvote_count', 
            'comment_count', 'documents', 'comments'
        ]

    def get_upvote_count(self, obj):
        return obj.votes.filter(vote_type='UP').count()

    def get_downvote_count(self, obj):
        return obj.votes.filter(vote_type='DOWN').count()

    def get_comment_count(self, obj):
        return obj.comments.filter(user__active_status=True).count()

    def get_comments(self, obj):
        comments = obj.comments.filter(user__active_status=True).select_related("user").order_by("cmt_datetime")
        return CommentSerializer(comments, many=True).data
