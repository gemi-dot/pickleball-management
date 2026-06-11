"""
URL configuration for config project.

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
from django.urls import include, path
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter

from bookings.views import BookingViewSet, PaymentViewSet
from courts.views import CourtViewSet
from members.views import MemberViewSet
from dashboard.views import (
    dashboard_metrics,
    court_occupancy,
    booking_heatmap,
    operational_alerts,
    revenue_report,
)

router = DefaultRouter()
router.register(r'courts', CourtViewSet, basename='court')
router.register(r'members', MemberViewSet, basename='member')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', RedirectView.as_view(url='api/', permanent=False), name='root'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/dashboard/metrics/', dashboard_metrics, name='dashboard-metrics'),
    path('api/dashboard/occupancy/', court_occupancy, name='court-occupancy'),
    path('api/dashboard/heatmap/', booking_heatmap, name='dashboard-heatmap'),
    path('api/dashboard/alerts/', operational_alerts, name='dashboard-alerts'),
    path('api/dashboard/revenue/', revenue_report, name='dashboard-revenue'),
]
