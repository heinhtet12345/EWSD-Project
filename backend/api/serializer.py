from django.contrib.auth import authenticate
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category

# 1. Helper to format the User data for the frontend
class UserSerializer(serializers.ModelSerializer):
    # 'role' is from the Groups
    role = serializers.SerializerMethodField()
    # 'profile_img' is pulled from the related Profile model
    profile_img = serializers.ImageField(source='profile.profile_image', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'profile_img']

    def get_role(self, obj):
        # Grabs the first assigned group name (e.g., "QA_Manager")
        group = obj.groups.first()
        return group.name if group else "No Role"

# 2. Your existing Login Serializer (Updated)
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            username=data['username'],
            password=data['password']
        )

        if not user:
            raise serializers.ValidationError("Invalid username or password")

        if not user.is_active:
            raise serializers.ValidationError("User is not active")

        # We attach the user object so the View can access it
        data['user'] = user
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'category_name', 'category_desc']