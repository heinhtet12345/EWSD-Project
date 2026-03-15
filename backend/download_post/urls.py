from django.urls import path
from .views import download_idea_csv

urlpatterns = [
    path('download_idea_csv/<int:idea_id>/', download_idea_csv),
]