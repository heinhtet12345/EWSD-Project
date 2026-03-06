from django.urls import path, include
from .views.categories_views import AddCategoryView
from .views.categories_views import ViewCategoryView , DeleteCategoryView
from .views.auth_views import LoginView 


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('categories/add/', AddCategoryView.as_view(), name='add-category'),
    path('categories/view/', ViewCategoryView.as_view(), name='view-categories'),
    path('categories/delete/<int:category_id>/', DeleteCategoryView.as_view(), name='delete_category'),
    path('closure-period/', include('api.closure_period.urls')),
    path('ideas/', include('api.ideas.urls')),
]




