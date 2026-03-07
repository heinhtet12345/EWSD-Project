from rest_framework import serializers
from .models import Idea, UploadedDocument
from api.models import Category

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

class IdeaListSerializer(serializers.ModelSerializer):
    category_ids = serializers.SerializerMethodField()
    documents = DocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Idea
        fields = [
            'idea_id', 'idea_title', 'idea_content', 
            'anonymous_status', 'category_ids', 'terms_accepted', 'submit_datetime', 'user', 'department', 'closurePeriod', 'documents'
        ]
    
    def get_category_ids(self, obj):
        return list(obj.categories.values_list('category_id', flat=True))

