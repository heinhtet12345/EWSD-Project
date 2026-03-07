from django.contrib.auth import authenticate
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Department, Role, Notification

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    # Pull the Role name from the Foreign Key
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    # Pull the Department name from the Foreign Key
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id', 
            'username', 
            'email',
            'role_name', 
            'department_name', 
            'dob', 
            'address', 
            'phone', 
            'hire_date', 
            'active_status',
            'profile_image'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id',
            'username',
            'email',
            'role_name',
            'department_name',
            'dob',
            'address',
            'phone',
            'hire_date',
            'active_status',
            'profile_image',
        ]
        read_only_fields = ['user_id', 'role_name', 'department_name', 'hire_date', 'active_status']

# 2. Login Serializer
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

        # Attaching the user object for the View
        data['user'] = user
        return data

# 3. Category Serializer
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['category_id', 'category_name', 'category_desc']
        read_only_fields = ['category_id']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'title',
            'message',
            'notification_type',
            'is_read',
            'created_at',
            'idea',
        ]
        read_only_fields = fields
