from django.urls import path
from .views import LoginView
from .views import AddCategoryView
from .views import ViewCategoryView 

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
]


