from django.urls import path
from .views import (
    AddClosurePeriodView,
    ViewClosurePeriodView,
)

urlpatterns = [
    # Create
    path('create/', AddClosurePeriodView.as_view(), name="create-closure-period"),

    # List (View all)
    path('list/', ViewClosurePeriodView.as_view(), name="list-closure-periods"),

]