from django.urls import path
from .views.categories_views import AddCategoryView
from .views.categories_views import ViewCategoryView 

urlpatterns = [
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
]
