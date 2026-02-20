from django.urls import path
from .views import LoginView
from .views import AddCategoryView
from .views import ViewCategoryView 

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    
]
