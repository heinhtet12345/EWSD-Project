from django.contrib.auth import authenticate
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Department, Role, Notification, UserLoginSession

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    name = serializers.SerializerMethodField()
    # Pull the Role name from the Foreign Key
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    # Pull the Department name from the Foreign Key
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id', 
            'username', 
            'first_name',
            'last_name',
            'name',
            'email',
            'role_name', 
            'department_name', 
            'dob', 
            'address_line_1',
            'township',
            'city',
            'postal_code',
            'phone', 
            'hire_date', 
            'active_status',
            'profile_image'
        ]

    def get_name(self, obj):
        full_name = f"{(obj.first_name or '').strip()} {(obj.last_name or '').strip()}".strip()
        return full_name or obj.username


class UserProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    name = serializers.SerializerMethodField()
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    department_name = serializers.CharField(source='department.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id',
            'username',
            'first_name',
            'last_name',
            'name',
            'email',
            'role_name',
            'department_name',
            'dob',
            'address_line_1',
            'township',
            'city',
            'postal_code',
            'phone',
            'hire_date',
            'active_status',
            'profile_image',
        ]
        read_only_fields = ['user_id', 'username', 'role_name', 'department_name', 'hire_date', 'active_status']

    def get_name(self, obj):
        full_name = f"{(obj.first_name or '').strip()} {(obj.last_name or '').strip()}".strip()
        return full_name or obj.username

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


class UserLoginSessionSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = UserLoginSession
        fields = [
            "session_id",
            "device_type",
            "browser",
            "operating_system",
            "ip_address",
            "created_at",
            "last_used_at",
            "revoked_at",
            "is_active",
        ]
        read_only_fields = fields

    def get_is_active(self, obj):
        return obj.revoked_at is None
