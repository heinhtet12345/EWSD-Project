from django.contrib.auth import authenticate
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Department, Role, Notification

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name', required=False, allow_blank=True)
    # Pull the Role name from the Foreign Key
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    # Pull the Department name from the Foreign Key
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id', 
            'username', 
            'name',
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
    name = serializers.CharField(source='first_name', required=False, allow_blank=True)
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id',
            'username',
            'name',
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
        read_only_fields = ['user_id', 'username', 'role_name', 'department_name', 'hire_date', 'active_status']

# 2. Login Serializer
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            username=data['username'],
            password=data['password']
        )

        # Backward compatibility: allow login for accounts disabled via active_status,
        # even if is_active was previously set False by older logic.
        if not user:
            inactive_user = User.objects.filter(username=data['username']).first()
            if (
                inactive_user
                and not inactive_user.active_status
                and not inactive_user.is_active
                and inactive_user.check_password(data['password'])
            ):
                user = inactive_user

        if not user:
            raise serializers.ValidationError("Invalid username or password")

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
