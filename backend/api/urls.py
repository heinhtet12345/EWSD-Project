from django.urls import path
from .views.auth_views import LoginView
from .views.categories_views import AddCategoryView
from .views.categories_views import ViewCategoryView 

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
]




