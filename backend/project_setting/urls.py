"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView

# direct view import for root change password endpoint
from password_reset.views import ChangePasswordAPIView

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('closure-period/', include('closure_period.urls')),
    path('password-reset/', include('password_reset.urls')),
    path('download-documents/', include('download_doc.urls')),
    path('download-post/', include('download_post.urls')),
    # expose the change-password endpoint at the root as well (avoids redirect on POST)
    path('change_password/', ChangePasswordAPIView.as_view(), name='change_password_root'),
    path('api/closure-period/', include('api.closure_period.urls')),
    path('api/ideas/', include('api.IdeaPost.urls')),

    # API Documentation
    path('api/docs/', RedirectView.as_view(url='/api/docs/swagger/', permanent=False)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
 
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


