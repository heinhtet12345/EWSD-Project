from django.urls import path, include
from .views.categories_views import AddCategoryView
from .views.categories_views import ViewCategoryView , DeleteCategoryView
from .views.auth_views import LoginView 
from .views.profile_views import UserProfileView, ChangePasswordView
from .views.notifications_views import (
    ListNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)
from .views.admin_views import (
    ForgotPasswordRequestView,
    AdminUserListView,
    AdminResetUserPasswordView,
)


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('password-reset/request/', ForgotPasswordRequestView.as_view(), name='password-reset-request'),
    path('profile/me/', UserProfileView.as_view(), name='profile-me'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:user_id>/reset-password/', AdminResetUserPasswordView.as_view(), name='admin-user-reset-password'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
    path('categories/delete/<int:category_id>/', DeleteCategoryView.as_view(), name='delete_category'),
    path('notifications/', ListNotificationsView.as_view(), name='list-notifications'),
    path('notifications/<int:notification_id>/read/', MarkNotificationReadView.as_view(), name='mark-notification-read'),
    path('notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='mark-all-notifications-read'),
    path('closure-period/', include('api.closure_period.urls')),
    path('ideas/', include('api.IdeaPost.urls')),
]




