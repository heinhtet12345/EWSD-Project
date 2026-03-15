# serializers.py

import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        errors = []

        if len(value) < 8:
            errors.append("At least 8 characters.")

        if not re.search(r'[A-Z]', value):
            errors.append("At least 1 uppercase letter (A-Z).")

        if not re.search(r'[a-z]', value):
            errors.append("At least 1 lowercase letter (a-z).")

        if not re.search(r'[0-9]', value):
            errors.append("At least 1 number (0-9).")

        if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', value):
            errors.append("At least 1 special character.")

        if errors:
            raise serializers.ValidationError(errors)

        # Django validators
        try:
            validate_password(value, self.context['request'].user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user