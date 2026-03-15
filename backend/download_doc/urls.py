from django.urls import path
from .views import download_idea_documents_zip

urlpatterns = [
    path('download_idea_documents/<int:idea_id>/', download_idea_documents_zip),
]