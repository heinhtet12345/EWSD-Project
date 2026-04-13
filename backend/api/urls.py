from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views.categories_views import AddCategoryView
from .views.categories_views import ViewCategoryView , DeleteCategoryView, UpdateCategoryView
from .views.auth_views import LoginView, LogoutView
from .views.profile_views import UserProfileView, ChangePasswordView, UserSessionListView, UserSessionRevokeView
from .views.notifications_views import (
    ListNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)
from .views.admin_views import (
    ForgotPasswordRequestView,
    AdminUserListView,
    AdminUserMetaView,
    AdminCreateUserView,
    AdminResetUserPasswordView,
    AdminDeleteUserAccountView,
    AdminDisableUserAccountView,
    AdminEnableUserAccountView,
    CoordinatorDepartmentStaffListView,
)


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('password-reset/request/', ForgotPasswordRequestView.as_view(), name='password-reset-request'),
    path('profile/me/', UserProfileView.as_view(), name='profile-me'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('profile/sessions/', UserSessionListView.as_view(), name='profile-sessions'),
    path('profile/sessions/revoke-all/', UserSessionRevokeView.as_view(), name='profile-sessions-revoke-all'),
    path('profile/sessions/<uuid:session_id>/revoke/', UserSessionRevokeView.as_view(), name='profile-sessions-revoke'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/meta/', AdminUserMetaView.as_view(), name='admin-user-meta'),
    path('admin/users/create/', AdminCreateUserView.as_view(), name='admin-user-create'),
    path('admin/users/<int:user_id>/reset-password/', AdminResetUserPasswordView.as_view(), name='admin-user-reset-password'),
    path('admin/users/<int:user_id>/delete/', AdminDeleteUserAccountView.as_view(), name='admin-user-delete'),
    path('admin/users/<int:user_id>/disable/', AdminDisableUserAccountView.as_view(), name='admin-user-disable'),
    path('admin/users/<int:user_id>/enable/', AdminEnableUserAccountView.as_view(), name='admin-user-enable'),
    path('qa-coordinator/my-staff/', CoordinatorDepartmentStaffListView.as_view(), name='qa-coordinator-my-staff'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
    path('categories/update/<int:category_id>/', UpdateCategoryView.as_view(), name='update_category'),
    path('categories/delete/<int:category_id>/', DeleteCategoryView.as_view(), name='delete_category'),
    path('notifications/', ListNotificationsView.as_view(), name='list-notifications'),
    path('notifications/<int:notification_id>/read/', MarkNotificationReadView.as_view(), name='mark-notification-read'),
    path('notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='mark-all-notifications-read'),
    path('analytics/', include('api.analytics.urls')),
    path('closure-period/', include('api.closure_period.urls')),
    path('ideas/', include('api.IdeaPost.urls')),
    path('interaction/', include('api.interaction.urls')),
]




