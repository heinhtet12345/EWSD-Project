from django.urls import path
from .views import (
    AddClosurePeriodView,
    ViewClosurePeriodView,
    UpdateClosurePeriodView,
)

urlpatterns = [
    # Create
    path('create/', AddClosurePeriodView.as_view(), name="create-closure-period"),

    # List (View all)
    path('list/', ViewClosurePeriodView.as_view(), name="list-closure-periods"),
    path('<int:closure_period_id>/update/', UpdateClosurePeriodView.as_view(), name="update-closure-period"),

]
