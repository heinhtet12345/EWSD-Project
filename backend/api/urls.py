from django.urls import path
from .views.auth_views import LoginView
from .views.category_views import AddCategoryView
from .views.category_views import ViewCategoryView 

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
]


